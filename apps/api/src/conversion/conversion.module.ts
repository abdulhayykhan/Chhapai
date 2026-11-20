import { Global, Module } from "@nestjs/common";
import { ConversionService } from "./conversion.service.js";

@Global()
@Module({
  providers: [ConversionService],
  exports: [ConversionService],
})
export class ConversionModule {}
