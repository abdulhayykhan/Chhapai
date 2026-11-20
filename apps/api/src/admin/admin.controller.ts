import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { AdminService } from "./admin.service.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import {
  approveJobSchema,
  rejectJobSchema,
  failJobSchema,
  updateSettingsSchema,
  ErrorCode,
  JobStatus,
} from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";

@Controller("admin")
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("jobs")
  async listJobs(
    @CurrentUser("shopId") shopId: string,
    @Query("status") status?: JobStatus,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.adminService.listJobs(shopId, {
      status,
      from,
      to,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get("jobs/backlog")
  async getBacklog(@CurrentUser("shopId") shopId: string) {
    return this.adminService.getBacklog(shopId);
  }

  @Get("jobs/:id")
  async getJobDetail(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
  ) {
    return this.adminService.getJobDetail(shopId, id);
  }

  @Get("jobs/:id/file")
  async getJobFile(
    @CurrentUser("shopId") shopId: string,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.adminService.getJobFile(shopId, id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${fileName}.pdf"`);
    res.send(buffer);
  }

  @Post("jobs/:id/approve")
  @HttpCode(HttpStatus.OK)
  async approveJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const parsed = approveJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Invalid approve parameters",
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.adminService.approveJob(shopId, id, userId, parsed.data);
  }

  @Post("jobs/:id/reject")
  @HttpCode(HttpStatus.OK)
  async rejectJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const parsed = rejectJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Reason is required for rejection",
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.adminService.rejectJob(shopId, id, userId, parsed.data.reason);
  }

  @Post("jobs/:id/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
  ) {
    return this.adminService.cancelJob(shopId, id, userId);
  }

  @Post("jobs/:id/retry")
  @HttpCode(HttpStatus.OK)
  async retryJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
  ) {
    return this.adminService.retryJob(shopId, id, userId);
  }

  @Post("jobs/:id/mark-paid")
  @HttpCode(HttpStatus.OK)
  async markPaid(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
  ) {
    return this.adminService.markPaid(shopId, id, userId);
  }

  @Post("jobs/:id/claim")
  @HttpCode(HttpStatus.OK)
  async claimJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
  ) {
    return this.adminService.claimJob(shopId, id, userId);
  }

  @Post("jobs/:id/complete")
  @HttpCode(HttpStatus.OK)
  async completeJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
  ) {
    return this.adminService.completeJob(shopId, id, userId);
  }

  @Post("jobs/:id/fail")
  @HttpCode(HttpStatus.OK)
  async failJob(
    @CurrentUser("shopId") shopId: string,
    @CurrentUser("sub") userId: string,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    const parsed = failJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Reason is required for failure",
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.adminService.failJob(shopId, id, userId, parsed.data.reason);
  }

  @Get("settings")
  async getSettings(@CurrentUser("shopId") shopId: string) {
    return this.adminService.getSettings(shopId);
  }

  @Put("settings")
  async updateSettings(
    @CurrentUser("shopId") shopId: string,
    @Body() body: any,
  ) {
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Invalid settings parameters",
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.adminService.updateSettings(shopId, parsed.data);
  }

  @Get("reports/daily")
  async getDailyReport(
    @CurrentUser("shopId") shopId: string,
    @Query("date") date?: string,
  ) {
    return this.adminService.getDailyReport(shopId, date);
  }

  @Get("qr")
  async getQr(
    @CurrentUser("shopId") shopId: string,
    @Query("format") format: "png" | "svg" = "png",
    @Res() res: Response,
  ) {
    const { contentType, content } = await this.adminService.generateQr(
      shopId,
      format,
    );
    res.setHeader("Content-Type", contentType);
    res.send(content);
  }
}
