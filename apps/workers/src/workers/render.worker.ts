import { Worker, Job } from "bullmq";
import type { RedisOptions } from "bullmq";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { prisma, trackCost } from "@atlas/db";
import {
  createStorageProvider,
  resolveStorageDir,
  resolveUrlToLocalPath,
} from "@atlas/integrations";

const execFileAsync = promisify(execFile);

interface ClipInfo {
  localPath: string;
  clipDurationSec: number;
  targetDurationSec: number;
  hasAudio: boolean;
}

interface SceneTransition {
  fromPurpose: string;
  fromSceneType: string;
  toPurpose: string;
  toSceneType: string;
}

export class RenderWorker {
  private worker: Worker;

  constructor(connection: RedisOptions) {
    this.worker = new Worker("render", this.process.bind(this), {
      connection,
      concurrency: 1, // CPU-intensive — one at a time
    });
    this.worker.on("failed", (job, err) => {
      console.error(`[render] job ${job?.id} failed:`, err.message);
    });
  }

  private async process(
    job: Job<{ projectId: string; renderId: string }>,
  ): Promise<void> {
    const { projectId, renderId } = job.data;
    console.log(`[render] Starting render for project ${projectId}`);

    try {
      await prisma.render.update({
        where: { id: renderId },
        data: { status: "processing", step: "downloading_clips" },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "composition" },
      });

      // Fetch scenes with clips, ordered
      const scenes = await prisma.scene.findMany({
        where: { projectId },
        orderBy: { orderIndex: "asc" },
        include: { clip: true },
      });

      const scenesWithClips = scenes.filter((s) => s.clip !== null);
      if (scenesWithClips.length === 0) {
        throw new Error("No scene clips found. Generate videos first.");
      }

      // Fetch voiceover
      const voiceover = await prisma.voiceover.findFirst({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
      if (!voiceover) {
        throw new Error("No voiceover found. Generate voice first.");
      }

      // Resolve clip file paths — download remote URLs to temp files
      const clips: ClipInfo[] = [];
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-render-"));
      const downloadedPaths: string[] = []; // track for cleanup

      for (let i = 0; i < scenesWithClips.length; i++) {
        const scene = scenesWithClips[i];
        const clipUrl = scene.clip!.videoUrl;
        let localPath = resolveUrlToLocalPath(clipUrl);

        // If not resolvable locally, download from remote URL
        if (!localPath) {
          if (clipUrl.startsWith("http://") || clipUrl.startsWith("https://")) {
            const tmpClipPath = path.join(tmpDir, `clip-${i}.mp4`);
            console.log(
              `[render] Downloading clip ${i} from S3: ${clipUrl.slice(0, 80)}...`,
            );
            const res = await fetch(clipUrl);
            if (!res.ok)
              throw new Error(
                `Failed to download clip: ${res.status} ${clipUrl}`,
              );
            const buffer = Buffer.from(await res.arrayBuffer());
            fs.writeFileSync(tmpClipPath, buffer);
            localPath = tmpClipPath;
            downloadedPaths.push(tmpClipPath);
          } else {
            throw new Error(`Cannot resolve path for clip: ${clipUrl}`);
          }
        }

        const targetDuration = scene.narrationEndSec - scene.narrationStartSec;
        const hasAudio = await this.probeHasAudio(localPath);
        clips.push({
          localPath,
          clipDurationSec: scene.clip!.durationSec,
          targetDurationSec: Math.max(targetDuration, 0.5),
          hasAudio,
        });
      }
      const clipsWithAudio = clips.filter((c) => c.hasAudio).length;
      console.log(
        `[render] ${clipsWithAudio}/${clips.length} clips have audio tracks`,
      );

      // Resolve voiceover path — download from remote URL if needed
      let voiceoverPath = resolveUrlToLocalPath(voiceover.audioUrl);
      if (!voiceoverPath) {
        if (
          voiceover.audioUrl.startsWith("http://") ||
          voiceover.audioUrl.startsWith("https://")
        ) {
          const tmpVoPath = path.join(tmpDir, "voiceover.mp3");
          console.log(`[render] Downloading voiceover from S3...`);
          const res = await fetch(voiceover.audioUrl);
          if (!res.ok)
            throw new Error(`Failed to download voiceover: ${res.status}`);
          const buffer = Buffer.from(await res.arrayBuffer());
          fs.writeFileSync(tmpVoPath, buffer);
          voiceoverPath = tmpVoPath;
        } else {
          throw new Error(
            `Cannot resolve path for voiceover: ${voiceover.audioUrl}`,
          );
        }
      }

      // Output path for final render (tmpDir already created above for downloads)
      const outputPath = path.join(tmpDir, "final.mp4");

      try {
        // --- AI-generated sound effects for transitions ---
        await prisma.render.update({
          where: { id: renderId },
          data: { step: "generating_sfx" },
        });
        const sfxPaths: string[] = [];

        if (scenesWithClips.length > 1) {
          const transitions: SceneTransition[] = [];
          for (let i = 0; i < scenesWithClips.length - 1; i++) {
            transitions.push({
              fromPurpose: scenesWithClips[i].purpose,
              fromSceneType: scenesWithClips[i].sceneType,
              toPurpose: scenesWithClips[i + 1].purpose,
              toSceneType: scenesWithClips[i + 1].sceneType,
            });
          }

          // Use Gemini to describe ideal SFX for each transition
          const sfxDescriptions = await this.describeSFX(transitions);
          console.log(
            `[render] AI suggested ${sfxDescriptions.length} SFX descriptions`,
          );

          // Generate each SFX via ElevenLabs Sound Generation
          for (let i = 0; i < sfxDescriptions.length; i++) {
            const sfxPath = path.join(tmpDir, `sfx-${i}.mp3`);
            try {
              await this.generateSFX(sfxDescriptions[i], sfxPath);
              sfxPaths.push(sfxPath);
              console.log(
                `[render] SFX ${i + 1}/${sfxDescriptions.length}: "${sfxDescriptions[i].slice(0, 60)}"`,
              );
            } catch (err) {
              console.warn(
                `[render] SFX generation failed for transition ${i}, skipping:`,
                (err as Error).message,
              );
              sfxPaths.push(""); // empty = skip this transition
            }
          }
        }

        console.log(
          `[render] Composing ${clips.length} clips + voiceover (${voiceover.durationSec.toFixed(1)}s) + ${sfxPaths.filter(Boolean).length} SFX`,
        );

        await prisma.render.update({
          where: { id: renderId },
          data: { step: "composing" },
        });

        // Extract transition plans from scene data for FFmpeg
        const transitionPlans = scenesWithClips.map((s) =>
          s.transitionPlan as { durationSec?: number; ffmpegTransition?: string } | null,
        );

        await this.runFFmpeg({
          clips,
          voiceoverPath,
          sfxPaths,
          outputPath,
          transitionPlans,
        });

        // Read output and upload
        await prisma.render.update({
          where: { id: renderId },
          data: { step: "uploading" },
        });
        const outputBuffer = fs.readFileSync(outputPath);
        const storage = createStorageProvider();
        const storageKey = `projects/${projectId}/render-${Date.now()}.mp4`;
        const videoUrl = await storage.upload(
          storageKey,
          outputBuffer,
          "video/mp4",
        );

        const durationSec = await this.probeDuration(outputPath);

        await prisma.render.update({
          where: { id: renderId },
          data: {
            status: "complete",
            step: null,
            videoUrl,
            durationSec,
            costUsd: 0,
          },
        });

        await trackCost({
          projectId,
          stage: "render",
          vendor: "ffmpeg",
          units: durationSec,
          unitCost: 0,
          totalCostUsd: 0,
        });

        await prisma.project.update({
          where: { id: projectId },
          data: { status: "complete" },
        });

        console.log(
          `[render] Complete: ${durationSec.toFixed(1)}s video → ${videoUrl}`,
        );
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[render] Failed:`, errorMsg);

      await prisma.render
        .update({
          where: { id: renderId },
          data: { status: "failed", step: null, errorMsg },
        })
        .catch(() => {});

      await prisma.project
        .update({
          where: { id: projectId },
          data: { status: "composition_failed" },
        })
        .catch(() => {});

      throw err;
    }
  }

  // ─── AI SFX description via Gemini ──────────────────────────────────────────

  /**
   * Ask Gemini to describe the ideal short sound effect for each scene transition.
   * Returns an array of concise SFX text prompts for ElevenLabs Sound Generation.
   */
  private async describeSFX(transitions: SceneTransition[]): Promise<string[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn(
        "[render] No GEMINI_API_KEY, using default SFX descriptions",
      );
      return transitions.map(() => "smooth cinematic whoosh transition");
    }

    const transitionList = transitions
      .map(
        (t, i) =>
          `${i + 1}. FROM "${t.fromPurpose}" (${t.fromSceneType}) → TO "${t.toPurpose}" (${t.toSceneType})`,
      )
      .join("\n");

    const prompt = `You are a sound designer for an educational explainer video.

For each scene transition below, write a SHORT (5-10 word) description of the ideal transition sound effect.
The description will be fed to an AI sound generator, so be specific about the sound.

Examples of good descriptions:
- "gentle swoosh with soft chime"
- "dramatic bass drop with reverb"
- "quick digital glitch transition"
- "soft wind whoosh fading out"
- "energetic pop with sparkle effect"

Scene transitions:
${transitionList}

Respond with ONLY a JSON array of strings, one per transition. No markdown, no explanation.
Example: ["gentle swoosh", "dramatic hit"]`;

    const model = process.env.GEMINI_TEXT_MODEL ?? "gemini-1.5-flash";

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 500 },
          }),
        },
      );

      if (!res.ok) {
        console.warn(
          `[render] Gemini SFX description failed (${res.status}), using defaults`,
        );
        return transitions.map(() => "smooth cinematic whoosh transition");
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!text) {
        return transitions.map(() => "smooth cinematic whoosh transition");
      }

      // Parse JSON array from response (strip markdown fences if present)
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```/g, "")
        .trim();
      const descriptions = JSON.parse(cleaned) as string[];

      // Ensure we have the right number of descriptions
      while (descriptions.length < transitions.length) {
        descriptions.push("smooth cinematic whoosh transition");
      }
      return descriptions.slice(0, transitions.length);
    } catch (err) {
      console.warn("[render] Gemini SFX error:", (err as Error).message);
      return transitions.map(() => "smooth cinematic whoosh transition");
    }
  }

  // ─── ElevenLabs Sound Generation ────────────────────────────────────────────

  /**
   * Generate a short sound effect using ElevenLabs Sound Generation API
   * and save it to the given file path.
   */
  private async generateSFX(
    description: string,
    outputPath: string,
  ): Promise<void> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("ELEVENLABS_API_KEY is not set");
    }

