import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type {
  VideoGenerationOptions,
  VideoGenerationResult,
} from "./types";
import { applyKenBurnsEffect } from "./effects/ken-burns";

export class KenBurnsProvider {
  async generate(options: VideoGenerationOptions): Promise<VideoGenerationResult> {
    const {
      startFrameBase64,
      endFrameBase64,
      durationSec = 5,
      motionNotes,
    } = options;

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "ken-burns-"));
    const startFramePath = path.join(tempDir, "start.png");
    const endFramePath = path.join(tempDir, "end.png");
    const outputPath = path.join(tempDir, "output.mp4");

    try {
      // Decode base64 frames to files
      fs.writeFileSync(startFramePath, Buffer.from(startFrameBase64, "base64"));
      if (endFrameBase64) {
        fs.writeFileSync(endFramePath, Buffer.from(endFrameBase64, "base64"));
      }

      // Determine motion type from notes
      const motionType = this.parseMotionType(motionNotes);

      // Apply Ken Burns effect
      await applyKenBurnsEffect({
        startFrame: startFramePath,
        endFrame: endFrameBase64 ? endFramePath : undefined,
        output: outputPath,
        duration: durationSec,
        motionType,
      });

      // Read output video
      const videoBuffer = fs.readFileSync(outputPath);

      return {
        videoBuffer,
        mimeType: "video/mp4",
        durationSec,
        costUsd: 0, // Ken Burns is local computation, no API cost
        model: "ken-burns-fallback",
      };
    } finally {
      // Cleanup temp files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (err) {
        console.warn("[KenBurns] Failed to cleanup temp dir:", err);
      }
    }
  }

  private parseMotionType(
    motionNotes?: string
  ): "zoom-in" | "zoom-out" | "pan-right" | "pan-left" | "static" {
    if (!motionNotes) return "zoom-in";

    const notes = motionNotes.toLowerCase();

    if (notes.includes("zoom in") || notes.includes("closer")) {
      return "zoom-in";
    }
    if (notes.includes("zoom out") || notes.includes("reveal")) {
      return "zoom-out";
    }
    if (notes.includes("pan right") || notes.includes("move right")) {
      return "pan-right";
    }
    if (notes.includes("pan left") || notes.includes("move left")) {
      return "pan-left";
    }

    // Default to zoom in for dynamic scenes
    return "zoom-in";
  }
}
