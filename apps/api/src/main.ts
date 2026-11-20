import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter.js";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(",")
        : "*",
      credentials: true,
    },
  });

  // Security Headers
  app.use(helmet());

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Base API path
  app.setGlobalPrefix("api/v1", {
    exclude: ["health"],
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Chhapai API server running on port ${port}`);
}

bootstrap();
