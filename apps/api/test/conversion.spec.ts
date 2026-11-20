import { describe, it, expect, beforeEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { ConversionService } from "../src/conversion/conversion.service.js";
import { ErrorCode } from "@chhapai/shared";
import { AppException } from "../src/common/exceptions/app.exception.js";

describe("ConversionService (M2 Acceptance)", () => {
  let conversionService: ConversionService;

  beforeEach(() => {
    conversionService = new ConversionService();
  });

  it("validates and extracts pages from a real valid PDF", async () => {
    // Generate real 3-page PDF in memory
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    doc.addPage([595, 842]);
    doc.addPage([595, 842]);
    const pdfBytes = await doc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    const result = await conversionService.processToPdf(
      pdfBuffer,
      "test.pdf",
      "application/pdf",
      {
        maxFileMb: 25,
        maxPages: 10,
      },
    );

    expect(result.pageCount).toBe(3);
    expect(result.pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("converts a JPG image to a valid A4 PDF", async () => {
    // Generate real 100x100 red JPG in memory
    const jpgBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await conversionService.processToPdf(
      jpgBuffer,
      "photo.jpg",
      "image/jpeg",
      {
        maxFileMb: 25,
        maxPages: 10,
      },
    );

    expect(result.pageCount).toBe(1);
    expect(result.pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");

    // Verify it is a valid PDF readable by PDFDocument
    const loadedPdf = await PDFDocument.load(result.pdfBuffer);
    expect(loadedPdf.getPageCount()).toBe(1);
    const page = loadedPdf.getPage(0);
    // A4 width and height
    expect(page.getWidth()).toBeCloseTo(595.28, 1);
    expect(page.getHeight()).toBeCloseTo(841.89, 1);
  });

  it("converts a PNG image to a valid A4 PDF", async () => {
    const pngBuffer = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 4,
        background: { r: 0, g: 128, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await conversionService.processToPdf(
      pngBuffer,
      "graphic.png",
      "image/png",
      {
        maxFileMb: 25,
        maxPages: 10,
      },
    );

    expect(result.pageCount).toBe(1);
    expect(result.pdfBuffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("rejects files exceeding maxFileMb with FILE_TOO_LARGE", async () => {
    const fakeLargeBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB

    expect(() =>
      conversionService.validateFile(
        fakeLargeBuffer,
        "big.pdf",
        "application/pdf",
        {
          maxFileMb: 2, // limit 2MB
          maxPages: 10,
        },
      ),
    ).toThrowError(AppException);

    try {
      conversionService.validateFile(
        fakeLargeBuffer,
        "big.pdf",
        "application/pdf",
        {
          maxFileMb: 2,
          maxPages: 10,
        },
      );
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.FILE_TOO_LARGE);
    }
  });

  it("rejects files with invalid signatures with UNSUPPORTED_FILE_TYPE", () => {
    const fakeBuffer = Buffer.from("this is not a valid pdf or image");

    expect(() =>
      conversionService.validateFile(
        fakeBuffer,
        "fake.pdf",
        "application/pdf",
        {
          maxFileMb: 25,
          maxPages: 10,
        },
      ),
    ).toThrowError(AppException);

    try {
      conversionService.validateFile(
        fakeBuffer,
        "fake.pdf",
        "application/pdf",
        {
          maxFileMb: 25,
          maxPages: 10,
        },
      );
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.UNSUPPORTED_FILE_TYPE);
    }
  });

  it("rejects PDF exceeding maxPages limit with TOO_MANY_PAGES", async () => {
    const doc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) {
      doc.addPage([595, 842]);
    }
    const pdfBytes = await doc.save();

    await expect(
      conversionService.validatePdf(Buffer.from(pdfBytes), 3), // limit 3 pages
    ).rejects.toThrowError(AppException);

    try {
      await conversionService.validatePdf(Buffer.from(pdfBytes), 3);
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.TOO_MANY_PAGES);
    }
  });
});
