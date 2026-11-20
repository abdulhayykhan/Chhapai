import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { PublicService } from "./public.service.js";
import {
  quoteRequestSchema,
  createJobSchema,
  ErrorCode,
} from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";

@Controller("public")
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get("shops/:slug")
  async getShop(@Param("slug") slug: string) {
    return this.publicService.getShopBySlug(slug);
  }

  @Throttle({ uploads: { limit: 10, ttl: 3600000 } })
  @Post("shops/:slug/uploads")
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.OK)
  async uploadFile(
    @Param("slug") slug: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new AppException(ErrorCode.VALIDATION_ERROR, "File is required");
    }
    return this.publicService.handleUpload(slug, file);
  }

  @Post("quote")
  @HttpCode(HttpStatus.OK)
  async getQuote(@Body() body: any) {
    const parsed = quoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Invalid quote parameters",
        HttpStatus.BAD_REQUEST,
        parsed.error.format(),
      );
    }
    return this.publicService.calculateQuote(parsed.data);
  }

  @Throttle({ jobs: { limit: 20, ttl: 3600000 } })
  @Post("jobs")
  @HttpCode(HttpStatus.OK)
  async createJob(@Body() body: any) {
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Invalid job parameters",
        HttpStatus.BAD_REQUEST,
        parsed.error.format(),
      );
    }
    return this.publicService.createJob(parsed.data);
  }

  @Get("jobs/:publicToken")
  async getJob(@Param("publicToken") publicToken: string) {
    return this.publicService.getJobByPublicToken(publicToken);
  }

  @Post("jobs/:publicToken/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelJob(@Param("publicToken") publicToken: string) {
    return this.publicService.cancelJobByPublicToken(publicToken);
  }
}
