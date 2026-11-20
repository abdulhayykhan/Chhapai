import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import { nanoid } from "nanoid";

export interface StorageService {
  save(
    buffer: Buffer,
    extension: string,
  ): Promise<{ fileKey: string; sizeBytes: number }>;
  get(fileKey: string): Promise<Buffer>;
  delete(fileKey: string): Promise<void>;
  exists(fileKey: string): Promise<boolean>;
  getFilePath(fileKey: string): string;
}

@Injectable()
export class LocalDiskStorageService implements StorageService {
  private readonly logger = new Logger(LocalDiskStorageService.name);
  private readonly storageDir: string;

  constructor(private readonly config: ConfigService) {
    this.storageDir = path.resolve(
      this.config.get<string>("STORAGE_PATH") || "./data/files",
    );
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (err) {
      this.logger.error(
        `Failed to create storage directory: ${this.storageDir}`,
        err,
      );
    }
  }

  getFilePath(fileKey: string): string {
    const safeKey = path.basename(fileKey);
    return path.join(this.storageDir, safeKey);
  }

  async save(
    buffer: Buffer,
    extension = ".pdf",
  ): Promise<{ fileKey: string; sizeBytes: number }> {
    await fs.mkdir(this.storageDir, { recursive: true });
    const cleanExt = extension.startsWith(".") ? extension : `.${extension}`;
    const fileKey = `${Date.now()}-${nanoid(16)}${cleanExt}`;
    const filePath = this.getFilePath(fileKey);

    await fs.writeFile(filePath, buffer);
    return {
      fileKey,
      sizeBytes: buffer.length,
    };
  }

  async get(fileKey: string): Promise<Buffer> {
    const filePath = this.getFilePath(fileKey);
    return await fs.readFile(filePath);
  }

  async delete(fileKey: string): Promise<void> {
    const filePath = this.getFilePath(fileKey);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        this.logger.warn(`Failed to delete file: ${fileKey}`, err);
      }
    }
  }

  async exists(fileKey: string): Promise<boolean> {
    const filePath = this.getFilePath(fileKey);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
