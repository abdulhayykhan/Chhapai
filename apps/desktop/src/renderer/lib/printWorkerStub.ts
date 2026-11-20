import { adminApi } from "./api";
import { PrintJobDto, Shop } from "../types";

class PrintWorkerService {
  private queue: string[] = [];
  private isProcessing = false;
  private shop: Shop | null = null;

  setShop(shop: Shop) {
    this.shop = shop;
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
        `[PrintWorker Stub] Auto-print triggered for job #${job.tokenLabel} (${job.id})`,
      );
      this.enqueue(job.id);
    }
  }

  // Sync backlog on start or reconnect
  async syncBacklog() {
    if (!this.shop?.autoPrint) return;
    try {
      const backlog = await adminApi.getBacklog();
      for (const job of backlog) {
        this.enqueue(job.id);
      }
    } catch (err) {
      console.error("[PrintWorker Stub] Failed to sync backlog:", err);
    }
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const jobId = this.queue.shift()!;

    try {
      console.log(`[PrintWorker Stub] Claiming job ${jobId}...`);
      // Step 1: Claim atomically (APPROVED -> PRINTING)
      let claimedJob: PrintJobDto;
      try {
        claimedJob = await adminApi.claimJob(jobId);
      } catch (err: any) {
        if (err?.status === 409 || err?.code === "INVALID_STATE_TRANSITION") {
          console.log(
            `[PrintWorker Stub] Job ${jobId} already claimed or in invalid state, skipping.`,
          );
          this.isProcessing = false;
          this.processNext();
          return;
        }
        throw err;
      }

      console.log(
        `[PrintWorker Stub] Printing job #${claimedJob.tokenLabel} (${claimedJob.copies} copies, ${claimedJob.colorMode}, ${claimedJob.sides})...`,
      );

      // Step 2: In M5, print is stubbed with 1.2s simulation timer
      if (
        typeof window !== "undefined" &&
        (window as any).electronAPI?.printPdf
      ) {
        await (window as any).electronAPI.printPdf({
          fileData: new ArrayBuffer(8),
          copies: claimedJob.copies,
          pages: claimedJob.pageRange || undefined,
          duplex: claimedJob.sides === "DOUBLE",
          monochrome: claimedJob.colorMode === "BW",
          paperSize: claimedJob.paperSize,
          printer:
            claimedJob.colorMode === "COLOR"
              ? this.shop?.colorPrinter
              : this.shop?.bwPrinter,
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      // Step 3: Complete job (PRINTING -> COMPLETED)
      console.log(
        `[PrintWorker Stub] Marking job #${claimedJob.tokenLabel} as COMPLETED...`,
      );
      await adminApi.completeJob(jobId);
    } catch (err: any) {
      console.error(`[PrintWorker Stub] Failed to print job ${jobId}:`, err);
      try {
        await adminApi.failJob(jobId, err.message || "Print worker error");
      } catch (failErr) {
        console.error(
          `[PrintWorker Stub] Failed to mark job as failed:`,
          failErr,
        );
      }
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }
}

export const printWorker = new PrintWorkerService();
