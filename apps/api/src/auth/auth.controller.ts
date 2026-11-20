import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";
import { CurrentUser } from "./current-user.decorator.js";
import { authLoginSchema, changePasswordSchema } from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";
import { ErrorCode } from "@chhapai/shared";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const parsed = authLoginSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Invalid login details",
        HttpStatus.BAD_REQUEST,
        parsed.error.format(),
      );
    }
    return this.auth.login(parsed.data.email, parsed.data.password);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Body("refreshToken") refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Body("refreshToken") refreshToken: string) {
    await this.auth.logout(refreshToken);
    return { ok: true };
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser("sub") userId: string, @Body() body: any) {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        parsed.error.errors[0]?.message || "Invalid password details",
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.auth.changePassword(
      userId,
      parsed.data.oldPassword,
      parsed.data.newPassword,
    );
    return { ok: true };
  }
}
