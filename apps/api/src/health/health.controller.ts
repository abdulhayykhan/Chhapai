import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    let dbStatus = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = "disconnected";
    }

    return {
      status: dbStatus === "ok" ? "ok" : "degraded",
      db: dbStatus,
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }
}