    const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: description,
        duration_seconds: 1.5,
        prompt_influence: 0.5,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`ElevenLabs SFX error ${res.status}: ${err}`);
    }

    const audioBuffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outputPath, audioBuffer);
  }

  // ─── FFmpeg composition ─────────────────────────────────────────────────────

  /**
   * Build atempo filter chain for a given rate.
   * atempo accepts 0.5–100.0, so chain multiple filters for extreme rates.
   */
  private buildAtempoChain(rate: number): string {
    const filters: string[] = [];
    let remaining = rate;
    while (remaining < 0.5) {
      filters.push("atempo=0.5");
      remaining /= 0.5;
    }
    while (remaining > 100.0) {
      filters.push("atempo=100.0");
      remaining /= 100.0;
    }
    filters.push(`atempo=${remaining.toFixed(6)}`);
    return filters.join(",");
  }

  /**
   * Build and run the FFmpeg filter graph:
   * - Speed-adjust each clip's video AND audio to match narration duration
   * - Concatenate all clips (video only — audio mixed separately for control)
   * - Preserve original clip audio (SFX/ambient) at low volume
   * - Mix: clip audio (quiet) + voiceover (full) + transition SFX (medium)
   * - Output H.264 MP4
   */
  private async runFFmpeg(params: {
    clips: ClipInfo[];
    voiceoverPath: string;
    sfxPaths: string[]; // one per transition (clips.length - 1), empty string = skip
    outputPath: string;
    transitionPlans?: Array<{ durationSec?: number; ffmpegTransition?: string } | null>;
  }): Promise<void> {
    const { clips, voiceoverPath, sfxPaths, outputPath, transitionPlans } = params;
    const args: string[] = [];

    // --- Inputs ---
    // Clip inputs: indices 0 .. N-1
    for (const clip of clips) {
      args.push("-i", clip.localPath);
    }
    // Voiceover input: index N
    const voiceoverIdx = clips.length;
    args.push("-i", voiceoverPath);

    // SFX inputs: indices N+1, N+2, ... (only non-empty paths)
    const sfxInputMap: Array<{ inputIdx: number; transitionIdx: number }> = [];
    for (let i = 0; i < sfxPaths.length; i++) {
      if (sfxPaths[i]) {
        const inputIdx = clips.length + 1 + sfxInputMap.length;
        args.push("-i", sfxPaths[i]);
        sfxInputMap.push({ inputIdx, transitionIdx: i });
      }
    }

    // --- Filter graph ---
    const filterParts: string[] = [];

    // Smooth speed-adjust video for each clip to match narration duration
    // With per-scene Kling durations, ratios are small (e.g. 1.3x) so animation stays smooth
    for (let i = 0; i < clips.length; i++) {
      const speedFactor = clips[i].targetDurationSec / clips[i].clipDurationSec;
      console.log(
        `[render] Clip ${i}: ${clips[i].clipDurationSec.toFixed(1)}s → ${clips[i].targetDurationSec.toFixed(1)}s (${speedFactor.toFixed(2)}x)`,
      );
      filterParts.push(
        `[${i}:v]setpts=PTS*${speedFactor.toFixed(6)},` +
          `scale=1280:720:force_original_aspect_ratio=decrease,` +
          `pad=1280:720:(ow-iw)/2:(oh-ih)/2,` +
          `fps=30,format=yuv420p[v${i}]`,
      );
    }

    // Speed-adjust clip audio (or generate silence for clips without audio)
    for (let i = 0; i < clips.length; i++) {
      const atempoRate = clips[i].clipDurationSec / clips[i].targetDurationSec;
      if (clips[i].hasAudio) {
        // Speed-adjust and lower volume of original clip audio
        const atempoChain = this.buildAtempoChain(atempoRate);
        filterParts.push(`[${i}:a]${atempoChain},volume=0.25[ca${i}]`);
      } else {
        // No audio stream — generate silence matching target duration
        filterParts.push(
          `anullsrc=r=48000:cl=stereo[silence${i}];` +
            `[silence${i}]atrim=0:${clips[i].targetDurationSec.toFixed(3)}[ca${i}]`,
        );
      }
    }

    // Add crossfade transitions between video clips
    // xfade creates smooth dissolve/fade transitions instead of hard cuts
    // Uses transition plans from DB when available, otherwise defaults to 0.5s fade
    if (clips.length === 1) {
      // Single clip — no transitions needed
      filterParts.push(`[v0]copy[vout]`);
    } else {
      // Multiple clips — chain xfade transitions
      let offset = 0;

      for (let i = 0; i < clips.length - 1; i++) {
        const plan = transitionPlans?.[i];
        const transitionDuration = plan?.durationSec ?? 0.5;
        const xfadeType = plan?.ffmpegTransition ?? "fade";

        const inputA = i === 0 ? `[v${i}]` : `[vx${i - 1}]`;
        const inputB = `[v${i + 1}]`;
        const output = i === clips.length - 2 ? `[vout]` : `[vx${i}]`;

        // Offset is when the second clip should start (minus transition duration for overlap)
        offset += clips[i].targetDurationSec - transitionDuration;

        filterParts.push(
          `${inputA}${inputB}xfade=transition=${xfadeType}:duration=${transitionDuration}:offset=${offset.toFixed(3)}${output}`,
        );
      }
    }

    // Concatenate clip audio streams separately
    const concatAudioInputs = clips.map((_, i) => `[ca${i}]`).join("");
    filterParts.push(
      `${concatAudioInputs}concat=n=${clips.length}:v=0:a=1[clipaudio]`,
    );

    // Build final audio mix: clip audio + voiceover + transition SFX
    const audioInputLabels: string[] = [`[${voiceoverIdx}:a]`, "[clipaudio]"];
    let mixCount = 2;

    if (sfxInputMap.length > 0) {
      // Calculate cumulative timestamps for each transition
      const transitionTimestamps: number[] = [];
      let cursor = 0;
      for (let i = 0; i < clips.length - 1; i++) {
        cursor += clips[i].targetDurationSec;
        transitionTimestamps.push(cursor);
      }

      // Create delayed SFX for each transition
      for (let i = 0; i < sfxInputMap.length; i++) {
        const { inputIdx, transitionIdx } = sfxInputMap[i];
        const timestamp = transitionTimestamps[transitionIdx];
        const delayMs = Math.max(0, Math.round((timestamp - 0.5) * 1000));
        filterParts.push(
          `[${inputIdx}:a]adelay=${delayMs}|${delayMs},volume=0.5[sfx${i}]`,
        );
        audioInputLabels.push(`[sfx${i}]`);
        mixCount++;
      }
    }

    // amix with normalize=0 keeps each input at its set volume
    const allAudioLabels = audioInputLabels.join("");
    filterParts.push(
      `${allAudioLabels}amix=inputs=${mixCount}:duration=longest:dropout_transition=0:normalize=0[aout]`,
    );

    const filterComplex = filterParts.join(";\n");

    args.push(
      "-filter_complex",
      filterComplex,
      "-map",
      "[vout]",
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-shortest",
      "-y",
      outputPath,
    );

    console.log(`[render] FFmpeg filter graph:\n${filterComplex}`);

    const { stderr } = await execFileAsync("ffmpeg", args, {
      timeout: 5 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });

    const lines = stderr.split("\n").filter(Boolean);
    console.log(`[render] FFmpeg done — ${lines.slice(-2).join(" | ")}`);
  }

  /** Check if a media file has an audio stream. */
  private async probeHasAudio(filePath: string): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v",
        "quiet",
        "-select_streams",
        "a",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        filePath,
      ]);
      return stdout.trim().length > 0;
    } catch {
      return false;
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
      console.warn("[render] ffprobe failed, returning 0 duration");
      return 0;
    }
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
