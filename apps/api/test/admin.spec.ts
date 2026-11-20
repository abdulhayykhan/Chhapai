import { describe, it, expect, beforeEach, vi } from "vitest";
import { AdminService } from "../src/admin/admin.service.js";
import { CronService } from "../src/cron/cron.service.js";
import { JobStatus, PaymentStatus, ErrorCode } from "@chhapai/shared";
import { AppException } from "../src/common/exceptions/app.exception.js";

describe("AdminService & State Machine Actions (M3 Acceptance)", () => {
  let adminService: AdminService;
  let mockPrisma: any;
  let mockStorage: any;
  let mockGateway: any;
  let mockConfig: any;

  let currentJob: any;

  beforeEach(() => {
    currentJob = {
      id: "job-1",
      shopId: "shop-1",
      tokenLabel: "#001",
      status: JobStatus.PENDING_APPROVAL,
      copies: 2,
      pagesPerCopy: 5,
      printedPages: 10,
      colorMode: "BW",
      sides: "SINGLE",
      unitRate: 5,
      calculatedAmount: 50,
      finalAmount: 50,
      paymentStatus: PaymentStatus.UNPAID,
      createdAt: new Date(),
      upload: {
        fileKey: "key-1.pdf",
        originalName: "test.pdf",
        sizeBytes: 1024,
        pageCount: 5,
      },
      events: [],
    };

    mockStorage = {
      get: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 mock content")),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    mockGateway = {
      emitJobApproved: vi.fn(),
      emitJobUpdated: vi.fn(),
    };

    mockConfig = {
      get: vi.fn().mockReturnValue("http://localhost:3000"),
    };

    mockPrisma = {
      printJob: {
        findUnique: vi.fn().mockImplementation(({ where: { id } }: any) => {
          if (id === currentJob.id) return Promise.resolve(currentJob);
          return Promise.resolve(null);
        }),
        findUniqueOrThrow: vi
          .fn()
          .mockImplementation(({ where: { id } }: any) => {
            if (id === currentJob.id) return Promise.resolve(currentJob);
            throw new Error("Not found");
          }),
        findMany: vi.fn().mockResolvedValue([currentJob]),
        count: vi.fn().mockResolvedValue(1),
        // Simulate atomic updateMany row-level lock
        updateMany: vi
          .fn()
          .mockImplementation(({ where: { id, status }, data }: any) => {
            if (id === currentJob.id && currentJob.status === status) {
              Object.assign(currentJob, data);
              return Promise.resolve({ count: 1 });
            }
            return Promise.resolve({ count: 0 });
          }),
        update: vi.fn().mockImplementation(({ data }: any) => {
          Object.assign(currentJob, data);
          return Promise.resolve(currentJob);
        }),
      },
      shop: {
        findUnique: vi.fn().mockResolvedValue({
          id: "shop-1",
          slug: "main-branch",
          name: "Chhapai Main",
          pendingExpiryHours: 24,
          retentionMinutes: 60,
        }),
        update: vi
          .fn()
          .mockImplementation(({ data }: any) =>
            Promise.resolve({ id: "shop-1", ...data }),
          ),
      },
      jobEvent: {
        create: vi.fn().mockResolvedValue({ id: "evt-1" }),
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    adminService = new AdminService(
      mockPrisma,
      mockStorage,
      mockGateway,
      mockConfig,
    );
  });

  it("approves a pending job and updates pricing if provided", async () => {
    const approved = await adminService.approveJob(
      "shop-1",
      "job-1",
      "user-1",
      {
        finalAmount: 45, // discounted
        markPaid: true,
      },
    );

    expect(approved.status).toBe(JobStatus.APPROVED);
    expect(approved.finalAmount).toBe(45);
    expect(approved.paymentStatus).toBe(PaymentStatus.PAID);
    expect(mockGateway.emitJobApproved).toHaveBeenCalled();
  });

  it("rejects a pending job with reason", async () => {
    const rejected = await adminService.rejectJob(
      "shop-1",
      "job-1",
      "user-1",
      "Blurred scanned document",
    );
    expect(rejected.status).toBe(JobStatus.REJECTED);
    expect(rejected.rejectReason).toBe("Blurred scanned document");
    expect(mockGateway.emitJobUpdated).toHaveBeenCalled();
  });

  it("M3 ACCEPTANCE: Two parallel claims give one 200 and one 409", async () => {
    // 1. First move job to APPROVED
    currentJob.status = JobStatus.APPROVED;

    // 2. Fire two parallel claims simultaneously
    const claimPromise1 = adminService.claimJob("shop-1", "job-1", "worker-1");
    const claimPromise2 = adminService.claimJob("shop-1", "job-1", "worker-2");

    const [res1, res2] = await Promise.allSettled([
      claimPromise1,
      claimPromise2,
    ]);

    const successes = [res1, res2].filter((r) => r.status === "fulfilled");
    const failures = [res1, res2].filter((r) => r.status === "rejected");

    // Exactly one succeeds
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

    // Successful claim returns PRINTING status
    const claimedJob = (successes[0] as PromiseFulfilledResult<any>).value;
    expect(claimedJob.status).toBe(JobStatus.PRINTING);

    // Rejected claim throws 409 INVALID_STATE_TRANSITION
    const error = (failures[0] as PromiseRejectedResult).reason;
    expect(error).toBeInstanceOf(AppException);
    expect(error.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
    expect(error.getStatus()).toBe(409);
  });

  it("completes a printing job", async () => {
    currentJob.status = JobStatus.PRINTING;
    const completed = await adminService.completeJob(
      "shop-1",
      "job-1",
      "worker-1",
    );
    expect(completed.status).toBe(JobStatus.COMPLETED);
    expect(completed.completedAt).toBeDefined();
  });

  it("marks a printing job as failed and allows retry back to approved", async () => {
    currentJob.status = JobStatus.PRINTING;
    const failed = await adminService.failJob(
      "shop-1",
      "job-1",
      "worker-1",
      "Paper jam in tray 1",
    );
    expect(failed.status).toBe(JobStatus.FAILED);
    expect(failed.failReason).toBe("Paper jam in tray 1");

    // Operator retries
    const retried = await adminService.retryJob("shop-1", "job-1", "user-1");
    expect(retried.status).toBe(JobStatus.APPROVED);
    expect(retried.failReason).toBeNull();
  });

  it("blocks invalid transitions with 409", async () => {
    // Cannot complete a job that is still PENDING_APPROVAL
    await expect(
      adminService.completeJob("shop-1", "job-1", "worker-1"),
    ).rejects.toThrowError(AppException);

    try {
      await adminService.completeJob("shop-1", "job-1", "worker-1");
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
    }
  });

  it("generates QR code as PNG and SVG", async () => {
    const pngResult = await adminService.generateQr("shop-1", "png");
    expect(pngResult.contentType).toBe("image/png");
    expect(pngResult.content).toBeInstanceOf(Buffer);

    const svgResult = await adminService.generateQr("shop-1", "svg");
    expect(svgResult.contentType).toBe("image/svg+xml");
    expect(svgResult.content.toString("utf-8")).toContain("<svg");
  });

  it("computes daily report with status counts, pages and revenue", async () => {
    mockPrisma.printJob.findMany.mockResolvedValue([
      {
        status: JobStatus.COMPLETED,
        colorMode: "BW",
        printedPages: 10,
        finalAmount: 50,
        paymentStatus: PaymentStatus.PAID,
      },
      {
        status: JobStatus.COMPLETED,
        colorMode: "COLOR",
        printedPages: 4,
        finalAmount: 100,
        paymentStatus: PaymentStatus.UNPAID,
      },
      {
        status: JobStatus.REJECTED,
        colorMode: "BW",
        printedPages: 2,
        finalAmount: 10,
        paymentStatus: PaymentStatus.UNPAID,
      },
    ]);

    const report = await adminService.getDailyReport("shop-1", "2026-11-20");
    expect(report.totalJobs).toBe(3);
    expect(report.statusCounts[JobStatus.COMPLETED]).toBe(2);
    expect(report.statusCounts[JobStatus.REJECTED]).toBe(1);
    expect(report.pagesPrinted.bw).toBe(10);
    expect(report.pagesPrinted.color).toBe(4);
    expect(report.revenue.paid).toBe(50);
    expect(report.revenue.unpaid).toBe(110);
  });
});
