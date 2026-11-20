import { Injectable, HttpStatus } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { nanoid } from "nanoid";
import { PrismaService } from "../prisma/prisma.service.js";
import { ErrorCode } from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  shopId: string;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret =
      this.config.get<string>("JWT_ACCESS_SECRET") ||
      "default-access-secret-32-chars-long!";
    this.refreshSecret =
      this.config.get<string>("JWT_REFRESH_SECRET") ||
      "default-refresh-secret-32-chars-long!";
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async login(email: string, pass: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.prisma.adminUser.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "Invalid credentials",
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (60 * 1000),
      );
      throw new AppException(
        ErrorCode.RATE_LIMITED,
        `Account locked due to multiple failed login attempts. Try again in ${waitMinutes} minutes.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Verify password with argon2
    const passwordValid = await argon2.verify(user.passwordHash, pass);

    if (!passwordValid) {
      const newFailedCount = user.failedLogins + 1;
      let lockedUntil: Date | null = null;

      if (newFailedCount >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lockout
      }

      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: {
          failedLogins: newFailedCount,
          lockedUntil,
        },
      });

      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "Invalid credentials",
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Reset failed logins on successful authentication
    if (user.failedLogins > 0 || user.lockedUntil) {
      await this.prisma.adminUser.update({
        where: { id: user.id },
        data: {
          failedLogins: 0,
          lockedUntil: null,
        },
      });
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "Refresh token required",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokenHash = this.hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "Invalid or expired refresh token",
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!existing.user.isActive) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "User inactive",
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(existing.user);
  }

  async logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    oldPass: string,
    newPass: string,
  ): Promise<void> {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "User not found",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordValid = await argon2.verify(user.passwordHash, oldPass);
    if (!passwordValid) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "Old password is incorrect",
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (newPass.length < 10) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        "New password must be at least 10 characters long",
        HttpStatus.BAD_REQUEST,
      );
    }

    const newHash = await argon2.hash(newPass);
    await this.prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    // Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    shopId: string;
    name: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    };

    // 15-minute access token
    const accessToken = this.jwt.sign(payload, {
      secret: this.accessSecret,
      expiresIn: "15m",
    });

    // 30-day refresh token
    const rawRefreshToken = `${nanoid(32)}.${Date.now()}`;
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        shopId: user.shopId,
      },
    };
  }
}
