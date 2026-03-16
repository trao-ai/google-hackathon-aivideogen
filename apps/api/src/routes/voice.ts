import { Router } from "express";
import { prisma, trackTTSCost } from "@atlas/db";
import { calculateTTSCost } from "@atlas/shared";
import {
  createStorageProvider,
  fetchElevenLabsVoices,
  ELEVENLABS_TTS_MODEL,
  ELEVENLABS_OUTPUT_FORMAT,
} from "@atlas/integrations";
import type { ElevenLabsVoice } from "@atlas/integrations";
import { ApiError } from "../middleware/error-handler";

export const voiceRouter = Router();

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? "";

// ─── Voice cache ─────────────────────────────────────────────────────────────
// Cache fetched voices for 10 minutes to avoid hitting ElevenLabs on every request
let cachedVoices: ElevenLabsVoice[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getVoices(): Promise<ElevenLabsVoice[]> {
  const now = Date.now();
  if (cachedVoices && now - cacheTimestamp < CACHE_TTL_MS) return cachedVoices;

  cachedVoices = await fetchElevenLabsVoices({ pageSize: 100 });
  cacheTimestamp = now;
  return cachedVoices;
}

// Fallback presets used when ElevenLabs API is unreachable
const FALLBACK_PRESETS: Record<string, { name: string; accent: string; voiceId: string }> = {
  adam:    { name: "Adam",    accent: "American",   voiceId: "pNInz6obpgDQGcFmaJgB" },
  daniel:  { name: "Daniel",  accent: "British",    voiceId: "onwK4e9ZLuTAKqWW03F9" },
  george:  { name: "George",  accent: "British",    voiceId: "JBFqnCBsd6RMkjVDRZzb" },
  charlie: { name: "Charlie", accent: "Australian", voiceId: "IKne3meq5aSn9XLyUdCD" },
  bill:    { name: "Bill",    accent: "American",   voiceId: "pqHfZKP75CvOlQylNhV4" },
  rachel:  { name: "Rachel",  accent: "American",   voiceId: "21m00Tcm4TlvDq8ikWAM" },
};
const DEFAULT_VOICE = "adam";

// ─── GET /voice-presets ──────────────────────────────────────────────────────
// Returns available voices in the shape the UI expects: { key, name, accent }[]
voiceRouter.get("/voice-presets", async (_req, res, next) => {
  try {
    const voices = await getVoices();
    // Map ElevenLabs voice objects to the UI's VoicePreset shape
    const presets = voices.map((v) => ({
      key: v.name.toLowerCase().replace(/\s+/g, "_"),
      name: v.name,
      accent: v.labels?.accent ?? v.labels?.description ?? "Unknown",
      voiceId: v.voice_id,
      category: v.category,
      description: v.description,
      previewUrl: v.preview_url,
      gender: v.labels?.gender ?? null,
      age: v.labels?.age ?? null,
      personality: v.labels?.description ?? null,
      useCase: v.labels?.use_case ?? null,
    }));
    res.json(presets);
  } catch (err) {
    console.warn("[voice] Failed to fetch ElevenLabs voices, using fallback presets:", (err as Error).message);
    // Return fallback presets so UI still works
    const presets = Object.entries(FALLBACK_PRESETS).map(([key, v]) => ({
      key,
      name: v.name,
      accent: v.accent,
    }));
    res.json(presets);
  }
});

// ─── Helper: resolve voice ID from request ───────────────────────────────────
async function resolveVoiceId(requestedVoice: string | undefined): Promise<{ voiceId: string; voiceName: string }> {
  // 1. Try to resolve from live ElevenLabs voices
  if (requestedVoice) {
    try {
      const voices = await getVoices();
      const match = voices.find(
        (v) =>
          v.name.toLowerCase() === requestedVoice.toLowerCase() ||
          v.name.toLowerCase().replace(/\s+/g, "_") === requestedVoice.toLowerCase(),
      );
      if (match) return { voiceId: match.voice_id, voiceName: match.name };
    } catch { /* fall through to fallback */ }

    // 2. Check fallback presets
    const fallback = FALLBACK_PRESETS[requestedVoice.toLowerCase()];
    if (fallback) return { voiceId: fallback.voiceId, voiceName: fallback.name };
  }

  // 3. Env override or default
  const envOverride = process.env.ELEVENLABS_VOICE_ID;
  if (envOverride) return { voiceId: envOverride, voiceName: "env-override" };

  const defaultPreset = FALLBACK_PRESETS[DEFAULT_VOICE];
  return { voiceId: defaultPreset.voiceId, voiceName: defaultPreset.name };
}

// ─── Tone → voice_settings + audio tag mapping ──────────────────────────────
// ElevenLabs v3 uses audio tags in the text AND voice_settings together
// for proper emotional delivery. Tags drive the emotion; settings control range.
interface ToneConfig {
  settings: { stability: number; similarity_boost: number; style: number };
  /** Audio tag prefix prepended to each section for emotional direction */
  sectionTag: string;
  /** Audio tag for high-impact sections (hook, twist, CTA) */
  impactTag: string;
}

const TONE_CONFIGS: Record<string, ToneConfig> = {
  energetic: {
    settings: { stability: 0.15, similarity_boost: 0.65, style: 0.90 },
    sectionTag: "[excited, upbeat]",
    impactTag: "[very excited, enthusiastic]",
  },
  calm: {
    settings: { stability: 0.60, similarity_boost: 0.85, style: 0.30 },
    sectionTag: "[calm, gentle]",
    impactTag: "[softly, reassuring]",
  },
  motivational: {
    settings: { stability: 0.20, similarity_boost: 0.70, style: 0.85 },
    sectionTag: "[inspiring, confident]",
    impactTag: "[passionately, empowering]",
  },
  professional: {
    settings: { stability: 0.55, similarity_boost: 0.85, style: 0.45 },
    sectionTag: "[measured, authoritative]",
    impactTag: "[firmly, with conviction]",
  },
};
const DEFAULT_TONE_CONFIG: ToneConfig = {
  settings: { stability: 0.30, similarity_boost: 0.75, style: 0.70 },
  sectionTag: "",
  impactTag: "",
};

/** Sections that get the stronger "impact" audio tag */
const IMPACT_SECTIONS = new Set(["cold_open", "hook", "twist", "dramatic_reveal", "closing_hook", "cta"]);

// ─── POST /:id/generate-voice ────────────────────────────────────────────────
voiceRouter.post("/:id/generate-voice", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new ApiError(404, "Project not found");
    if (!project.selectedScriptId) throw new ApiError(400, "No script selected. Generate and approve a script first.");

    // Resolve voice
    const requestedVoice = req.body?.voice as string | undefined;
    const requestedTone = (req.body?.tone as string | undefined)?.toLowerCase();
    const requestedAccent = req.body?.accent as string | undefined;
    console.log(`[voice] Request body:`, { voice: requestedVoice, tone: requestedTone, accent: requestedAccent });

    const { voiceId: VOICE_ID, voiceName } = await resolveVoiceId(requestedVoice);
    const toneConfig = TONE_CONFIGS[requestedTone ?? ""] ?? DEFAULT_TONE_CONFIG;
    const toneSettings = toneConfig.settings;
    console.log(`[voice] Resolved voice: ${voiceName} (${VOICE_ID})`);
    console.log(`[voice] Model: ${ELEVENLABS_TTS_MODEL}, Output: ${ELEVENLABS_OUTPUT_FORMAT}`);
    console.log(`[voice] Tone: ${requestedTone ?? "default"}, settings:`, toneSettings);

    const script = await prisma.script.findUnique({
      where: { id: project.selectedScriptId },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });
    if (!script) throw new ApiError(404, `Script ${project.selectedScriptId} not found`);

    const storage = createStorageProvider();

    // Delete any existing voiceovers + audio files so we always start fresh
    const existing = await prisma.voiceover.findMany({ where: { projectId: project.id } });
    for (const _vo of existing) {
      const audioKey = `projects/${project.id}/voiceover.mp3`;
      try { await storage.delete(audioKey); } catch { /* file may not exist */ }
    }
    await prisma.voiceover.deleteMany({ where: { projectId: project.id } });

    await prisma.project.update({ where: { id: project.id }, data: { status: "voicing" } });
    console.log(`[voice] Generating TTS for script ${script.id} (${script.sections.length} sections)`);

    // Narration sections only
    const narrationSections = script.sections.filter((s) =>
      ["cold_open", "hook", "promise", "context", "escalation",
       "main_explanation_1", "main_explanation_2", "twist",
       "consequences", "closing_hook", "cta", "narration"].includes(s.sectionType)
    );

    // Build text with ElevenLabs v3 audio tags for emotional delivery
    const fullText = narrationSections
      .map((s) => {
        let text = s.text.trim();
        // Add dramatic pause markers for impact sections
        if (
          ["cold_open", "hook", "twist", "dramatic_reveal"].includes(s.sectionType) &&
          !text.endsWith("...")
        ) {
          text = text.replace(/\.(\s*)$/, "...$1");
        }
        // Prepend audio tag based on tone + section importance
        const tag = IMPACT_SECTIONS.has(s.sectionType)
          ? toneConfig.impactTag
          : toneConfig.sectionTag;
        if (tag) {
          text = `${tag} ${text}`;
        }
        return text;
      })
      .join("\n\n");

    if (!ELEVENLABS_KEY) throw new ApiError(500, "ELEVENLABS_API_KEY not configured");

    // Use /with-timestamps endpoint for character-level alignment (accurate subtitles)
    const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps?output_format=${ELEVENLABS_OUTPUT_FORMAT}`;
    const ttsBody = {
      text: fullText,
      model_id: ELEVENLABS_TTS_MODEL,
      voice_settings: {
        stability: toneSettings.stability,
        similarity_boost: toneSettings.similarity_boost,
        style: toneSettings.style,
        use_speaker_boost: true,
      },
    };
    console.log(`[voice] ElevenLabs request URL: ${ttsUrl}`);
    console.log(`[voice] ElevenLabs request payload:`, {
      model_id: ttsBody.model_id,
      voice_settings: ttsBody.voice_settings,
      text_length: fullText.length,
      text_preview: fullText.slice(0, 100) + "...",
    });

    const ttsRes = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_KEY,
      },
      body: JSON.stringify(ttsBody),
    });

    if (!ttsRes.ok) {
      const err = await ttsRes.text();
      throw new Error(`ElevenLabs error ${ttsRes.status}: ${err.slice(0, 300)}`);
    }

    // Response is JSON with audio_base64 + alignment data
    const ttsData = await ttsRes.json() as {
      audio_base64: string;
      alignment: {
        characters: string[];
        character_start_times_seconds: number[];
        character_end_times_seconds: number[];
      };
    };

    const audioBuffer = Buffer.from(ttsData.audio_base64, "base64");

    // Upload to cloud storage
    const audioKey = `projects/${project.id}/voiceover.mp3`;
    const audioUrl = await storage.upload(audioKey, audioBuffer, "audio/mpeg");

    // Parse word-level timestamps from character alignment
    const { characters, character_start_times_seconds, character_end_times_seconds } = ttsData.alignment;
    const allWords: Array<{ word: string; start: number; end: number }> = [];
    let currentWord = "";
    let wordStart = 0;

    for (let i = 0; i < characters.length; i++) {
      const ch = characters[i];
      if (ch === " " || ch === "\n") {
        if (currentWord) {
          allWords.push({
            word: currentWord,
            start: parseFloat(wordStart.toFixed(3)),
            end: parseFloat(character_end_times_seconds[i - 1].toFixed(3)),
          });
          currentWord = "";
        }
      } else {
        if (!currentWord) wordStart = character_start_times_seconds[i];
        currentWord += ch;
      }
    }
    // Push last word
    if (currentWord) {
      allWords.push({
        word: currentWord,
        start: parseFloat(wordStart.toFixed(3)),
        end: parseFloat(character_end_times_seconds[characters.length - 1].toFixed(3)),
      });
    }

    // Real duration from alignment (last character's end time)
    const durationSec = allWords.length > 0
      ? parseFloat(allWords[allWords.length - 1].end.toFixed(2))
      : 0;
    const costUsd = calculateTTSCost(ELEVENLABS_TTS_MODEL, fullText.length);
    console.log(`[voice] Alignment: ${allWords.length} words, real duration ${durationSec.toFixed(1)}s`);

    // Map words back to narration sections for accurate segment timestamps
    let wordIdx = 0;
    const segments = narrationSections.map((section) => {
      const sectionWords = section.text.split(/\s+/).filter(Boolean);
      const sectionWordData: Array<{ word: string; start: number; end: number }> = [];

      for (let i = 0; i < sectionWords.length && wordIdx < allWords.length; i++) {
        sectionWordData.push({
          word: sectionWords[i],
          start: allWords[wordIdx].start,
          end: allWords[wordIdx].end,
        });
        wordIdx++;
      }

      const startSec = sectionWordData.length > 0 ? sectionWordData[0].start : 0;
      const endSec = sectionWordData.length > 0 ? sectionWordData[sectionWordData.length - 1].end : 0;

      return {
        sectionId: section.id,
        text: section.text,
        startSec,
        endSec,
        words: sectionWordData,
      };
    });

    await trackTTSCost({
      projectId: project.id,
      vendor: "elevenlabs",
      model: ELEVENLABS_TTS_MODEL,
      characterCount: fullText.length,
      totalCostUsd: costUsd,
    });

    const voiceover = await prisma.voiceover.create({
      data: {
        projectId: project.id,
        scriptId: script.id,
        vendor: "elevenlabs",
        voiceId: VOICE_ID,
        audioUrl,
        durationSec,
        costUsd,
        segments,
      },
    });

    await prisma.project.update({ where: { id: project.id }, data: { status: "voice_done" } });
    console.log(`[voice] Done — ${durationSec}s audio, cost $${costUsd.toFixed(3)} (model: ${ELEVENLABS_TTS_MODEL})`);

    res.json({ ...voiceover, audioUrl });
  } catch (err) {
    await prisma.project.update({ where: { id: req.params.id }, data: { status: "tts_failed" } }).catch(() => {});
    next(err);
  }
});

voiceRouter.get("/:id/voiceover", async (req, res, next) => {
  try {
    const voiceover = await prisma.voiceover.findFirst({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(voiceover ?? null);
  } catch (err) { next(err); }
});

voiceRouter.delete("/:projectId/voiceovers/:voiceoverId", async (req, res, next) => {
  try {
    const { projectId, voiceoverId } = req.params;
    const voiceover = await prisma.voiceover.findUnique({ where: { id: voiceoverId } });
    if (!voiceover) throw new ApiError(404, "Voiceover not found");

    // Delete audio file from storage
    const audioKey = `projects/${projectId}/voiceover.mp3`;
    try { await createStorageProvider().delete(audioKey); } catch { /* may not exist */ }

    await prisma.voiceover.delete({ where: { id: voiceoverId } });

    // Check if any voiceovers remain; if not, roll back status to script_selected
    const remaining = await prisma.voiceover.count({ where: { projectId } });
    if (remaining === 0) {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "script_selected" },
      });
    }

    res.status(204).send();
  } catch (err) { next(err); }
});
