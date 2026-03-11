/**
 * S3-compatible object storage adapter.
 * Set USE_MOCK_STORAGE=true for local dev (saves to local filesystem).
 */

import * as fs from "fs";
import * as path from "path";

export interface StorageProvider {
  upload(key: string, data: Buffer, mimeType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

// ─── S3 provider ─────────────────────────────────────────────────────────────

class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private endpoint: string;
  private accessKey: string;
  private secretKey: string;
  private region: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";
    this.endpoint = process.env.S3_ENDPOINT ?? "https://s3.amazonaws.com";
    this.accessKey = process.env.AWS_ACCESS_KEY_ID ?? "";
    this.secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";
    this.region = process.env.AWS_REGION ?? "us-east-1";

    if (!this.bucket || !this.accessKey || !this.secretKey) {
      throw new Error(
        "S3 configuration is incomplete. Set S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY",
      );
    }
  }

  async upload(key: string, data: Buffer, mimeType: string): Promise<string> {
    // Uses native fetch with AWS Signature V4 — simplified for illustration.
    // In production, use @aws-sdk/client-s3 for full SigV4 support.
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(data.length),
      },
      body: data,
    });
    if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
    return url;
  }

  async getSignedUrl(key: string): Promise<string> {
    // Return a plain URL for now — replace with proper presigned URL generation
    return `${this.endpoint}/${this.bucket}/${key}`;
  }

  async delete(key: string): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    await fetch(url, { method: "DELETE" });
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
