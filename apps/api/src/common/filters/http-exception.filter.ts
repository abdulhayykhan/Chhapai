import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";
import { ErrorCode } from "@chhapai/shared";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred";
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, unknown>;
        code =
          (resObj.code as string) ||
          (status === 401
            ? ErrorCode.UNAUTHORIZED
            : status === 429
              ? ErrorCode.RATE_LIMITED
              : ErrorCode.VALIDATION_ERROR);
        message = (resObj.message as string) || exception.message;
        details = resObj.details || resObj.error || undefined;
      }
    } else if (
      exception &&
      typeof exception === "object" &&
      "code" in exception
    ) {
      const errObj = exception as { code: string; message: string };
      if (errObj.code in ErrorCode) {
        code = errObj.code;
        message = errObj.message;
        if (code === ErrorCode.INVALID_STATE_TRANSITION) {
          status = HttpStatus.CONFLICT;
        } else if (code === ErrorCode.JOB_NOT_FOUND) {
          status = HttpStatus.NOT_FOUND;
        } else {
          status = HttpStatus.BAD_REQUEST;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
    }

    const errorPayload: ApiErrorResponse = {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    };

    response.status(status).json(errorPayload);
  }
}
