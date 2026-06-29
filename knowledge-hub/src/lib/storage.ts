import { writeFile, mkdir, readFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadResult {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface StorageProvider {
  upload(file: Buffer, originalName: string, mimeType: string): Promise<UploadResult>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor() {
    this.basePath = process.env.STORAGE_LOCAL_PATH || "./uploads";
  }

  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    const ext = path.extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    const dir = path.resolve(this.basePath);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename);
    await writeFile(filePath, file);
    return {
      url: `/api/files/${filename}`,
      filename,
      originalName,
      mimeType,
      size: file.length,
    };
  }

  async getUrl(key: string): Promise<string> {
    return `/api/files/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(path.resolve(this.basePath), key);
    try {
      await unlink(filePath);
    } catch {
      // file may not exist
    }
  }

  async read(key: string): Promise<Buffer> {
    const filePath = path.join(path.resolve(this.basePath), key);
    return readFile(filePath);
  }
}

class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET || "";
    this.client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "",
        secretAccessKey: process.env.S3_SECRET_KEY || "",
      },
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
    });
  }

  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadResult> {
    const ext = path.extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: file,
        ContentType: mimeType,
      })
    );
    return {
      url: await this.getUrl(filename),
      filename,
      originalName,
      mimeType,
      size: file.length,
    };
  }

  async getUrl(key: string): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 3600 }
    );
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    );
  }
}

let storageInstance: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (!storageInstance) {
    const type = process.env.STORAGE_TYPE || "local";
    storageInstance =
      type === "s3" ? new S3StorageProvider() : new LocalStorageProvider();
  }
  return storageInstance;
}

export function getLocalStorage(): LocalStorageProvider | null {
  const storage = getStorage();
  return storage instanceof LocalStorageProvider ? storage : null;
}
