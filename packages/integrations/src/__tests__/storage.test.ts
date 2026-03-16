import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { resolveStorageDir, resolveUrlToLocalPath, createStorageProvider } from "../storage/storage-provider";

describe("createStorageProvider", () => {
  it("creates LocalStorageProvider when USE_MOCK_STORAGE=true", () => {
    process.env.USE_MOCK_STORAGE = "true";
    const provider = createStorageProvider();
    expect(provider).toBeDefined();
    expect(provider.upload).toBeDefined();
    expect(provider.download).toBeDefined();
    expect(provider.delete).toBeDefined();
    delete process.env.USE_MOCK_STORAGE;
  });

  it("throws when S3 config is incomplete and mock is not enabled", () => {
    delete process.env.USE_MOCK_STORAGE;
    delete process.env.S3_BUCKET;
    delete process.env.AWS_ACCESS_KEY_ID;
    expect(() => createStorageProvider()).toThrow("S3 configuration is incomplete");
  });
});

describe("LocalStorageProvider (via createStorageProvider)", () => {
  let provider: ReturnType<typeof createStorageProvider>;
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-test-"));
    process.env.USE_MOCK_STORAGE = "true";
    process.env.LOCAL_STORAGE_DIR = tmpDir;
    provider = createStorageProvider();
  });

  afterEach(() => {
    delete process.env.USE_MOCK_STORAGE;
    delete process.env.LOCAL_STORAGE_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("uploads and downloads a file", async () => {
    const data = Buffer.from("hello world");
    const url = await provider.upload("test/file.txt", data, "text/plain");
    expect(url).toContain("/api/storage/");

    const downloaded = await provider.download("test/file.txt");
    expect(downloaded.toString()).toBe("hello world");
  });

  it("deletes a file", async () => {
    const data = Buffer.from("to delete");
    await provider.upload("delete-me.txt", data, "text/plain");
    await provider.delete("delete-me.txt");

    await expect(provider.download("delete-me.txt")).rejects.toThrow();
  });

  it("getSignedUrl returns API URL", async () => {
    const url = await provider.getSignedUrl("some-key.png");
    expect(url).toContain("/api/storage/");
  });
});

describe("resolveStorageDir", () => {
  it("uses LOCAL_STORAGE_DIR env when set to absolute path", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-sd-"));
    process.env.LOCAL_STORAGE_DIR = tmpDir;
    expect(resolveStorageDir()).toBe(tmpDir);
    delete process.env.LOCAL_STORAGE_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("defaults to .local-storage relative to project root", () => {
    delete process.env.LOCAL_STORAGE_DIR;
    const dir = resolveStorageDir();
    expect(dir).toContain(".local-storage");
  });
});

describe("resolveUrlToLocalPath", () => {
  it("returns null for remote URLs", () => {
    expect(resolveUrlToLocalPath("https://example.com/image.png")).toBeNull();
  });

  it("resolves API storage URLs to local paths", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-url-"));
    process.env.LOCAL_STORAGE_DIR = tmpDir;
    const filePath = path.join(tmpDir, "test-file.png");
    fs.writeFileSync(filePath, "test");

    const resolved = resolveUrlToLocalPath("http://localhost:3001/api/storage/test-file.png");
    expect(resolved).toBe(filePath);

    delete process.env.LOCAL_STORAGE_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns null for non-existent storage files", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-url2-"));
    process.env.LOCAL_STORAGE_DIR = tmpDir;

    const resolved = resolveUrlToLocalPath("http://localhost:3001/api/storage/nonexistent.png");
    expect(resolved).toBeNull();

    delete process.env.LOCAL_STORAGE_DIR;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
