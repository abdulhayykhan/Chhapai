import { describe, it, expect, beforeEach, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { PublicService } from "../src/public/public.service.js";
import {
  ColorMode,
  PaperSize,
  Sides,
  JobStatus,
  ErrorCode,
} from "@chhapai/shared";
import { AppException } from "../src/common/exceptions/app.exception.js";

describe("PublicService & Job Lifecycle (M2 Acceptance)", () => {
  let publicService: PublicService;
  let mockPrisma: any;
  let mockStorage: any;
  let mockConversion: any;
  let mockTokenService: any;

  const mockShop = {
    id: "shop-1",
    slug: "main-branch",
    name: "Chhapai Main",
    nameUrdu: "چھپائی",
    isOpen: true,
    rateBwSingle: 5.0,
    rateBwDouble: 4.0,
    rateColorSingle: 30.0,
    rateColorDouble: 25.0,
    maxFileMb: 25,
    maxPages: 200,
  };

  let mockUploads: Record<string, any> = {};
  let mockJobs: Record<string, any> = {};

  beforeEach(() => {
    mockUploads = {};
    mockJobs = {};

    mockPrisma = {
      shop: {
        findUnique: ({ where: { slug, id } }: any) => {
          if (slug === "main-branch" || id === "shop-1") {
            return Promise.resolve(mockShop);
          }
          if (slug === "closed-shop") {
            return Promise.resolve({
              ...mockShop,
              slug: "closed-shop",
              isOpen: false,
            });
          }
          return Promise.resolve(null);
        },
      },
      upload: {
        create: ({ data }: any) => {
          const upload = { id: `upload-${Date.now()}`, ...data };
          mockUploads[upload.id] = upload;
          return Promise.resolve(upload);
        },
        findUnique: ({ where: { id } }: any) => {
          const upload = mockUploads[id];
          if (!upload) return Promise.resolve(null);
          return Promise.resolve({
            ...upload,
            job: mockJobs[upload.id] || null,
          });
        },
      },
      printJob: {
        findUnique: ({ where: { publicToken } }: any) => {
          const job = Object.values(mockJobs).find(
            (j: any) => j.publicToken === publicToken,
          );
          if (!job) return Promise.resolve(null);
          return Promise.resolve({
            ...job,
            shop: mockShop,
          });
        },
      },
      $transaction: async (fn: any) => {
        const tx = {
          printJob: {
            create: ({ data }: any) => {
              const job = { id: `job-${Date.now()}`, ...data };
              mockJobs[data.uploadId] = job;
              return Promise.resolve(job);
            },
            update: ({ where: { id }, data }: any) => {
              const job = Object.values(mockJobs).find(
                (j: any) => j.id === id,
              ) as any;
              if (job) Object.assign(job, data);
              return Promise.resolve(job);
            },
          },
          jobEvent: {
            create: () => Promise.resolve({ id: "evt-1" }),
          },
        };
        return fn(tx);
      },
    };

    mockStorage = {
      save: vi
        .fn()
        .mockResolvedValue({ fileKey: "stored-file-key.pdf", sizeBytes: 1024 }),
    };

    mockConversion = {
      processToPdf: vi.fn().mockImplementation(async (buffer, originalName) => {
        if (originalName.endsWith(".pdf")) {
          return { pdfBuffer: buffer, pageCount: 5 };
        }
        if (originalName.endsWith(".jpg")) {
          return { pdfBuffer: Buffer.from("%PDF-1.4 image pdf"), pageCount: 1 };
        }
        if (originalName.endsWith(".docx")) {
          return {
            pdfBuffer: Buffer.from("%PDF-1.4 docx converted pdf"),
            pageCount: 3,
          };
        }
        throw new AppException(
          ErrorCode.UNSUPPORTED_FILE_TYPE,
          "Unsupported file",
        );
      }),
    };

    mockTokenService = {
      getNextToken: vi.fn().mockResolvedValue({
        tokenDate: new Date("2026-11-20T00:00:00Z"),
        tokenSeq: 1,
        tokenLabel: "#001",
      }),
    };

    publicService = new PublicService(
      mockPrisma,
      mockStorage,
      mockConversion,
      mockTokenService,
    );
  });

  it("rejects uploads if shop is closed with SHOP_CLOSED", async () => {
    const fakeFile = {
      buffer: Buffer.from("dummy"),
      originalname: "test.pdf",
      mimetype: "application/pdf",
    } as any;

    await expect(
      publicService.handleUpload("closed-shop", fakeFile),
    ).rejects.toThrow(AppException);

    try {
      await publicService.handleUpload("closed-shop", fakeFile);
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.SHOP_CLOSED);
    }
  });

  it("M2 ACCEPTANCE: A PDF becomes a PENDING_APPROVAL job through the API", async () => {
    // 1. Upload PDF
    const pdfFile = {
      buffer: Buffer.from("%PDF-1.4 5 pages"),
      originalname: "document.pdf",
      mimetype: "application/pdf",
    } as any;

    const upload = await publicService.handleUpload("main-branch", pdfFile);
    expect(upload.uploadId).toBeDefined();
    expect(upload.pageCount).toBe(5);

    // 2. Get Quote
    const quote = await publicService.calculateQuote({
      uploadId: upload.uploadId,
      copies: 2,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
      paperSize: PaperSize.A4,
    });
    // 5 pages * 2 copies = 10 pages * 5 PKR = 50 PKR
    expect(quote.pagesPerCopy).toBe(5);
    expect(quote.printedPages).toBe(10);
    expect(quote.unitRate).toBe(5);
    expect(quote.total).toBe(50);

    // 3. Submit Job
    const job = await publicService.createJob({
      uploadId: upload.uploadId,
      customerName: "Ahmad Khan",
      customerPhone: "03001234567",
      copies: 2,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
      paperSize: PaperSize.A4,
    });

    expect(job.status).toBe(JobStatus.PENDING_APPROVAL);
    expect(job.tokenLabel).toBe("#001");
    expect(job.total).toBe(50);
    expect(job.publicToken.length).toBe(24);

    // 4. Check Public Status
    const status = await publicService.getJobByPublicToken(job.publicToken);
    expect(status.status).toBe(JobStatus.PENDING_APPROVAL);
    expect(status.tokenLabel).toBe("#001");
  });

  it("M2 ACCEPTANCE: A JPG becomes a PENDING_APPROVAL job through the API", async () => {
    // 1. Upload JPG
    const jpgFile = {
      buffer: Buffer.from([0xff, 0xd8, 0xff]),
      originalname: "receipt.jpg",
      mimetype: "image/jpeg",
    } as any;

    const upload = await publicService.handleUpload("main-branch", jpgFile);
    expect(upload.pageCount).toBe(1);

    // 2. Submit Job (Color Double)
    const job = await publicService.createJob({
      uploadId: upload.uploadId,
      customerName: "Fatima Ali",
      copies: 1,
      colorMode: ColorMode.COLOR,
      sides: Sides.DOUBLE,
      paperSize: PaperSize.A4,
    });

    expect(job.status).toBe(JobStatus.PENDING_APPROVAL);
    expect(job.total).toBe(25); // 1 page * 25 PKR = 25 PKR
  });

  it("M2 ACCEPTANCE: A DOCX becomes a PENDING_APPROVAL job through the API", async () => {
    // 1. Upload DOCX
    const docxFile = {
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      originalname: "resume.docx",
      mimetype:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    } as any;

    const upload = await publicService.handleUpload("main-branch", docxFile);
    expect(upload.pageCount).toBe(3);

    // 2. Submit Job
    const job = await publicService.createJob({
      uploadId: upload.uploadId,
      customerName: "Usman Tariq",
      copies: 3,
      colorMode: ColorMode.BW,
      sides: Sides.DOUBLE,
      paperSize: PaperSize.A4,
    });

    expect(job.status).toBe(JobStatus.PENDING_APPROVAL);
    // 3 pages * 3 copies = 9 pages * 4 PKR = 36 PKR
    expect(job.total).toBe(36);
  });

  it("allows customer to cancel a pending job", async () => {
    const pdfFile = {
      buffer: Buffer.from("%PDF-1.4 test"),
      originalname: "cancel-test.pdf",
      mimetype: "application/pdf",
    } as any;

    const upload = await publicService.handleUpload("main-branch", pdfFile);
    const job = await publicService.createJob({
      uploadId: upload.uploadId,
      customerName: "Bilal",
      copies: 1,
      colorMode: ColorMode.BW,
      sides: Sides.SINGLE,
      paperSize: PaperSize.A4,
    });

    const cancelled = await publicService.cancelJobByPublicToken(
      job.publicToken,
    );
    expect(cancelled.status).toBe(JobStatus.CANCELLED);
  });
});
