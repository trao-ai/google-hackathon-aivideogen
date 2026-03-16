import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { prisma } from "@atlas/db";
import {
  createStorageProvider,
  resolveUrlToLocalPath,
} from "@atlas/integrations";

const execFileAsync = promisify(execFile);

interface ExportJobData {
  renderId: string;
  exportId: string;
  format: "mp4" | "mov" | "webm";
  resolution: "720p" | "1080p" | "4k";
  quality: "standard" | "high" | "ultra";
}

const CODEC_CONFIG: Record<
  string,
  { video: string; audio: string; ext: string; mime: string }
> = {
  mp4: { video: "libx264", audio: "aac", ext: "mp4", mime: "video/mp4" },
  mov: { video: "libx264", audio: "aac", ext: "mov", mime: "video/quicktime" },
  webm: {
    video: "libvpx-vp9",
    audio: "libopus",
    ext: "webm",
    mime: "video/webm",
  },
};

const QUALITY_PRESETS: Record<
  string,
  { crf: number; preset: string; audioBitrate: string }
> = {
  standard: { crf: 23, preset: "fast", audioBitrate: "128k" },
  high: { crf: 18, preset: "medium", audioBitrate: "192k" },
  ultra: { crf: 12, preset: "slow", audioBitrate: "320k" },
};

const RESOLUTION_MAP: Record<string, { w: number; h: number }> = {
  "720p": { w: 1280, h: 720 },
  "1080p": { w: 1920, h: 1080 },
  "4k": { w: 3840, h: 2160 },
};

export class ExportWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("export", this.process.bind(this), {
      connection,
      concurrency: 1,
      lockDuration: 10 * 60 * 1000, // 10 minutes — FFmpeg transcodes can be slow
      stalledInterval: 5 * 60 * 1000, // Check stalled every 5 minutes
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[export] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(job: Job<ExportJobData>): Promise<void> {
    const { renderId, exportId, format, resolution, quality } = job.data;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-export-"));

    try {
      // Mark as processing
      await prisma.exportVariant.update({
        where: { id: exportId },
        data: { status: "processing", step: "downloading" },
      });

      // Get render record
      const render = await prisma.render.findUnique({
        where: { id: renderId },
      });
      if (!render?.videoUrl) {
        throw new Error("Render has no video URL");
      }

      // Download source video
      const inputPath = path.join(tmpDir, "source.mp4");
      const localPath = resolveUrlToLocalPath(render.videoUrl);
      if (localPath) {
        fs.copyFileSync(localPath, inputPath);
      } else {
        const storage = createStorageProvider();
        const key = this.extractStorageKey(render.videoUrl);
        const buffer = await storage.download(key);
        fs.writeFileSync(inputPath, buffer);
      }

      console.log(`[export] Downloaded source → ${inputPath}`);

      // Detect original dimensions to preserve aspect ratio
      const { width: srcW, height: srcH } = await this.probeResolution(
        inputPath,
      );
      const isPortrait = srcH > srcW;

      // Build output path
      const codec = CODEC_CONFIG[format];
      const qualityPreset = QUALITY_PRESETS[quality];
      const targetRes = RESOLUTION_MAP[resolution];

      // Determine target dimensions preserving aspect ratio
      let outW: number;
      let outH: number;
      if (isPortrait) {
        outH = targetRes.w; // e.g. 1920 for 1080p portrait
        outW = targetRes.h; // e.g. 1080
      } else {
        outW = targetRes.w;
        outH = targetRes.h;
      }

      const outputPath = path.join(tmpDir, `output.${codec.ext}`);

      // Update step
      await prisma.exportVariant.update({
        where: { id: exportId },
        data: { step: "transcoding" },
      });

      // Build FFmpeg args
      const args: string[] = [
        "-y",
        "-i",
        inputPath,
        "-vf",
        `scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2`,
        "-c:v",
        codec.video,
        "-c:a",
        codec.audio,
      ];

      // Format-specific args
      if (format === "webm") {
        // VP9 uses -b:v 0 with CRF for quality mode
        args.push("-b:v", "0", "-crf", String(qualityPreset.crf));
        args.push("-b:a", qualityPreset.audioBitrate);
        args.push("-row-mt", "1"); // Enable row-based multithreading for VP9
      } else {
        // H.264 for MP4/MOV
        args.push(
          "-preset",
          qualityPreset.preset,
          "-crf",
          String(qualityPreset.crf),
        );
        args.push("-b:a", qualityPreset.audioBitrate);
        if (format === "mp4") {
          args.push("-movflags", "+faststart");
        }
      }

      args.push(outputPath);

      console.log(`[export] Transcoding: ${format} ${resolution} ${quality}`);
      // Extend lock before long FFmpeg operation to prevent stall detection
      await job.extendLock(job.token!, 10 * 60 * 1000);
      const { stderr } = await execFileAsync("ffmpeg", args, {
        timeout: 10 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
      });
      const lines = stderr.split("\n").filter(Boolean);
      console.log(`[export] FFmpeg done — ${lines.slice(-2).join(" | ")}`);

      // Upload
      await prisma.exportVariant.update({
        where: { id: exportId },
        data: { step: "uploading" },
      });

      const outputBuffer = fs.readFileSync(outputPath);
      const fileSizeBytes = outputBuffer.length;
      const storage = createStorageProvider();
      const storageKey = `projects/${render.projectId}/export-${Date.now()}.${codec.ext}`;
      const videoUrl = await storage.upload(
        storageKey,
        outputBuffer,
        codec.mime,
      );

      const durationSec = await this.probeDuration(outputPath);

      await prisma.exportVariant.update({
        where: { id: exportId },
        data: {
          status: "complete",
          step: null,
          videoUrl,
          durationSec,
          fileSizeBytes: BigInt(fileSizeBytes),
        },
      });

      console.log(
        `[export] Complete → ${videoUrl} (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB)`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[export] Failed:`, msg);
      await prisma.exportVariant.update({
        where: { id: exportId },
        data: { status: "failed", step: null, errorMsg: msg },
      });
    } finally {
      // Cleanup temp files
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  private extractStorageKey(url: string): string {
    // Extract the key from a storage URL
    // e.g. https://bucket.endpoint/prefix/projects/xxx/render-123.mp4 → projects/xxx/render-123.mp4
    const match = url.match(/projects\/.+$/);
    return match ? match[0] : url;
  }

  private async probeResolution(
    filePath: string,
  ): Promise<{ width: number; height: number }> {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "quiet",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height",
        "-of",
        "csv=p=0:s=x",
        filePath,
      ]);
      const [w, h] = stdout.trim().split("x").map(Number);
      return { width: w || 1280, height: h || 720 };
    } catch {
      return { width: 1280, height: 720 };
    }
  }

  private async probeDuration(filePath: string): Promise<number> {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "quiet",
        "-show_entries",
        "format=duration",
        "-of",
        "csv=p=0",
        filePath,
      ]);
      return parseFloat(stdout.trim()) || 0;
    } catch {
      return 0;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
