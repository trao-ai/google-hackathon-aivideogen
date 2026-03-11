/**
 * S3-compatible object storage adapter.
 * Set USE_MOCK_STORAGE=true for local dev (saves to local filesystem).
 */
export interface StorageProvider {
    upload(key: string, data: Buffer, mimeType: string): Promise<string>;
    getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
    delete(key: string): Promise<void>;
}
export declare function createStorageProvider(): StorageProvider;
//# sourceMappingURL=storage-provider.d.ts.map