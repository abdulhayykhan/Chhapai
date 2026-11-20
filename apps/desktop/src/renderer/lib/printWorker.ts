import { adminApi } from "./api";
import { PrintJobDto, Shop } from "../types";

class PrintWorkerService {
  private queue: string[] = [];
  private isProcessing = false;
  private shop: Shop | null = null;

  setShop(shop: Shop) {
    this.shop = shop;
  }

  getShop(): Shop | null {
    return this.shop;
  }

  // Enqueue a job for printing
  enqueue(jobId: string) {
    if (!this.queue.includes(jobId)) {
      this.queue.push(jobId);
      this.processNext();
    }
  }

  // Handle auto-print trigger on approval
  handleJobApproved(job: PrintJobDto) {
    if (this.shop?.autoPrint) {
      console.log(
        `[PrintWorker] Auto-print triggered for job #${job.tokenLabel} (${job.id})`,
      );
      this.enqueue(job.id);
    }
  }

  // Sync backlog on startup or reconnect
  async syncBacklog() {
    if (!this.shop?.autoPrint) return;
    try {
      const backlog = await adminApi.getBacklog();
      console.log(
        `[PrintWorker] Found ${backlog.length} unclaimed backlog jobs`,
      );
      for (const job of backlog) {
        this.enqueue(job.id);
      }
    } catch (err) {
      console.error("[PrintWorker] Failed to sync backlog:", err);
    }
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const jobId = this.queue.shift()!;

    try {
      console.log(`[PrintWorker] Processing job ${jobId}...`);

      // Step 1: Claim atomically (APPROVED -> PRINTING)
      let claimedJob: PrintJobDto;
      try {
        claimedJob = await adminApi.claimJob(jobId);
      } catch (err: any) {
        if (err?.status === 409 || err?.code === "INVALID_STATE_TRANSITION") {
          console.log(
            `[PrintWorker] Job ${jobId} already claimed or in invalid state, skipping.`,
          );
          this.isProcessing = false;
          this.processNext();
          return;
        }
        throw err;
      }

      // Step 2: Printer selection
      const targetPrinter =
        claimedJob.colorMode === "COLOR"
          ? this.shop?.colorPrinter
          : this.shop?.bwPrinter;

      if (!targetPrinter && (this.shop?.colorPrinter || this.shop?.bwPrinter)) {
        const missingPrinterReason = `${claimedJob.colorMode === "COLOR" ? "Color" : "B/W"} printer configure nahi hai`;
        console.error(`[PrintWorker] ${missingPrinterReason}`);
        await adminApi.failJob(jobId, missingPrinterReason);
        this.isProcessing = false;
        this.processNext();
        return;
      }

      // Step 3: Download PDF file bytes from authenticated API endpoint
      console.log(
        `[PrintWorker] Downloading PDF for job #${claimedJob.tokenLabel}...`,
      );
      const fileBlob = await adminApi.getFileBlob(jobId);
      let fileData: ArrayBuffer;
      if (typeof fileBlob.arrayBuffer === "function") {
        fileData = await fileBlob.arrayBuffer();
      } else if (typeof (fileBlob as any).text === "function") {
        const text = await fileBlob.text();
        fileData = new TextEncoder().encode(text).buffer;
      } else {
        fileData = new ArrayBuffer(0);
      }

      // Step 4: Send over IPC to Electron main process (pdf-to-printer)
      console.log(
        `[PrintWorker] Sending job #${claimedJob.tokenLabel} to Windows spooler via IPC...`,
      );
      let printResult: { success: boolean; error?: string } = { success: true };

      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.printPdf
      ) {
        printResult = await (window as any).electronAPI.printPdf({
          fileData,
          copies: claimedJob.copies,
          pages: claimedJob.pageRange || undefined,
          duplex: claimedJob.sides === "DOUBLE",
          monochrome: claimedJob.colorMode === "BW",
          paperSize: claimedJob.paperSize,
          printer: targetPrinter || undefined,
        });
      } else {
        // Fallback simulation in non-Electron test environment
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!printResult.success) {
        throw new Error(
          printResult.error || "Print Windows spooler tak nahi pohnch saka",
        );
      }

      // Step 5: Complete job (PRINTING -> COMPLETED)
      console.log(
        `[PrintWorker] Marking job #${claimedJob.tokenLabel} as COMPLETED...`,
      );
      await adminApi.completeJob(jobId);
    } catch (err: any) {
      console.error(`[PrintWorker] Failed to print job ${jobId}:`, err);
      try {
        await adminApi.failJob(jobId, err.message || "Print processing error");
      } catch (failErr) {
        console.error(`[PrintWorker] Failed to record job failure:`, failErr);
      }
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }
}

export const printWorker = new PrintWorkerService();
