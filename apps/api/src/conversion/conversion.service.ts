import { Injectable, Logger } from "@nestjs/common";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { spawn } from "child_process";
import { ErrorCode } from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";

export interface ProcessedDocument {
  pdfBuffer: Buffer;
  pageCount: number;
}

export interface ValidationRules {
  maxFileMb: number;
  maxPages: number;
}

@Injectable()
export class ConversionService {
  private readonly logger = new Logger(ConversionService.name);
  private conversionQueue = Promise.resolve<any>(undefined);

  // A4 dimensions in points: 210mm x 297mm @ 72 dpi
  private readonly A4_WIDTH = 595.28;
  private readonly A4_HEIGHT = 841.89;
  private readonly PAGE_MARGIN = 20;

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = () => task();
    const result = this.conversionQueue.then(run, run);
    this.conversionQueue = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  /**
   * Validate file buffer and magic bytes.
   */
  validateFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    rules: ValidationRules,
  ): { detectedType: "pdf" | "image" | "office"; extension: string } {
    const sizeMb = fileBuffer.length / (1024 * 1024);
    if (sizeMb > rules.maxFileMb) {
      throw new AppException(
        ErrorCode.FILE_TOO_LARGE,
        `File size (${sizeMb.toFixed(1)} MB) exceeds limit of ${rules.maxFileMb} MB`,
      );
    }

    const ext = path.extname(originalName).toLowerCase();

    // 1. Check PDF
    if (ext === ".pdf") {
      const isPdf = fileBuffer.subarray(0, 5).toString("ascii") === "%PDF-";
      if (!isPdf) {
        throw new AppException(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          "Invalid PDF file signature",
        );
      }
      return { detectedType: "pdf", extension: ".pdf" };
    }

    // 2. Check Images
    if ([".jpg", ".jpeg", ".png"].includes(ext)) {
      const isJpg =
        fileBuffer[0] === 0xff &&
        fileBuffer[1] === 0xd8 &&
        fileBuffer[2] === 0xff;
      const isPng =
        fileBuffer[0] === 0x89 &&
        fileBuffer[1] === 0x50 &&
        fileBuffer[2] === 0x4e &&
        fileBuffer[3] === 0x47;

      if (!isJpg && !isPng) {
        throw new AppException(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          "Invalid image signature",
        );
      }
      return { detectedType: "image", extension: ext };
    }

    // 3. Check Office Files
    if ([".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext)) {
      const isZip =
        fileBuffer[0] === 0x50 &&
        fileBuffer[1] === 0x4b &&
        (fileBuffer[2] === 0x03 ||
          fileBuffer[2] === 0x05 ||
          fileBuffer[2] === 0x07);
      const isCfb =
        fileBuffer[0] === 0xd0 &&
        fileBuffer[1] === 0xcf &&
        fileBuffer[2] === 0x11 &&
        fileBuffer[3] === 0xe0;

      if (!isZip && !isCfb) {
        throw new AppException(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          "Invalid Office document signature",
        );
      }
      return { detectedType: "office", extension: ext };
    }

    throw new AppException(
      ErrorCode.UNSUPPORTED_FILE_TYPE,
      `Unsupported file extension: ${ext}. Supported: PDF, DOCX, XLSX, PPTX, JPG, PNG`,
    );
  }

  /**
   * Processes uploaded file and converts to validated PDF with page count.
   */
  async processToPdf(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    rules: ValidationRules,
  ): Promise<ProcessedDocument> {
    const { detectedType, extension } = this.validateFile(
      fileBuffer,
      originalName,
      mimeType,
      rules,
    );

    let pdfBuffer: Buffer;

    if (detectedType === "pdf") {
      pdfBuffer = fileBuffer;
    } else if (detectedType === "image") {
      pdfBuffer = await this.convertImageToPdf(fileBuffer);
    } else {
      pdfBuffer = await this.enqueue(() =>
        this.convertOfficeToPdf(fileBuffer, extension),
      );
    }

    // Validate generated/uploaded PDF and verify page count & encryption
    const pageCount = await this.validatePdf(pdfBuffer, rules.maxPages);

    return {
      pdfBuffer,
      pageCount,
    };
  }

  /**
   * Validates that PDF is not encrypted and count pages.
   */
  async validatePdf(pdfBuffer: Buffer, maxPages: number): Promise<number> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true,
      });

      if (pdfDoc.isEncrypted) {
        throw new AppException(
          ErrorCode.PDF_PROTECTED,
          "Password-protected PDFs are not supported",
        );
      }

      const pageCount = pdfDoc.getPageCount();

      if (pageCount < 1) {
        throw new AppException(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          "PDF contains no pages",
        );
      }

      if (pageCount > maxPages) {
        throw new AppException(
          ErrorCode.TOO_MANY_PAGES,
          `PDF has ${pageCount} pages, which exceeds the shop limit of ${maxPages} pages`,
        );
      }

      return pageCount;
    } catch (err) {
      if (err instanceof AppException) {
        throw err;
      }
      this.logger.error("Failed to parse PDF", err);
      throw new AppException(
        ErrorCode.UNSUPPORTED_FILE_TYPE,
        "Failed to parse or validate PDF",
      );
    }
  }

  /**
   * Converts an image to A4 PDF using Sharp + PDF-Lib.
   */
  async convertImageToPdf(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Auto-orient according to EXIF and convert to JPEG buffer
      const processedImage = await sharp(imageBuffer)
        .rotate()
        .jpeg({ quality: 92 })
        .toBuffer();

      const imageMetadata = await sharp(processedImage).metadata();
      const imgWidth = imageMetadata.width || 800;
      const imgHeight = imageMetadata.height || 600;

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([this.A4_WIDTH, this.A4_HEIGHT]);
      const embeddedJpg = await pdfDoc.embedJpg(processedImage);

      // Scale to fit inside margins
      const maxWidth = this.A4_WIDTH - this.PAGE_MARGIN * 2;
      const maxHeight = this.A4_HEIGHT - this.PAGE_MARGIN * 2;
      const scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight, 1);

      const drawWidth = imgWidth * scale;
      const drawHeight = imgHeight * scale;

      // Center on page
      const x = (this.A4_WIDTH - drawWidth) / 2;
      const y = (this.A4_HEIGHT - drawHeight) / 2;

      page.drawImage(embeddedJpg, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (err) {
      this.logger.error("Error converting image to PDF", err);
      throw new AppException(
        ErrorCode.CONVERSION_FAILED,
        "Failed to convert image to PDF",
      );
    }
  }

  /**
   * Converts Office documents (DOCX, PPTX, XLSX) using headless LibreOffice with a 60s timeout.
   */
  async convertOfficeToPdf(
    officeBuffer: Buffer,
    extension: string,
  ): Promise<Buffer> {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "chhapai-conv-"));
    const inputPath = path.join(tmpDir, `input${extension}`);
    const expectedPdfPath = path.join(tmpDir, "input.pdf");

    try {
      await fs.writeFile(inputPath, officeBuffer);

      // Attempt conversion using soffice
      await this.runLibreOffice(inputPath, tmpDir);

      const pdfBytes = await fs.readFile(expectedPdfPath);
      return pdfBytes;
    } catch (err: any) {
      this.logger.error("LibreOffice conversion failed", err);
      throw new AppException(
        ErrorCode.CONVERSION_FAILED,
        `Document conversion failed: ${err.message || "Unknown error"}`,
      );
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private runLibreOffice(inputPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Find candidate binary paths for soffice
      const candidatePaths = [
        "soffice",
        "libreoffice",
        "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
        "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
      ];

      const command = candidatePaths[0];
      const args = [
        "--headless",
        "--invisible",
        "--nodefault",
        "--nofirststartwizard",
        "--nolockcheck",
        "--nologo",
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        inputPath,
      ];

      const proc = spawn(command, args, {
        timeout: 60000,
        windowsHide: true,
      });

      let stderr = "";

      proc.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("error", (err) => {
        // Fallback: check if WSL has libreoffice available if on Windows
        this.runLibreOfficeWsl(inputPath, outputDir)
          .then(resolve)
          .catch(() =>
            reject(
              new Error(
                `LibreOffice command not found or failed: ${err.message}`,
              ),
            ),
          );
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          // Try WSL fallback before failing
          this.runLibreOfficeWsl(inputPath, outputDir)
            .then(resolve)
            .catch(() =>
              reject(
                new Error(`LibreOffice exited with code ${code}: ${stderr}`),
              ),
            );
        }
      });
    });
  }

  private runLibreOfficeWsl(
    inputPath: string,
    outputDir: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Convert Windows paths to WSL paths: C:\foo -> /mnt/c/foo
      const toWslPath = (p: string) =>
        p
          .replace(
            /^([a-zA-Z]):\\/,
            (_, drive) => `/mnt/${drive.toLowerCase()}/`,
          )
          .replace(/\\/g, "/");

      const wslInput = toWslPath(inputPath);
      const wslOutput = toWslPath(outputDir);

      const wslProc = spawn("wsl", [
        "-d",
        "Ubuntu",
        "soffice",
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        wslOutput,
        wslInput,
      ]);

      wslProc.on("error", (err) => reject(err));
      wslProc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`WSL LibreOffice exited with code ${code}`));
      });
    });
  }
}
