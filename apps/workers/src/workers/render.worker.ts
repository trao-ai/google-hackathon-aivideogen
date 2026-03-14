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

interface SceneAudioInfo {
  purpose: string;
  sceneType: string;
  motionNotes: string;
  durationSec: number;
}

interface AudioDesign {
  ambient: string;
  transition: string | null;
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
    job: Job<{ projectId: string; renderId: string; durationLimitSec?: number }>,
  ): Promise<void> {
    const { projectId, renderId, durationLimitSec } = job.data;
    console.log(
      `[render] Starting render for project ${projectId}` +
        (durationLimitSec ? ` (test mode: ${durationLimitSec}s limit)` : ""),
    );

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

      let scenesWithClips = scenes.filter((s) => s.clip !== null);
      if (scenesWithClips.length === 0) {
        throw new Error("No scene clips found. Generate videos first.");
      }

      // Apply duration limit — only include scenes that start before the cutoff
      if (durationLimitSec) {
        const before = scenesWithClips.length;
        scenesWithClips = scenesWithClips.filter(
          (s) => s.narrationStartSec < durationLimitSec,
        );
        console.log(
          `[render] Duration limit ${durationLimitSec}s: using ${scenesWithClips.length}/${before} scenes`,
        );
      }

      console.log(`[render] Found ${scenesWithClips.length}/${scenes.length} scenes with clips`);
      for (const s of scenesWithClips) {
        const narDur = s.narrationEndSec - s.narrationStartSec;
        console.log(
          `[render]   Scene ${s.orderIndex}: narration ${s.narrationStartSec.toFixed(1)}s-${s.narrationEndSec.toFixed(1)}s (${narDur.toFixed(1)}s), clip=${s.clip!.durationSec.toFixed(1)}s`,
        );
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
        // --- AI-generated audio design (ambient + transition SFX) ---
        await prisma.render.update({
          where: { id: renderId },
          data: { step: "generating_sfx" },
        });

        const sceneAudioInfos: SceneAudioInfo[] = scenesWithClips.map((s) => ({
          purpose: s.purpose,
          sceneType: s.sceneType,
          motionNotes: s.motionNotes,
          durationSec: s.narrationEndSec - s.narrationStartSec,
        }));

        const audioDesigns = await this.describeAudioDesign(sceneAudioInfos);
        console.log(
          `[render] Audio design: ${audioDesigns.length} scenes, ${audioDesigns.filter((d) => d.transition).length} transitions`,
        );

        // Generate ambient sounds (one per scene) and transition SFX
        const ambientPaths: string[] = [];
        const transitionSfxPaths: string[] = [];

        for (let i = 0; i < audioDesigns.length; i++) {
          const design = audioDesigns[i];
          const sceneDur = sceneAudioInfos[i].durationSec;

          // Ambient sound for this scene
          const ambientPath = path.join(tmpDir, `ambient-${i}.mp3`);
          try {
            await this.generateSFX(
              design.ambient,
              ambientPath,
              Math.min(sceneDur, 10),
              0.3, // subtle prompt influence
            );
            ambientPaths.push(ambientPath);
            console.log(
              `[render] Ambient ${i}: "${design.ambient.slice(0, 50)}" (${Math.min(sceneDur, 10).toFixed(1)}s)`,
            );
          } catch (err) {
            console.warn(
              `[render] Ambient ${i} failed, skipping: ${(err as Error).message}`,
            );
            ambientPaths.push("");
          }

          // Transition SFX (only if Gemini recommended one and not last scene)
          if (design.transition && i < audioDesigns.length - 1) {
            const transPath = path.join(tmpDir, `transition-${i}.mp3`);
            try {
              await this.generateSFX(design.transition, transPath, 1.0, 0.3);
              transitionSfxPaths.push(transPath);
              console.log(
                `[render] Transition ${i}: "${design.transition.slice(0, 50)}"`,
              );
            } catch (err) {
              console.warn(
                `[render] Transition ${i} failed, skipping: ${(err as Error).message}`,
              );
              transitionSfxPaths.push("");
            }
          } else {
            transitionSfxPaths.push(""); // clean cut — no transition SFX
          }
        }

        const ambientCount = ambientPaths.filter(Boolean).length;
        const transCount = transitionSfxPaths.filter(Boolean).length;
        console.log(
          `[render] Composing ${clips.length} clips + voiceover (${voiceover.durationSec.toFixed(1)}s) + ${ambientCount} ambient + ${transCount} transitions`,
        );

        await prisma.render.update({
          where: { id: renderId },
          data: { step: "composing" },
        });

        // Extract transition plans from scene data for FFmpeg
        const transitionPlans = scenesWithClips.map((s) =>
          s.transitionPlan as { durationSec?: number; ffmpegTransition?: string } | null,
        );

        // Determine the voiceover time range from the scenes being rendered
        const voTrimStartSec = scenesWithClips[0].narrationStartSec;
        const voTrimEndSec = scenesWithClips[scenesWithClips.length - 1].narrationEndSec;

        // Find ALL voiceover segments that overlap with the scene time range
        const allSegments = (voiceover.segments as Array<{
          sectionId?: string;
          text: string;
          startSec: number;
          endSec: number;
          words?: Array<{ word: string; start: number; end: number }>;
        }>) ?? [];

        const relevantSegments = allSegments.filter(
          (seg) => seg.endSec > voTrimStartSec && seg.startSec < voTrimEndSec,
        );

        const hasWordTimestamps = relevantSegments.some((s) => s.words && s.words.length > 0);
        console.log(
          `[render] Voiceover trim: ${voTrimStartSec.toFixed(1)}-${voTrimEndSec.toFixed(1)}s ` +
          `(${relevantSegments.length}/${allSegments.length} segments, word timestamps: ${hasWordTimestamps})`,
        );

        // Generate subtitles from voiceover segments
        let subtitlePath: string | undefined;
        if (relevantSegments.length > 0) {
          subtitlePath = this.generateSubtitleFile({
            segments: relevantSegments,
            voTrimStartSec,
            voTrimEndSec,
            outputPath: path.join(tmpDir, "subtitles.ass"),
          });
        } else {
          console.warn("[render] No matching voiceover segments found, skipping subtitles");
        }

        await this.runFFmpeg({
          clips,
          voiceoverPath,
          ambientPaths,
          transitionSfxPaths,
          outputPath,
          transitionPlans,
          voTrimStartSec,
          voTrimEndSec,
          subtitlePath,
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

        // Upload subtitle file if generated
        let subtitleUrl: string | undefined;
        if (subtitlePath && fs.existsSync(subtitlePath)) {
          const subBuffer = fs.readFileSync(subtitlePath);
          const subKey = `projects/${projectId}/subtitles-${Date.now()}.ass`;
          subtitleUrl = await storage.upload(subKey, subBuffer, "text/plain");
          console.log(`[render] Subtitles uploaded → ${subKey}`);
        }

        await prisma.render.update({
          where: { id: renderId },
          data: {
            status: "complete",
            step: null,
            videoUrl,
            durationSec,
            costUsd: 0,
            ...(subtitleUrl ? { subtitleUrl } : {}),
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

  // ─── AI Audio Design via OpenAI ─────────────────────────────────────────────

  /**
   * Ask OpenAI to design ambient sounds per scene + transition SFX where natural.
   * Returns one AudioDesign per scene with ambient description and optional transition.
   */
  private async describeAudioDesign(scenes: SceneAudioInfo[]): Promise<AudioDesign[]> {
    const defaultDesigns: AudioDesign[] = scenes.map((s) => ({
      ambient: this.defaultAmbientForType(s.sceneType),
      transition: null,
    }));

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn("[render] No OPENAI_API_KEY, using default audio designs");
      return defaultDesigns;
    }

    const sceneList = scenes
      .map(
        (s, i) =>
          `${i + 1}. Purpose: "${s.purpose}" | Type: ${s.sceneType} | Duration: ${s.durationSec.toFixed(1)}s | Motion: "${s.motionNotes.slice(0, 100)}"`,
      )
      .join("\n");

    const prompt = `You are a sound designer for a Kurzgesagt-style educational explainer video.

CRITICAL: All sounds must be SUBTLE, SOFT, and NON-JARRING. Think gentle background textures, not aggressive sound effects. The voiceover is the star — sound design exists to create warm atmosphere, not to distract or startle. Avoid harsh, loud, sudden, or alarming sounds. Every sound should feel warm, organic, and cinematic.

For each scene, suggest:
1. "ambient" — a subtle, warm background sound/texture matching the scene content (5-10 words). These play softly under narration.
   Examples: "soft humming laboratory equipment", "gentle wind through open field", "quiet digital data processing beeps", "warm cozy fireplace crackling"
2. "transition" — a very subtle, soft transition SFX to the NEXT scene, OR null if a clean cut sounds better.
   Use null for MOST transitions. Only add a transition SFX for major topic changes or dramatic reveals. When used, keep it extremely gentle (soft whoosh, quiet chime, gentle fade). Never use harsh or sudden sounds.
   Examples: "gentle soft whoosh", "quiet chime fade", null

Scene list:
${sceneList}

Respond with ONLY a JSON array. No markdown, no explanation.
Example: [{"ambient":"soft lab hum","transition":"gentle swoosh"},{"ambient":"nature wind","transition":null}]`;

    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        console.warn(`[render] OpenAI audio design failed (${res.status}), using defaults`);
        return defaultDesigns;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) return defaultDesigns;

      const cleaned = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      const designs = JSON.parse(cleaned) as AudioDesign[];

      // Pad with defaults if model returned fewer
      while (designs.length < scenes.length) {
        designs.push(defaultDesigns[designs.length]);
      }
      console.log(`[render] OpenAI audio design: ${designs.length} scenes designed`);
      return designs.slice(0, scenes.length);
    } catch (err) {
      console.warn("[render] OpenAI audio design error:", (err as Error).message);
      return defaultDesigns;
    }
  }

  /** Sensible default ambient sound per scene type when Gemini is unavailable. */
  private defaultAmbientForType(sceneType: string): string {
    const defaults: Record<string, string> = {
      character_explanation: "soft warm room tone ambience",
      map_scene: "gentle wind atmospheric background",
      infographic: "subtle digital interface soft beeps",
      comparison: "quiet neutral room tone hum",
      metaphor: "ethereal ambient pad texture",
      timeline: "soft ticking clock mechanism",
      reaction: "warm emotional ambient tone",
      dramatic_reveal: "building tension low frequency hum",
      cta: "uplifting bright ambient sparkle",
    };
    return defaults[sceneType] ?? "soft neutral ambient background tone";
  }

  // ─── ElevenLabs Sound Generation ────────────────────────────────────────────

  /**
   * Generate a short sound effect using ElevenLabs Sound Generation API
   * and save it to the given file path.
   */
  private async generateSFX(
    description: string,
    outputPath: string,
    durationSeconds = 1.5,
    promptInfluence = 0.5,
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
        duration_seconds: durationSeconds,
        prompt_influence: promptInfluence,
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

  /** Maximum slowdown factor before freeze-frame padding kicks in */
  private static readonly MAX_SLOWDOWN = 2.0;

  /**
   * Build and run the FFmpeg filter graph:
   * - Speed-adjust each clip's video AND audio to match narration duration
   * - Concatenate clips with xfade transitions
   * - Burn in ASS subtitles if provided
   * - Sidechain-compress clip audio + SFX against voiceover (auto-ducking)
   * - Output H.264 MP4
   */
  private async runFFmpeg(params: {
    clips: ClipInfo[];
    voiceoverPath: string;
    ambientPaths: string[];
    transitionSfxPaths: string[];
    outputPath: string;
    transitionPlans?: Array<{ durationSec?: number; ffmpegTransition?: string } | null>;
    voTrimStartSec: number;
    voTrimEndSec: number;
    subtitlePath?: string;
  }): Promise<void> {
    const { clips, voiceoverPath, ambientPaths, transitionSfxPaths, outputPath, transitionPlans, voTrimStartSec, voTrimEndSec, subtitlePath } = params;
    const args: string[] = [];

    // --- Inputs ---
    // Clip inputs: indices 0 .. N-1
    for (const clip of clips) {
      args.push("-i", clip.localPath);
    }
    // Voiceover input: index N
    const voiceoverIdx = clips.length;
    args.push("-i", voiceoverPath);

    // Ambient inputs: indices N+1, N+2, ... (only non-empty paths)
    let nextInputIdx = clips.length + 1;
    const ambientInputMap: Array<{ inputIdx: number; sceneIdx: number }> = [];
    for (let i = 0; i < ambientPaths.length; i++) {
      if (ambientPaths[i]) {
        args.push("-i", ambientPaths[i]);
        ambientInputMap.push({ inputIdx: nextInputIdx, sceneIdx: i });
        nextInputIdx++;
      }
    }

    // Transition SFX inputs: after ambient inputs (only non-empty paths)
    const transitionInputMap: Array<{ inputIdx: number; transitionIdx: number }> = [];
    for (let i = 0; i < transitionSfxPaths.length; i++) {
      if (transitionSfxPaths[i]) {
        args.push("-i", transitionSfxPaths[i]);
        transitionInputMap.push({ inputIdx: nextInputIdx, transitionIdx: i });
        nextInputIdx++;
      }
    }

    // --- Filter graph ---
    const filterParts: string[] = [];
    const MAX_SLOW = RenderWorker.MAX_SLOWDOWN;

    // Speed-adjust video for each clip, capped at MAX_SLOWDOWN
    // Beyond cap: slow-motion the clip to max then freeze last frame for remaining time
    for (let i = 0; i < clips.length; i++) {
      const rawFactor = clips[i].targetDurationSec / clips[i].clipDurationSec;
      const cappedFactor = Math.min(rawFactor, MAX_SLOW);
      const slowedDuration = clips[i].clipDurationSec * cappedFactor;
      const padSec = Math.max(0, clips[i].targetDurationSec - slowedDuration);

      console.log(
        `[render] Clip ${i}: ${clips[i].clipDurationSec.toFixed(1)}s → target ${clips[i].targetDurationSec.toFixed(1)}s | raw=${rawFactor.toFixed(2)}x, capped=${cappedFactor.toFixed(2)}x` +
          (padSec > 0 ? `, freeze-pad=${padSec.toFixed(1)}s` : ""),
      );

      if (padSec > 0.01) {
        // Slow down video by capped factor, then freeze last frame for remaining time
        filterParts.push(
          `[${i}:v]setpts=PTS*${cappedFactor.toFixed(6)},` +
            `tpad=stop_mode=clone:stop_duration=${padSec.toFixed(3)},` +
            `scale=1280:720:force_original_aspect_ratio=decrease,` +
            `pad=1280:720:(ow-iw)/2:(oh-ih)/2,` +
            `fps=30,format=yuv420p[v${i}]`,
        );
      } else {
        filterParts.push(
          `[${i}:v]setpts=PTS*${cappedFactor.toFixed(6)},` +
            `scale=1280:720:force_original_aspect_ratio=decrease,` +
            `pad=1280:720:(ow-iw)/2:(oh-ih)/2,` +
            `fps=30,format=yuv420p[v${i}]`,
        );
      }
    }

    // Speed-adjust clip audio (capped) or generate silence
    for (let i = 0; i < clips.length; i++) {
      const rawFactor = clips[i].targetDurationSec / clips[i].clipDurationSec;
      const cappedFactor = Math.min(rawFactor, MAX_SLOW);
      const slowedDuration = clips[i].clipDurationSec * cappedFactor;
      const padSec = Math.max(0, clips[i].targetDurationSec - slowedDuration);
      const atempoRate = 1.0 / cappedFactor; // inverse for audio speed

      if (clips[i].hasAudio) {
        const atempoChain = this.buildAtempoChain(atempoRate);
        if (padSec > 0.01) {
          // Slow audio then concat with silence for the freeze-frame portion
          filterParts.push(
            `[${i}:a]${atempoChain},volume=0.25[ca_raw${i}];` +
              `anullsrc=r=48000:cl=stereo[spad${i}];` +
              `[spad${i}]atrim=0:${padSec.toFixed(3)}[spad_t${i}];` +
              `[ca_raw${i}][spad_t${i}]concat=n=2:v=0:a=1[ca${i}]`,
          );
        } else {
          filterParts.push(`[${i}:a]${atempoChain},volume=0.25[ca${i}]`);
        }
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

    // ─── Subtitle burn-in ───────────────────────────────────────────────────
    // If subtitle file is provided, burn it into the video via ASS filter
    if (subtitlePath) {
      const escapedPath = subtitlePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "'\\''");
      filterParts.push(`[vout]ass='${escapedPath}'[vfinal]`);
    } else {
      filterParts.push(`[vout]copy[vfinal]`);
    }

    // ─── Audio: concatenate clip audio ────────────────────────────────────
    const concatAudioInputs = clips.map((_, i) => `[ca${i}]`).join("");
    filterParts.push(
      `${concatAudioInputs}concat=n=${clips.length}:v=0:a=1[clipaudio]`,
    );

    // Set clip audio base volume (higher than before — ducking handles conflicts)
    filterParts.push(`[clipaudio]volume=0.35[clipaudio_vol]`);

    // ─── Audio: trim voiceover + split for ducking ────────────────────────
    // Split voiceover into two copies: one for sidechain ducking, one for final mix
    filterParts.push(
      `[${voiceoverIdx}:a]atrim=start=${voTrimStartSec.toFixed(3)}:end=${voTrimEndSec.toFixed(3)},asetpts=PTS-STARTPTS,asplit=2[vo_for_duck][vo_for_mix]`,
    );

    // ─── Audio: ambient sounds with delay (one per scene) ─────────────────
    // Calculate scene start timestamps for positioning ambient + transition audio
    const sceneStartTimestamps: number[] = [];
    let sceneCursor = 0;
    for (let i = 0; i < clips.length; i++) {
      sceneStartTimestamps.push(sceneCursor);
      sceneCursor += clips[i].targetDurationSec;
    }

    const bedLabels: string[] = ["[clipaudio_vol]"];

    for (let i = 0; i < ambientInputMap.length; i++) {
      const { inputIdx, sceneIdx } = ambientInputMap[i];
      const delayMs = Math.max(0, Math.round(sceneStartTimestamps[sceneIdx] * 1000));
      filterParts.push(
        `[${inputIdx}:a]adelay=${delayMs}|${delayMs},volume=0.18[amb${i}]`,
      );
      bedLabels.push(`[amb${i}]`);
    }

    // ─── Audio: transition SFX with delay ──────────────────────────────────
    // Transition SFX fire at the boundary between scenes (scene end - 0.5s)
    for (let i = 0; i < transitionInputMap.length; i++) {
      const { inputIdx, transitionIdx } = transitionInputMap[i];
      const transitionTime = sceneStartTimestamps[transitionIdx] + clips[transitionIdx].targetDurationSec;
      const delayMs = Math.max(0, Math.round((transitionTime - 0.5) * 1000));
      filterParts.push(
        `[${inputIdx}:a]adelay=${delayMs}|${delayMs},volume=0.35[tsfx${i}]`,
      );
      bedLabels.push(`[tsfx${i}]`);
    }

    // ─── Audio: merge all bed streams (clip audio + ambient + transition SFX) ──
    if (bedLabels.length > 1) {
      filterParts.push(
        `${bedLabels.join("")}amix=inputs=${bedLabels.length}:duration=longest:dropout_transition=0:normalize=0[bed_raw]`,
      );
    } else {
      filterParts.push(`[clipaudio_vol]acopy[bed_raw]`);
    }

    // ─── Audio: sidechain compress bed against voiceover (auto-ducking) ───
    // When narrator speaks, bed audio (SFX + clip audio) ducks ~12dB
    // Attack 200ms (smooth duck-in), Release 1000ms (rises back over 1s)
    filterParts.push(
      `[bed_raw][vo_for_duck]sidechaincompress=level_in=1:threshold=0.04:ratio=6:attack=50:release=600:makeup=1:knee=4[bed_ducked]`,
    );

    // ─── Audio: final mix (voiceover + ducked bed) ────────────────────────
    filterParts.push(
      `[vo_for_mix][bed_ducked]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[aout]`,
    );

    const filterComplex = filterParts.join(";\n");

    args.push(
      "-filter_complex",
      filterComplex,
      "-map",
      "[vfinal]",
      "-map",
      "[aout]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
      "-y",
      outputPath,
    );

    const totalTargetSec = clips.reduce((s, c) => s + c.targetDurationSec, 0);
    console.log(
      `[render] FFmpeg: ${clips.length} clips, total target duration ${totalTargetSec.toFixed(1)}s`,
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

  // ─── Subtitle generation ──────────────────────────────────────────────────

  private formatASSTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${String(m).padStart(2, "0")}:${s.toFixed(2).padStart(5, "0")}`;
  }

  /**
   * Split segment text into small word groups (2-3 words) for progressive
   * subtitle display — words appear in sync with narration like modern YouTube.
   * Uses real word timestamps from ElevenLabs alignment when available.
   */
  private splitIntoSubtitleLines(
    text: string,
    startSec: number,
    endSec: number,
    wordTimestamps?: Array<{ word: string; start: number; end: number }>,
  ): Array<{ text: string; start: number; end: number }> {
    // If we have real word timestamps, use them for accurate timing
    if (wordTimestamps && wordTimestamps.length > 0) {
      const CHUNK = 6; // ~6 words per subtitle line — reads like a natural sentence
      const lines: Array<{ text: string; start: number; end: number }> = [];
      let idx = 0;

      while (idx < wordTimestamps.length) {
        const remaining = wordTimestamps.length - idx;
        const take = remaining <= CHUNK + 2 ? remaining : CHUNK;
        const chunk = wordTimestamps.slice(idx, idx + take);
        lines.push({
          text: chunk.map((w) => w.word).join(" "),
          start: chunk[0].start,
          end: chunk[chunk.length - 1].end,
        });
        idx += take;
      }
      return lines;
    }

    // Fallback: proportional distribution for old voiceovers without word timestamps
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const totalDur = endSec - startSec;
    const secPerWord = totalDur / words.length;

    const CHUNK = 6;
    const lines: Array<{ text: string; start: number; end: number }> = [];
    let wordIdx = 0;

    while (wordIdx < words.length) {
      const remaining = words.length - wordIdx;
      const take = remaining <= CHUNK + 2 ? remaining : CHUNK;
      const chunk = words.slice(wordIdx, wordIdx + take).join(" ");
      const start = startSec + wordIdx * secPerWord;
      const end = startSec + (wordIdx + take) * secPerWord;
      lines.push({ text: chunk, start, end });
      wordIdx += take;
    }

    return lines;
  }

  private generateSubtitleFile(params: {
    segments: Array<{
      text: string;
      startSec: number;
      endSec: number;
      words?: Array<{ word: string; start: number; end: number }>;
    }>;
    voTrimStartSec: number;
    voTrimEndSec: number;
    outputPath: string;
  }): string {
    const { segments, voTrimStartSec, voTrimEndSec, outputPath } = params;
    const trimDuration = voTrimEndSec - voTrimStartSec;

    const header = `[Script Info]
Title: Atlas Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1280
PlayResY: 720

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,28,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,2.5,1,2,30,30,35,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const dialogues: string[] = [];
    console.log(`[render] Subtitle: ${segments.length} segments, trim=${voTrimStartSec.toFixed(1)}-${voTrimEndSec.toFixed(1)}s (dur=${trimDuration.toFixed(1)}s)`);

    for (const segment of segments) {
      console.log(`[render]   Segment: ${segment.startSec.toFixed(1)}-${segment.endSec.toFixed(1)}s "${segment.text.slice(0, 60)}..."`);
      const lines = this.splitIntoSubtitleLines(
        segment.text,
        segment.startSec,
        segment.endSec,
        segment.words,
      );

      for (const line of lines) {
        // Adjust for voiceover trim offset
        const adjStart = line.start - voTrimStartSec;
        const adjEnd = line.end - voTrimStartSec;

        // Skip lines outside the trim range
        if (adjEnd <= 0 || adjStart >= trimDuration) continue;

        const clampedStart = Math.max(0, adjStart);
        const clampedEnd = Math.min(trimDuration, adjEnd);

        dialogues.push(
          `Dialogue: 0,${this.formatASSTime(clampedStart)},${this.formatASSTime(clampedEnd)},Default,,0,0,0,,${line.text}`,
        );
      }
    }

    fs.writeFileSync(outputPath, header + dialogues.join("\n") + "\n");
    console.log(`[render] Generated ${dialogues.length} subtitle lines → ${outputPath}`);
    return outputPath;
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
