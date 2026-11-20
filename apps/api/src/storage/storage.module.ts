import { Global, Module } from "@nestjs/common";
import { LocalDiskStorageService } from "./storage.service.js";

@Global()
@Module({
  providers: [
    {
      provide: "STORAGE_SERVICE",
      useClass: LocalDiskStorageService,
    },
    LocalDiskStorageService,
  ],
  exports: ["STORAGE_SERVICE", LocalDiskStorageService],
})
export class StorageModule {}
