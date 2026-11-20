import { Injectable, HttpStatus, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { ConversionService } from "../conversion/conversion.service.js";
import { TokenService } from "../token/token.service.js";
import {
  calcQuote,
  ErrorCode,
  JobStatus,
  QuoteRequestDto,
  CreateJobDto,
  ShopRates,
} from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";
import { customAlphabet } from "nanoid";

// 24-character nanoid per PRD Section 12
const nanoid24 = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  24,
);

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("STORAGE_SERVICE")
    private readonly storage: StorageService,
    private readonly conversion: ConversionService,
    private readonly tokenService: TokenService,
  ) {}

  async getShopBySlug(slug: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        nameUrdu: true,
        isOpen: true,
        rateBwSingle: true,
        rateBwDouble: true,
        rateColorSingle: true,
        rateColorDouble: true,
        maxFileMb: true,
        maxPages: true,
      },
    });

    if (!shop) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Shop not found",
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      name: shop.name,
      nameUrdu: shop.nameUrdu,
      isOpen: shop.isOpen,
      rates: {
        rateBwSingle: Number(shop.rateBwSingle),
        rateBwDouble: Number(shop.rateBwDouble),
        rateColorSingle: Number(shop.rateColorSingle),
        rateColorDouble: Number(shop.rateColorDouble),
      },
      maxFileMb: shop.maxFileMb,
      maxPages: shop.maxPages,
      acceptedTypes: [
        "PDF",
        "DOC",
        "DOCX",
        "XLS",
        "XLSX",
        "PPT",
        "PPTX",
        "JPG",
        "PNG",
      ],
    };
  }

  async handleUpload(slug: string, file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, "File is required");
    }

    const shop = await this.prisma.shop.findUnique({
      where: { slug },
    });

    if (!shop) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Shop not found",
        HttpStatus.NOT_FOUND,
      );
    }

    if (!shop.isOpen) {
      throw new AppException(
        ErrorCode.SHOP_CLOSED,
        "Shop is currently closed for uploads",
      );
    }

    const rules = {
      maxFileMb: shop.maxFileMb,
      maxPages: shop.maxPages,
    };

    // Process and convert to PDF
    const { pdfBuffer, pageCount } = await this.conversion.processToPdf(
      file.buffer,
      file.originalname,
      file.mimetype,
      rules,
    );

    // Save to disk storage
    const { fileKey, sizeBytes } = await this.storage.save(pdfBuffer, ".pdf");

    // Create Upload record
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours upload session
    const upload = await this.prisma.upload.create({
      data: {
        shopId: shop.id,
        fileKey,
        originalName: file.originalname.slice(0, 255),
        originalMime: file.mimetype,
        sizeBytes,
        pageCount,
        expiresAt,
      },
    });

    return {
      uploadId: upload.id,
      fileName: upload.originalName,
      pageCount: upload.pageCount,
      sizeBytes: upload.sizeBytes,
    };
  }

  async calculateQuote(dto: QuoteRequestDto) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: dto.uploadId },
    });

    if (!upload) {
      throw new AppException(
        ErrorCode.UPLOAD_EXPIRED,
        "Upload not found or expired",
        HttpStatus.NOT_FOUND,
      );
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: upload.shopId },
    });

    if (!shop) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Shop not found",
        HttpStatus.NOT_FOUND,
      );
    }

    const rates: ShopRates = {
      rateBwSingle: Number(shop.rateBwSingle),
      rateBwDouble: Number(shop.rateBwDouble),
      rateColorSingle: Number(shop.rateColorSingle),
      rateColorDouble: Number(shop.rateColorDouble),
    };

    const quote = calcQuote({
      totalPages: upload.pageCount,
      copies: dto.copies,
      colorMode: dto.colorMode,
      sides: dto.sides,
      pageRange: dto.pageRange,
      rates,
    });

    return {
      pagesPerCopy: quote.pagesPerCopy,
      printedPages: quote.printedPages,
      unitRate: quote.unitRate,
      total: quote.calculatedAmount,
    };
  }

  async createJob(dto: CreateJobDto) {
    const upload = await this.prisma.upload.findUnique({
      where: { id: dto.uploadId },
      include: { job: true },
    });

    if (!upload) {
      throw new AppException(
        ErrorCode.UPLOAD_EXPIRED,
        "Upload not found or expired",
        HttpStatus.NOT_FOUND,
      );
    }

    if (upload.job) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        "A job has already been created for this upload",
      );
    }

    const shop = await this.prisma.shop.findUnique({
      where: { id: upload.shopId },
    });

    if (!shop) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Shop not found",
        HttpStatus.NOT_FOUND,
      );
    }

    if (!shop.isOpen) {
      throw new AppException(ErrorCode.SHOP_CLOSED, "Shop is currently closed");
    }

    const rates: ShopRates = {
      rateBwSingle: Number(shop.rateBwSingle),
      rateBwDouble: Number(shop.rateBwDouble),
      rateColorSingle: Number(shop.rateColorSingle),
      rateColorDouble: Number(shop.rateColorDouble),
    };

    const quote = calcQuote({
      totalPages: upload.pageCount,
      copies: dto.copies,
      colorMode: dto.colorMode,
      sides: dto.sides,
      pageRange: dto.pageRange,
      rates,
    });

    const publicToken = nanoid24();

    // Retry token allocation on collision
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const { tokenDate, tokenSeq, tokenLabel } =
          await this.tokenService.getNextToken(upload.shopId);

        const job = await this.prisma.$transaction(async (tx) => {
          const newJob = await tx.printJob.create({
            data: {
              shopId: upload.shopId,
              tokenDate,
              tokenSeq,
              tokenLabel,
              publicToken,
              status: JobStatus.PENDING_APPROVAL,
              customerName: dto.customerName,
              customerPhone: dto.customerPhone || null,
              uploadId: upload.id,
              copies: dto.copies,
              colorMode: dto.colorMode,
              sides: dto.sides,
              paperSize: dto.paperSize,
              pageRange: dto.pageRange || null,
              pagesPerCopy: quote.pagesPerCopy,
              printedPages: quote.printedPages,
              unitRate: quote.unitRate,
              calculatedAmount: quote.calculatedAmount,
              finalAmount: quote.calculatedAmount,
            },
          });

          await tx.jobEvent.create({
            data: {
              jobId: newJob.id,
              type: "CREATED",
              toStatus: JobStatus.PENDING_APPROVAL,
              message: "Job submitted by customer",
            },
          });

          return newJob;
        });

        return {
          publicToken: job.publicToken,
          tokenLabel: job.tokenLabel,
          status: job.status,
          total: job.finalAmount,
        };
      } catch (err: any) {
        // Prisma unique constraint violation code is P2002
        if (err.code === "P2002" && attempts < maxAttempts) {
          continue;
        }
        throw err;
      }
    }

    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      "Failed to assign unique token sequence, please retry",
    );
  }

  async getJobByPublicToken(publicToken: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { publicToken },
      include: {
        shop: {
          select: { name: true },
        },
      },
    });

    if (!job) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Print job not found",
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      tokenLabel: job.tokenLabel,
      status: job.status,
      total: job.finalAmount,
      paymentStatus: job.paymentStatus,
      rejectReason: job.rejectReason || undefined,
      shopName: job.shop.name,
      createdAt: job.createdAt,
    };
  }

  async cancelJobByPublicToken(publicToken: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { publicToken },
    });

    if (!job) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Print job not found",
        HttpStatus.NOT_FOUND,
      );
    }

    if (job.status !== JobStatus.PENDING_APPROVAL) {
      throw new AppException(
        ErrorCode.INVALID_STATE_TRANSITION,
        `Cannot cancel job in ${job.status} state. Only pending jobs can be cancelled.`,
        HttpStatus.CONFLICT,
      );
    }

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: job.id },
        data: { status: JobStatus.CANCELLED },
      });

      await tx.jobEvent.create({
        data: {
          jobId: j.id,
          type: "CANCELLED",
          fromStatus: JobStatus.PENDING_APPROVAL,
          toStatus: JobStatus.CANCELLED,
          message: "Cancelled by customer",
        },
      });

      return j;
    });

    return {
      publicToken: updatedJob.publicToken,
      tokenLabel: updatedJob.tokenLabel,
      status: updatedJob.status,
      total: updatedJob.finalAmount,
    };
  }
}
