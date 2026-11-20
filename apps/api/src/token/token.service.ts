import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { toZonedTime, format } from "date-fns-tz";

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  public static readonly TIMEZONE = "Asia/Karachi";

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns current calendar date in Asia/Karachi as a UTC midnight Date object for @db.Date storage.
   */
  getTodayDateInKarachi(): Date {
    const now = new Date();
    const zoned = toZonedTime(now, TokenService.TIMEZONE);
    const dateString = format(zoned, "yyyy-MM-dd", {
      timeZone: TokenService.TIMEZONE,
    });
    return new Date(`${dateString}T00:00:00.000Z`);
  }

  /**
   * Formats a sequence number into a 3+ digit token label: e.g. 1 -> #001, 47 -> #047.
   */
  formatTokenLabel(seq: number): string {
    return `#${seq.toString().padStart(3, "0")}`;
  }

  /**
   * Calculates next token sequence for a given shop today.
   */
  async getNextToken(
    shopId: string,
    tokenDate?: Date,
  ): Promise<{ tokenDate: Date; tokenSeq: number; tokenLabel: string }> {
    const targetDate = tokenDate || this.getTodayDateInKarachi();

    // Find current highest sequence for this shop today
    const latestJob = await this.prisma.printJob.findFirst({
      where: {
        shopId,
        tokenDate: targetDate,
      },
      orderBy: {
        tokenSeq: "desc",
      },
      select: {
        tokenSeq: true,
      },
    });

    const tokenSeq = (latestJob?.tokenSeq ?? 0) + 1;
    const tokenLabel = this.formatTokenLabel(tokenSeq);

    return {
      tokenDate: targetDate,
      tokenSeq,
      tokenLabel,
    };
  }
}
