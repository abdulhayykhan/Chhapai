import { Injectable, HttpStatus, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../storage/storage.service.js";
import { AdminGateway } from "../realtime/admin.gateway.js";
import {
  ApproveJobDto,
  ErrorCode,
  JobStatus,
  PaymentStatus,
  UpdateSettingsDto,
  validateTransition,
} from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";
import { ConfigService } from "@nestjs/config";
import * as QRCode from "qrcode";

export interface ListJobsQuery {
  status?: JobStatus;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject("STORAGE_SERVICE")
    private readonly storage: StorageService,
    private readonly adminGateway: AdminGateway,
    private readonly config: ConfigService,
  ) {}

  private checkTransition(from: JobStatus, to: JobStatus): void {
    try {
      validateTransition(from, to);
    } catch (err: any) {
      throw new AppException(
        ErrorCode.INVALID_STATE_TRANSITION,
        err.message,
        HttpStatus.CONFLICT,
      );
    }
  }

  async listJobs(shopId: string, query: ListJobsQuery) {
    const page = Math.max(Number(query.page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 100);
    const skip = (page - 1) * pageSize;

    const where: any = { shopId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) {
        where.createdAt.gte = new Date(query.from);
      }
      if (query.to) {
        where.createdAt.lte = new Date(query.to);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.printJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          upload: {
            select: {
              originalName: true,
              sizeBytes: true,
              pageCount: true,
            },
          },
        },
      }),
      this.prisma.printJob.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
      },
    };
  }

  async getBacklog(shopId: string) {
    return this.prisma.printJob.findMany({
      where: {
        shopId,
        status: JobStatus.APPROVED,
      },
      orderBy: {
        approvedAt: "asc",
      },
      include: {
        upload: {
          select: {
            originalName: true,
            sizeBytes: true,
            pageCount: true,
          },
        },
      },
    });
  }

  async getJobDetail(shopId: string, jobId: string) {
    const job = await this.prisma.printJob.findUnique({
      where: { id: jobId },
      include: {
        events: {
          orderBy: { createdAt: "asc" },
        },
        upload: true,
      },
    });

    if (!job || job.shopId !== shopId) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Job not found",
        HttpStatus.NOT_FOUND,
      );
    }

    return job;
  }

  async getJobFile(shopId: string, jobId: string) {
    const job = await this.getJobDetail(shopId, jobId);
    const buffer = await this.storage.get(job.upload.fileKey);
    return {
      buffer,
      fileName: job.upload.originalName,
    };
  }

  async approveJob(
    shopId: string,
    jobId: string,
    actorUserId: string,
    dto: ApproveJobDto,
  ) {
    const job = await this.getJobDetail(shopId, jobId);
    this.checkTransition(job.status as JobStatus, JobStatus.APPROVED);

    const now = new Date();
    const updateData: any = {
      status: JobStatus.APPROVED,
      approvedAt: now,
    };

    if (dto.finalAmount !== undefined) {
      updateData.finalAmount = dto.finalAmount;
    }

    if (dto.markPaid) {
      updateData.paymentStatus = PaymentStatus.PAID;
      updateData.paidAt = now;
    }

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: jobId },
        data: updateData,
        include: { upload: true },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          type: "APPROVED",
          fromStatus: job.status,
          toStatus: JobStatus.APPROVED,
          actorUserId,
          message:
            dto.finalAmount !== undefined
              ? `Price adjusted to ${dto.finalAmount} PKR`
              : undefined,
        },
      });

      return j;
    });

    this.adminGateway.emitJobApproved(shopId, updatedJob);
    this.adminGateway.emitJobUpdated(shopId, updatedJob);
    return updatedJob;
  }

  async rejectJob(
    shopId: string,
    jobId: string,
    actorUserId: string,
    reason: string,
  ) {
    const job = await this.getJobDetail(shopId, jobId);
    this.checkTransition(job.status as JobStatus, JobStatus.REJECTED);

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.REJECTED,
          rejectReason: reason,
        },
        include: { upload: true },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          type: "REJECTED",
          fromStatus: job.status,
          toStatus: JobStatus.REJECTED,
          actorUserId,
          message: reason,
        },
      });

      return j;
    });

    this.adminGateway.emitJobUpdated(shopId, updatedJob);
    return updatedJob;
  }

  async cancelJob(shopId: string, jobId: string, actorUserId: string) {
    const job = await this.getJobDetail(shopId, jobId);
    this.checkTransition(job.status as JobStatus, JobStatus.CANCELLED);

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.CANCELLED,
        },
        include: { upload: true },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          type: "CANCELLED",
          fromStatus: job.status,
          toStatus: JobStatus.CANCELLED,
          actorUserId,
          message: "Cancelled by operator",
        },
      });

      return j;
    });

    this.adminGateway.emitJobUpdated(shopId, updatedJob);
    return updatedJob;
  }

  async retryJob(shopId: string, jobId: string, actorUserId: string) {
    const job = await this.getJobDetail(shopId, jobId);
    this.checkTransition(job.status as JobStatus, JobStatus.APPROVED);

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.APPROVED,
          failReason: null,
          approvedAt: new Date(),
        },
        include: { upload: true },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          type: "RETRIED",
          fromStatus: job.status,
          toStatus: JobStatus.APPROVED,
          actorUserId,
          message: "Retried by operator",
        },
      });

      return j;
    });

    this.adminGateway.emitJobApproved(shopId, updatedJob);
    this.adminGateway.emitJobUpdated(shopId, updatedJob);
    return updatedJob;
  }

  async markPaid(shopId: string, jobId: string, actorUserId: string) {
    const job = await this.getJobDetail(shopId, jobId);

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: jobId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paidAt: new Date(),
        },
        include: { upload: true },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          type: "PAID",
          actorUserId,
          message: "Marked paid by operator",
        },
      });

      return j;
    });

    this.adminGateway.emitJobUpdated(shopId, updatedJob);
    return updatedJob;
  }

  /**
   * ATOMIC CLAIM STEP:
   * PRD Section 3.3: "claim must be atomic: update where id matches AND status is APPROVED;
   * if zero rows changed, return 409."
   */
  async claimJob(shopId: string, jobId: string, actorUserId?: string) {
    const now = new Date();

    const result = await this.prisma.printJob.updateMany({
      where: {
        id: jobId,
        shopId,
        status: JobStatus.APPROVED,
      },
      data: {
        status: JobStatus.PRINTING,
        printStartedAt: now,
      },
    });

    if (result.count === 0) {
      throw new AppException(
        ErrorCode.INVALID_STATE_TRANSITION,
        "Cannot claim job: job is not in APPROVED state or was already claimed",
        HttpStatus.CONFLICT,
      );
    }

    // Log the event and fetch the claimed job
    const claimedJob = await this.prisma.printJob.findUniqueOrThrow({
      where: { id: jobId },
      include: { upload: true },
    });

    await this.prisma.jobEvent.create({
      data: {
        jobId,
        type: "CLAIMED",
        fromStatus: JobStatus.APPROVED,
        toStatus: JobStatus.PRINTING,
        actorUserId: actorUserId || null,
        message: "Claimed by print worker",
      },
    });

    this.adminGateway.emitJobUpdated(shopId, claimedJob);
    return claimedJob;
  }

  async completeJob(shopId: string, jobId: string, actorUserId?: string) {
    const job = await this.getJobDetail(shopId, jobId);
    this.checkTransition(job.status as JobStatus, JobStatus.COMPLETED);

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        },
        include: { upload: true },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          type: "COMPLETED",
          fromStatus: job.status,
          toStatus: JobStatus.COMPLETED,
          actorUserId: actorUserId || null,
          message: "Printed successfully",
        },
      });

      return j;
    });

    this.adminGateway.emitJobUpdated(shopId, updatedJob);
    return updatedJob;
  }

  async failJob(
    shopId: string,
    jobId: string,
    actorUserId: string | undefined,
    reason: string,
  ) {
    const job = await this.getJobDetail(shopId, jobId);
    this.checkTransition(job.status as JobStatus, JobStatus.FAILED);

    const updatedJob = await this.prisma.$transaction(async (tx) => {
      const j = await tx.printJob.update({
        where: { id: jobId },
        data: {
          status: JobStatus.FAILED,
          failReason: reason,
        },
        include: { upload: true },
      });

      await tx.jobEvent.create({
        data: {
          jobId,
          type: "FAILED",
          fromStatus: job.status,
          toStatus: JobStatus.FAILED,
          actorUserId: actorUserId || null,
          message: reason,
        },
      });

      return j;
    });

    this.adminGateway.emitJobUpdated(shopId, updatedJob);
    return updatedJob;
  }

  async getSettings(shopId: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new AppException(
        ErrorCode.JOB_NOT_FOUND,
        "Shop not found",
        HttpStatus.NOT_FOUND,
      );
    }

    return shop;
  }

  async updateSettings(shopId: string, dto: UpdateSettingsDto) {
    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: dto as any,
    });
    return updated;
  }

  async getDailyReport(shopId: string, dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split("T")[0];
    const startOfDay = new Date(`${targetDate}T00:00:00.000Z`);
    const endOfDay = new Date(`${targetDate}T23:59:59.999Z`);

    const jobs = await this.prisma.printJob.findMany({
      where: {
        shopId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const statusCounts: Record<string, number> = {
      [JobStatus.PENDING_APPROVAL]: 0,
      [JobStatus.APPROVED]: 0,
      [JobStatus.PRINTING]: 0,
      [JobStatus.COMPLETED]: 0,
      [JobStatus.REJECTED]: 0,
      [JobStatus.FAILED]: 0,
      [JobStatus.CANCELLED]: 0,
      [JobStatus.EXPIRED]: 0,
    };

    let pagesBw = 0;
    let pagesColor = 0;
    let revenuePaid = 0;
    let revenueUnpaid = 0;

    for (const j of jobs) {
      if (j.status in statusCounts) {
        statusCounts[j.status]++;
      }

      if (j.status === JobStatus.COMPLETED) {
        if (j.colorMode === "BW") {
          pagesBw += j.printedPages;
        } else {
          pagesColor += j.printedPages;
        }
      }

      if (j.paymentStatus === PaymentStatus.PAID) {
        revenuePaid += j.finalAmount;
      } else {
        revenueUnpaid += j.finalAmount;
      }
    }

    return {
      date: targetDate,
      totalJobs: jobs.length,
      statusCounts,
      pagesPrinted: {
        bw: pagesBw,
        color: pagesColor,
        total: pagesBw + pagesColor,
      },
      revenue: {
        paid: revenuePaid,
        unpaid: revenueUnpaid,
        total: revenuePaid + revenueUnpaid,
      },
    };
  }

  async generateQr(shopId: string, format: "png" | "svg" = "png") {
    const shop = await this.getSettings(shopId);
    const webUrl = (
      this.config.get<string>("PUBLIC_WEB_URL") ||
      "https://chhapai-web.vercel.app"
    ).replace(/\/+$/, "");
    const targetUrl = `${webUrl}/s/${shop.slug}`;

    if (format === "svg") {
      const svg = await QRCode.toString(targetUrl, { type: "svg", margin: 2 });
      return { contentType: "image/svg+xml", content: Buffer.from(svg) };
    }

    const png = await QRCode.toBuffer(targetUrl, {
      type: "png",
      width: 512,
      margin: 2,
    });
    return { contentType: "image/png", content: png };
  }
}
