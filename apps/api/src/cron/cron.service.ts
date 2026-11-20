import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { AdminGateway } from "../realtime/admin.gateway.js";
import { JobStatus } from "@chhapai/shared";

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject("STORAGE_SERVICE")
    private readonly storage: StorageService,
    private readonly adminGateway: AdminGateway,
  ) {}

  @Cron("*/10 * * * *") // Run every 10 minutes per PRD B6
  async runMaintenanceCron() {
    this.logger.log("Starting 10-minute maintenance cron...");
    await Promise.allSettled([
      this.expireOldPendingJobs(),
      this.deleteOrphanUploads(),
      this.handleStalePrintingJobs(),
      this.cleanupExpiredFiles(),
    ]);
    this.logger.log("Maintenance cron completed.");
  }

  /**
   * 1. Expire pending jobs older than pendingExpiryHours
   */
  async expireOldPendingJobs() {
    const shops = await this.prisma.shop.findMany({
      select: { id: true, pendingExpiryHours: true },
    });

    for (const shop of shops) {
      const cutoff = new Date(
        Date.now() - shop.pendingExpiryHours * 60 * 60 * 1000,
      );

      const expiredJobs = await this.prisma.printJob.findMany({
        where: {
          shopId: shop.id,
          status: JobStatus.PENDING_APPROVAL,
          createdAt: { lt: cutoff },
        },
      });

      for (const job of expiredJobs) {
        await this.prisma.$transaction(async (tx) => {
          await tx.printJob.update({
            where: { id: job.id },
            data: { status: JobStatus.EXPIRED },
          });

          await tx.jobEvent.create({
            data: {
              jobId: job.id,
              type: "EXPIRED",
              fromStatus: JobStatus.PENDING_APPROVAL,
              toStatus: JobStatus.EXPIRED,
              message: `Expired after ${shop.pendingExpiryHours} hours without approval`,
            },
          });
        });

        this.adminGateway.emitJobUpdated(shop.id, {
          ...job,
          status: JobStatus.EXPIRED,
        });
      }
    }
  }

  /**
   * 2. Delete orphan uploads older than 1 hour
   */
  async deleteOrphanUploads() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const orphanUploads = await this.prisma.upload.findMany({
      where: {
        job: null,
        createdAt: { lt: oneHourAgo },
      },
    });

    for (const upload of orphanUploads) {
      await this.storage.delete(upload.fileKey);
      await this.prisma.upload
        .delete({ where: { id: upload.id } })
        .catch(() => {});
    }
  }

  /**
   * 3. Mark PRINTING older than 5 min as FAILED (reason: print worker timeout)
   */
  async handleStalePrintingJobs() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const staleJobs = await this.prisma.printJob.findMany({
      where: {
        status: JobStatus.PRINTING,
        printStartedAt: { lt: fiveMinutesAgo },
      },
    });

    for (const job of staleJobs) {
      await this.prisma.$transaction(async (tx) => {
        await tx.printJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.FAILED,
            failReason: "print worker timeout",
          },
        });

        await tx.jobEvent.create({
          data: {
            jobId: job.id,
            type: "FAILED",
            fromStatus: JobStatus.PRINTING,
            toStatus: JobStatus.FAILED,
            message: "print worker timeout",
          },
        });
      });

      this.adminGateway.emitJobUpdated(job.shopId, {
        ...job,
        status: JobStatus.FAILED,
        failReason: "print worker timeout",
      });
    }
  }

  /**
   * 4. Delete files of finished jobs past retention and set fileDeletedAt
   */
  async cleanupExpiredFiles() {
    const shops = await this.prisma.shop.findMany({
      select: { id: true, retentionMinutes: true },
    });

    for (const shop of shops) {
      const cutoff = new Date(Date.now() - shop.retentionMinutes * 60 * 1000);

      const jobsToCleanup = await this.prisma.printJob.findMany({
        where: {
          shopId: shop.id,
          status: {
            in: [
              JobStatus.COMPLETED,
              JobStatus.REJECTED,
              JobStatus.CANCELLED,
              JobStatus.EXPIRED,
              JobStatus.FAILED,
            ],
          },
          fileDeletedAt: null,
          updatedAt: { lt: cutoff },
        },
        include: {
          upload: true,
        },
      });

      for (const job of jobsToCleanup) {
        if (job.upload?.fileKey) {
          await this.storage.delete(job.upload.fileKey);
        }

        await this.prisma.printJob.update({
          where: { id: job.id },
          data: { fileDeletedAt: new Date() },
        });
      }
    }
  }
}
