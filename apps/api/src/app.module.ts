import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { ConversionModule } from "./conversion/conversion.module.js";
import { TokenModule } from "./token/token.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { PublicModule } from "./public/public.module.js";
import { HealthModule } from "./health/health.module.js";
import { RealtimeModule } from "./realtime/realtime.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { CronModule } from "./cron/cron.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60000,
        limit: 100,
      },
      {
        name: "login",
        ttl: 60000,
        limit: 5,
      },
      {
        name: "uploads",
        ttl: 3600000,
        limit: 10,
      },
      {
        name: "jobs",
        ttl: 3600000,
        limit: 20,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    StorageModule,
    ConversionModule,
    TokenModule,
    AuthModule,
    PublicModule,
    HealthModule,
    RealtimeModule,
    AdminModule,
    CronModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
