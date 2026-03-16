/**
 * Preview generation endpoint - combines scene clips + voiceover
 * for caption editing preview (before final render)
 */

import { Router } from "express";
import { prisma } from "@atlas/db";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { createStorageProvider, resolveStorageDir } from "@atlas/integrations";

const router = Router();
const execFileAsync = promisify(execFile);

/**
 * POST /api/projects/:projectId/preview
 * Generate a preview video by combining scene clips with voiceover
 */
router.post("/:projectId/preview", async (req, res) => {
  const { projectId } = req.params;

  try {
    console.log(`[preview] Generating preview for project ${projectId}`);

    // Fetch project with scenes and voiceover
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        scenes: {
          orderBy: { orderIndex: "asc" },
          include: { clip: true },
        },
        voiceovers: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check if we have scene clips
    const scenesWithClips = project.scenes.filter((s) => s.clip?.videoUrl);
    if (scenesWithClips.length === 0) {
      return res.status(400).json({
        error: "No scene clips available. Generate scene videos first.",
      });
    }

    // Check if we have voiceover
    const voiceover = project.voiceovers[0];
    if (!voiceover?.audioUrl) {
      return res.status(400).json({
        error: "No voiceover available. Generate voiceover first.",
      });
    }

    console.log(
      `[preview] Found ${scenesWithClips.length} scene clips and voiceover`,
    );

    // Create temp directory for processing
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "preview-"));

    try {
      // Download scene clips
      const clipPaths: string[] = [];
      for (const scene of scenesWithClips) {
        const clipUrl = scene.clip!.videoUrl!;
        const clipPath = await downloadFile(clipUrl, tmpDir, `clip-${scene.orderIndex}.mp4`);
        clipPaths.push(clipPath);
      }

      // Download voiceover
      const voPath = await downloadFile(voiceover.audioUrl, tmpDir, "voiceover.mp3");

      // Create concat file for FFmpeg
      const concatListPath = path.join(tmpDir, "clips.txt");
      const concatContent = clipPaths.map((p) => `file '${p}'`).join("\n");
      fs.writeFileSync(concatListPath, concatContent);

      // Combine clips with voiceover
      const outputPath = path.join(tmpDir, "preview.mp4");
      console.log(`[preview] Combining ${clipPaths.length} clips with voiceover`);

      await execFileAsync("ffmpeg", [
        "-f", "concat",
        "-safe", "0",
        "-i", concatListPath,
        "-i", voPath,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest", // Stop when shortest stream ends
        "-y",
        outputPath,
      ]);

      console.log(`[preview] Preview generated: ${outputPath}`);

      // Upload to storage
      const storage = createStorageProvider();
      const previewBuffer = fs.readFileSync(outputPath);
      const previewKey = `projects/${projectId}/preview-${Date.now()}.mp4`;
      const previewUrl = await storage.upload(previewKey, previewBuffer, "video/mp4");

      console.log(`[preview] Preview uploaded: ${previewKey}`);

      // Generate subtitle from voiceover segments
      let subtitleUrl: string | undefined;
      if (voiceover.segments && Array.isArray(voiceover.segments)) {
        const subtitlePath = generateSubtitleFile(voiceover.segments as any[], tmpDir);
        if (subtitlePath) {
          const subBuffer = fs.readFileSync(subtitlePath);
          const subKey = `projects/${projectId}/preview-subs-${Date.now()}.vtt`;
          subtitleUrl = await storage.upload(subKey, subBuffer, "text/vtt");
          console.log(`[preview] Subtitle uploaded: ${subKey}`);
        }
      }

      // Clean up temp files
      fs.rmSync(tmpDir, { recursive: true, force: true });

      res.json({
        videoUrl: previewUrl,
        subtitleUrl,
        message: "Preview generated successfully",
      });
    } catch (error) {
      // Clean up on error
      fs.rmSync(tmpDir, { recursive: true, force: true });
      throw error;
    }
  } catch (error) {
    console.error("[preview] Error generating preview:", error);
    res.status(500).json({
      error: "Failed to generate preview",
      details: (error as Error).message,
    });
  }
});

/**
 * Download file from URL or storage to local path
 */
async function downloadFile(
  url: string,
  destDir: string,
  filename: string,
): Promise<string> {
  const destPath = path.join(destDir, filename);

  // Handle local:/// URLs
  if (url.startsWith("local:///")) {
    const storageDir = resolveStorageDir();
    const fileName = url.replace("local:///", "").split("/").pop() ?? "";
    const sourcePath = path.join(storageDir, fileName);
    fs.copyFileSync(sourcePath, destPath);
    return destPath;
  }

  // Handle API-served URLs
  if (url.includes("/api/storage/")) {
    const storageDir = resolveStorageDir();
    const fileName = url.split("/api/storage/").pop() ?? "";
    const sourcePath = path.join(storageDir, fileName);
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      return destPath;
    }
  }

  // Handle S3 or remote URLs
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return destPath;
}

/**
 * Generate VTT subtitle file from voiceover segments
 */
function generateSubtitleFile(segments: any[], tmpDir: string): string | null {
  if (!segments || segments.length === 0) return null;

  const vttPath = path.join(tmpDir, "subtitles.vtt");
  let vttContent = "WEBVTT\n\n";

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const start = formatVTTTime(seg.startSec || 0);
    const end = formatVTTTime(seg.endSec || seg.startSec || 0);
    const text = seg.text || "";

    vttContent += `${i + 1}\n${start} --> ${end}\n${text}\n\n`;
  }

  fs.writeFileSync(vttPath, vttContent);
  return vttPath;
}

/**
 * Format seconds to VTT timestamp (HH:MM:SS.mmm)
 */
function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export default router;
