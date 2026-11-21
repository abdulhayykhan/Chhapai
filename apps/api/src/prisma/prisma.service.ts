import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const dbUrl =
      process.env.DATABASE_URL ||
      "postgresql://postgres.zsnkjfpoyvipvxmdkwsf:ChhapaiSecure2026!@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";
    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
