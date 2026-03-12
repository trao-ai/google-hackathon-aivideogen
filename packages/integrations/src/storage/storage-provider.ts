/**
 * S3-compatible object storage adapter.
 * Works with DigitalOcean Spaces, AWS S3, MinIO, etc.
 * Set USE_MOCK_STORAGE=true for local dev (saves to local filesystem).
 */

import * as fs from "fs";
import * as path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as awsGetSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// ─── S3 provider ─────────────────────────────────────────────────────────────

class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;
  private region: string;
  private prefix: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    this.endpoint = process.env.S3_ENDPOINT ?? "";
    this.region = process.env.AWS_REGION ?? "us-east-1";
    this.prefix = process.env.STORAGE_PREFIX ?? "";
    const accessKey = process.env.AWS_ACCESS_KEY_ID ?? "";
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";

    if (!this.bucket || !accessKey || !secretKey || !this.endpoint) {
      throw new Error(
        "S3 configuration is incomplete. Set S3_BUCKET, S3_ENDPOINT, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
      );
    }

    this.client = new S3Client({
      endpoint: this.endpoint,
      region: this.region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: false,
    });
  }

  /** Prepend the storage prefix (folder) to a key. */
  private fullKey(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  /** Public URL for an object (bucket-subdomain style used by DO Spaces). */
  private publicUrl(key: string): string {
    // e.g. https://trao-assets.sfo3.digitaloceanspaces.com/hackathon/projects/…
    const host = this.endpoint.replace("https://", "");
    return `https://${this.bucket}.${host}/${key}`;
  }

  async upload(key: string, data: Buffer, mimeType: string): Promise<string> {
    const objectKey = this.fullKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: data,
        ContentType: mimeType,
        ACL: "public-read",
      }),
    );
    return this.publicUrl(objectKey);
  }

  async download(key: string): Promise<Buffer> {
    const objectKey = this.fullKey(key);
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
    const stream = res.Body;
    if (!stream) throw new Error(`Empty response for key: ${objectKey}`);
    return Buffer.from(await stream.transformToByteArray());
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const objectKey = this.fullKey(key);
    return awsGetSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: expiresInSeconds },
    );
  }

  async delete(key: string): Promise<void> {
    const objectKey = this.fullKey(key);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Walk up from a starting directory to find the monorepo root (contains turbo.json). */
function findProjectRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "turbo.json"))) return dir;
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/** Resolve LOCAL_STORAGE_DIR to an absolute path anchored to the monorepo root. */
export function resolveStorageDir(): string {
  const configured = process.env.LOCAL_STORAGE_DIR;
  if (configured && path.isAbsolute(configured)) return configured;

  const root = findProjectRoot(__dirname);
  return path.join(root, configured ?? ".local-storage");
}

// ─── Local filesystem mock storage ──────────────────────────────────────────

class LocalStorageProvider implements StorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = resolveStorageDir();
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  async upload(key: string, data: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, key.replace(/\//g, "_"));
    fs.writeFileSync(filePath, data);
    // Return an API-served URL so the browser can fetch local files
    const fileName = key.replace(/\//g, "_");
    const apiBase = process.env.API_URL ?? "http://localhost:3001";
    return `${apiBase}/api/storage/${fileName}`;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key.replace(/\//g, "_"));
    return fs.readFileSync(filePath);
  }

  async getSignedUrl(key: string): Promise<string> {
    const fileName = key.replace(/\//g, "_");
    const apiBase = process.env.API_URL ?? "http://localhost:3001";
    return `${apiBase}/api/storage/${fileName}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key.replace(/\//g, "_"));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

export function createStorageProvider(): StorageProvider {
  if (process.env.USE_MOCK_STORAGE === "true")
    return new LocalStorageProvider();
  return new S3StorageProvider();
}
