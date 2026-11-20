import { describe, it, expect, vi, beforeEach } from "vitest";
import { printWorker } from "../src/renderer/lib/printWorker";
import { adminApi } from "../src/renderer/lib/api";
import { PrintJobDto, Shop } from "../src/renderer/types";

vi.mock("../src/renderer/lib/api", () => ({
  adminApi: {
    claimJob: vi.fn(),
    completeJob: vi.fn(),
    failJob: vi.fn(),
    getBacklog: vi.fn(),
    getFileBlob: vi.fn(),
  },
}));

describe("PrintWorker Service (M6 - SumatraPDF & IPC Integration)", () => {
  const mockShop: Shop = {
    id: "shop-1",
    slug: "default",
    name: "Chhapai Test Shop",
    isOpen: true,
    autoPrint: true,
    bwPrinter: "HP LaserJet Pro",
    colorPrinter: "Canon Color Printer",
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
    id: "job-bw-1",
    shopId: "shop-1",
    tokenLabel: "047",
    tokenSeq: 47,
    publicToken: "nanoid-047",
    status: "APPROVED",
    customerName: "Asad Rauf",
    uploadId: "upload-047",
    copies: 3,
    colorMode: "BW",
    sides: "DOUBLE",
    paperSize: "A4",
    pageRange: "1-4",
    pagesPerCopy: 4,
    printedPages: 12,
    unitRate: 4,
    calculatedAmount: 48,
    finalAmount: 48,
    paymentStatus: "PAID",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockPdfBlob = new Blob(["%PDF-1.4 mock content"], {
    type: "application/pdf",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    printWorker.setShop(mockShop);
    vi.mocked(adminApi.getFileBlob).mockResolvedValue(mockPdfBlob);

    // Mock Electron API in window
    (window as any).electronAPI = {
      printPdf: vi.fn().mockResolvedValue({ success: true }),
      getPrinters: vi
        .fn()
        .mockResolvedValue(["HP LaserJet Pro", "Canon Color Printer"]),
    };
  });

  it("claims job, downloads PDF, calls printPdf with correct option mapping, and marks COMPLETED", async () => {
    const claimedJob: PrintJobDto = { ...mockApprovedJob, status: "PRINTING" };
    vi.mocked(adminApi.claimJob).mockResolvedValue(claimedJob);
    vi.mocked(adminApi.completeJob).mockResolvedValue({
      ...claimedJob,
      status: "COMPLETED",
    });

    printWorker.enqueue("job-bw-1");

    await vi.waitFor(
      () => {
        expect(adminApi.claimJob).toHaveBeenCalledWith("job-bw-1");
        expect(adminApi.getFileBlob).toHaveBeenCalledWith("job-bw-1");
        expect((window as any).electronAPI.printPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            copies: 3,
            pages: "1-4",
            duplex: true,
            monochrome: true,
            paperSize: "A4",
            printer: "HP LaserJet Pro",
          }),
        );
        expect(adminApi.completeJob).toHaveBeenCalledWith("job-bw-1");
      },
      { timeout: 3000 },
    );
  });

  it("routes COLOR jobs to the configured shop.colorPrinter", async () => {
    const colorJob: PrintJobDto = {
      ...mockApprovedJob,
      id: "job-color-1",
      tokenLabel: "048",
      colorMode: "COLOR",
      sides: "SINGLE",
    };
    const claimedColorJob: PrintJobDto = { ...colorJob, status: "PRINTING" };

    vi.mocked(adminApi.claimJob).mockResolvedValue(claimedColorJob);
    vi.mocked(adminApi.completeJob).mockResolvedValue({
      ...claimedColorJob,
      status: "COMPLETED",
    });

    printWorker.enqueue("job-color-1");

    await vi.waitFor(
      () => {
        expect((window as any).electronAPI.printPdf).toHaveBeenCalledWith(
          expect.objectContaining({
            monochrome: false,
            duplex: false,
            printer: "Canon Color Printer",
          }),
        );
        expect(adminApi.completeJob).toHaveBeenCalledWith("job-color-1");
      },
      { timeout: 3000 },
    );
  });

  it("fails with reason when target printer is missing from shop configuration", async () => {
    // Shop with bwPrinter but no colorPrinter
    printWorker.setShop({ ...mockShop, colorPrinter: "" });

    const colorJob: PrintJobDto = {
      ...mockApprovedJob,
      id: "job-no-printer",
      colorMode: "COLOR",
    };
    vi.mocked(adminApi.claimJob).mockResolvedValue({
      ...colorJob,
      status: "PRINTING",
    });
    vi.mocked(adminApi.failJob).mockResolvedValue({
      ...colorJob,
      status: "FAILED",
    });

    printWorker.enqueue("job-no-printer");

    await vi.waitFor(
      () => {
        expect(adminApi.failJob).toHaveBeenCalledWith(
          "job-no-printer",
          expect.stringContaining("Color printer configure nahi hai"),
        );
        expect((window as any).electronAPI.printPdf).not.toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("handles 409 transition conflict gracefully (skipping if claimed by another worker)", async () => {
    const conflictErr: any = new Error("Invalid state transition");
    conflictErr.status = 409;
    conflictErr.code = "INVALID_STATE_TRANSITION";

    vi.mocked(adminApi.claimJob).mockRejectedValue(conflictErr);

    printWorker.enqueue("job-conflict");

    await vi.waitFor(
      () => {
        expect(adminApi.claimJob).toHaveBeenCalledWith("job-conflict");
        expect((window as any).electronAPI.printPdf).not.toHaveBeenCalled();
        expect(adminApi.completeJob).not.toHaveBeenCalled();
        expect(adminApi.failJob).not.toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("records job failure when Windows spooler fails", async () => {
    const claimedJob: PrintJobDto = {
      ...mockApprovedJob,
      id: "job-spool-err",
      status: "PRINTING",
    };
    vi.mocked(adminApi.claimJob).mockResolvedValue(claimedJob);
    (window as any).electronAPI.printPdf.mockResolvedValue({
      success: false,
      error: "Paper Out / Spooler Offline",
    });
    vi.mocked(adminApi.failJob).mockResolvedValue({
      ...claimedJob,
      status: "FAILED",
    });

    printWorker.enqueue("job-spool-err");

    await vi.waitFor(
      () => {
        expect(adminApi.failJob).toHaveBeenCalledWith(
          "job-spool-err",
          "Paper Out / Spooler Offline",
        );
        expect(adminApi.completeJob).not.toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("processes backlog of unclaimed approved jobs on startup or reconnect", async () => {
    const backlogJob1: PrintJobDto = {
      ...mockApprovedJob,
      id: "backlog-1",
      tokenLabel: "091",
    };
    const backlogJob2: PrintJobDto = {
      ...mockApprovedJob,
      id: "backlog-2",
      tokenLabel: "092",
    };

    vi.mocked(adminApi.getBacklog).mockResolvedValue([
      backlogJob1,
      backlogJob2,
    ]);
    vi.mocked(adminApi.claimJob).mockResolvedValue({
      ...backlogJob1,
      status: "PRINTING",
    });
    vi.mocked(adminApi.completeJob).mockResolvedValue({
      ...backlogJob1,
      status: "COMPLETED",
    });

    await printWorker.syncBacklog();

    await vi.waitFor(
      () => {
        expect(adminApi.getBacklog).toHaveBeenCalled();
        expect(adminApi.claimJob).toHaveBeenCalledWith("backlog-1");
      },
      { timeout: 3000 },
    );
  });
});
