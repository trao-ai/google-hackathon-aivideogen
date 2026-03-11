"use strict";
/**
 * S3-compatible object storage adapter.
 * Set USE_MOCK_STORAGE=true for local dev (saves to local filesystem).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStorageProvider = createStorageProvider;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// ─── S3 provider ─────────────────────────────────────────────────────────────
class S3StorageProvider {
    constructor() {
        this.bucket = process.env.S3_BUCKET ?? "";
        this.endpoint = process.env.S3_ENDPOINT ?? "https://s3.amazonaws.com";
        this.accessKey = process.env.AWS_ACCESS_KEY_ID ?? "";
        this.secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? "";
        this.region = process.env.AWS_REGION ?? "us-east-1";
        if (!this.bucket || !this.accessKey || !this.secretKey) {
            throw new Error("S3 configuration is incomplete. Set S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY");
        }
    }
    async upload(key, data, mimeType) {
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
        if (!res.ok)
            throw new Error(`S3 upload failed: ${res.status}`);
        return url;
    }
    async getSignedUrl(key) {
        // Return a plain URL for now — replace with proper presigned URL generation
        return `${this.endpoint}/${this.bucket}/${key}`;
    }
    async delete(key) {
        const url = `${this.endpoint}/${this.bucket}/${key}`;
        await fetch(url, { method: "DELETE" });
    }
}
// ─── Local filesystem mock storage ──────────────────────────────────────────
class LocalStorageProvider {
    constructor() {
        this.baseDir =
            process.env.LOCAL_STORAGE_DIR ??
                path.join(process.cwd(), ".local-storage");
        fs.mkdirSync(this.baseDir, { recursive: true });
    }
    async upload(key, data) {
        const filePath = path.join(this.baseDir, key.replace(/\//g, "_"));
        fs.writeFileSync(filePath, data);
        return `local:///${filePath}`;
    }
    async getSignedUrl(key) {
        const filePath = path.join(this.baseDir, key.replace(/\//g, "_"));
        return `local:///${filePath}`;
    }
    async delete(key) {
        const filePath = path.join(this.baseDir, key.replace(/\//g, "_"));
        if (fs.existsSync(filePath))
            fs.unlinkSync(filePath);
    }
}
function createStorageProvider() {
    if (process.env.USE_MOCK_STORAGE === "true")
        return new LocalStorageProvider();
    return new S3StorageProvider();
}
//# sourceMappingURL=storage-provider.js.map