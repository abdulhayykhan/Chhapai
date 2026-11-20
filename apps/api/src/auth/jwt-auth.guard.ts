import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { ErrorCode } from "@chhapai/shared";
import { AppException } from "../common/exceptions/app.exception.js";
import { JwtPayload } from "./auth.service.js";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly accessSecret: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessSecret =
      this.config.get<string>("JWT_ACCESS_SECRET") ||
      "default-access-secret-32-chars-long!";
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "Authorization token missing or invalid",
        HttpStatus.UNAUTHORIZED,
      );
    }

    const token = authHeader.substring(7);
    try {
      const payload = this.jwt.verify<JwtPayload>(token, {
        secret: this.accessSecret,
      });
      request.user = payload;
      return true;
    } catch {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        "Token expired or invalid",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
