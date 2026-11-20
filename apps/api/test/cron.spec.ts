import { describe, it, expect, beforeEach, vi } from "vitest";
import { CronService } from "../src/cron/cron.service.js";
import { JobStatus } from "@chhapai/shared";

describe("CronService Maintenance (PRD Section 5 B6)", () => {
  let cronService: CronService;
  let mockPrisma: any;
  let mockStorage: any;
  let mockGateway: any;

  beforeEach(() => {
    mockStorage = {
      delete: vi.fn().mockResolvedValue(undefined),
    };
    mockGateway = {
      emitJobUpdated: vi.fn(),
    };
    mockPrisma = {
      shop: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { id: "shop-1", pendingExpiryHours: 24, retentionMinutes: 60 },
          ]),
      },
      printJob: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({}),
      },
      upload: {
        findMany: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue({}),
      },
      jobEvent: {
        create: vi.fn().mockResolvedValue({}),
      },
      $transaction: async (fn: any) => fn(mockPrisma),
    };

    cronService = new CronService(mockPrisma, mockStorage, mockGateway);
  });

  it("marks stale PRINTING jobs older than 5 min as FAILED with print worker timeout", async () => {
    const staleJob = {
      id: "stale-job-1",
      shopId: "shop-1",
      status: JobStatus.PRINTING,
      printStartedAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
    };

    mockPrisma.printJob.findMany.mockResolvedValue([staleJob]);

    await cronService.handleStalePrintingJobs();

    expect(mockPrisma.printJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "stale-job-1" },
        data: expect.objectContaining({
          status: JobStatus.FAILED,
          failReason: "print worker timeout",
        }),
      }),
    );
    expect(mockGateway.emitJobUpdated).toHaveBeenCalled();
  });

  it("deletes orphan uploads older than 1 hour", async () => {
    const orphanUpload = {
      id: "upload-orphan-1",
      fileKey: "orphan.pdf",
      createdAt: new Date(Date.now() - 70 * 60 * 1000), // 70 minutes ago
    };

    mockPrisma.upload.findMany.mockResolvedValue([orphanUpload]);

    await cronService.deleteOrphanUploads();

    expect(mockStorage.delete).toHaveBeenCalledWith("orphan.pdf");
    expect(mockPrisma.upload.delete).toHaveBeenCalledWith({
      where: { id: "upload-orphan-1" },
    });
  });

  it("deletes files of finished jobs past retention and sets fileDeletedAt", async () => {
    const finishedJob = {
      id: "completed-job-1",
      shopId: "shop-1",
      status: JobStatus.COMPLETED,
      fileDeletedAt: null,
      updatedAt: new Date(Date.now() - 70 * 60 * 1000), // past 60 min retention
      upload: {
        fileKey: "done.pdf",
      },
    };

    mockPrisma.printJob.findMany.mockResolvedValue([finishedJob]);

    await cronService.cleanupExpiredFiles();

    expect(mockStorage.delete).toHaveBeenCalledWith("done.pdf");
    expect(mockPrisma.printJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "completed-job-1" },
        data: expect.objectContaining({
          fileDeletedAt: expect.any(Date),
        }),
      }),
    );
  });
});
