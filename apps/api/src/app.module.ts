import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { ConversionModule } from "./conversion/conversion.module.js";
import { TokenModule } from "./token/token.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { PublicModule } from "./public/public.module.js";
import { HealthModule } from "./health/health.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
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
  ],
})
export class AppModule {}
