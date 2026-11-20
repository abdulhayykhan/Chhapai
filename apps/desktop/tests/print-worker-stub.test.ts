import { describe, it, expect, vi, beforeEach } from "vitest";
import { printWorker } from "../src/renderer/lib/printWorkerStub";
import { adminApi } from "../src/renderer/lib/api";
import { PrintJobDto, Shop } from "../src/renderer/types";

vi.mock("../src/renderer/lib/api", () => ({
  adminApi: {
    claimJob: vi.fn(),
    completeJob: vi.fn(),
    failJob: vi.fn(),
    getBacklog: vi.fn(),
  },
}));

describe("PrintWorker Stub (M5 Acceptance)", () => {
  const mockShop: Shop = {
    id: "shop-1",
    slug: "default",
    name: "Chhapai Test Shop",
    isOpen: true,
    autoPrint: true,
    rateBwSingle: 5,
    rateBwDouble: 4,
    rateColorSingle: 30,
    rateColorDouble: 25,
    maxFileMb: 25,
    maxPages: 200,
    retentionMinutes: 60,
    pendingExpiryHours: 24,
  };

  const mockApprovedJob: PrintJobDto = {
    id: "job-999",
    shopId: "shop-1",
    tokenLabel: "999",
    tokenSeq: 999,
    publicToken: "nanoid-999",
    status: "APPROVED",
    customerName: "Tariq Mehmood",
    uploadId: "upload-999",
    copies: 1,
    colorMode: "BW",
    sides: "SINGLE",
    paperSize: "A4",
    pagesPerCopy: 2,
    printedPages: 2,
    unitRate: 5,
    calculatedAmount: 10,
    finalAmount: 10,
    paymentStatus: "UNPAID",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    printWorker.setShop(mockShop);
  });

  it("claims job and transitions to COMPLETED via stub worker", async () => {
    const claimedJob: PrintJobDto = { ...mockApprovedJob, status: "PRINTING" };
    vi.mocked(adminApi.claimJob).mockResolvedValue(claimedJob);
    vi.mocked(adminApi.completeJob).mockResolvedValue({
      ...claimedJob,
      status: "COMPLETED",
    });

    printWorker.enqueue("job-999");

    // Wait for async processing
    await vi.waitFor(
      () => {
        expect(adminApi.claimJob).toHaveBeenCalledWith("job-999");
        expect(adminApi.completeJob).toHaveBeenCalledWith("job-999");
      },
      { timeout: 3000 },
    );
  });

  it("skips job if claimJob returns 409 conflict (already claimed)", async () => {
    const conflictError: any = new Error("Invalid state transition");
    conflictError.status = 409;
    conflictError.code = "INVALID_STATE_TRANSITION";

    vi.mocked(adminApi.claimJob).mockRejectedValue(conflictError);

    printWorker.enqueue("job-conflict");

    await vi.waitFor(
      () => {
        expect(adminApi.claimJob).toHaveBeenCalledWith("job-conflict");
        expect(adminApi.completeJob).not.toHaveBeenCalled();
        expect(adminApi.failJob).not.toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("calls failJob when an unexpected print error occurs", async () => {
    const claimedJob: PrintJobDto = {
      ...mockApprovedJob,
      id: "job-error",
      status: "PRINTING",
    };
    vi.mocked(adminApi.claimJob).mockResolvedValue(claimedJob);
    vi.mocked(adminApi.completeJob).mockRejectedValue(
      new Error("Printer Spooler Error"),
    );
    vi.mocked(adminApi.failJob).mockResolvedValue({
      ...claimedJob,
      status: "FAILED",
    });

    printWorker.enqueue("job-error");

    await vi.waitFor(
      () => {
        expect(adminApi.claimJob).toHaveBeenCalledWith("job-error");
        expect(adminApi.failJob).toHaveBeenCalledWith(
          "job-error",
          "Printer Spooler Error",
        );
      },
      { timeout: 3000 },
    );
  });

  it("auto-prints when job:approved event arrives and autoPrint is enabled", async () => {
    const claimedJob: PrintJobDto = {
      ...mockApprovedJob,
      id: "job-autoprint",
      status: "PRINTING",
    };
    vi.mocked(adminApi.claimJob).mockResolvedValue(claimedJob);
    vi.mocked(adminApi.completeJob).mockResolvedValue({
      ...claimedJob,
      status: "COMPLETED",
    });

    printWorker.handleJobApproved({ ...mockApprovedJob, id: "job-autoprint" });

    await vi.waitFor(
      () => {
        expect(adminApi.claimJob).toHaveBeenCalledWith("job-autoprint");
        expect(adminApi.completeJob).toHaveBeenCalledWith("job-autoprint");
      },
      { timeout: 3000 },
    );
  });
});
