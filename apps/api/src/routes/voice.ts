import { Router } from "express";
import { prisma, trackTTSCost } from "@atlas/db";
import { calculateTTSCost } from "@atlas/shared";
import { createStorageProvider } from "@atlas/integrations";
import { ApiError } from "../middleware/error-handler";

export const voiceRouter = Router();

// Adam — deep, authoritative, highly expressive narrator. Override via ELEVENLABS_VOICE_ID env var.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "pNInz6obpgDQGcFmaJgB";
const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY ?? "";

voiceRouter.post("/:id/generate-voice", async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) throw new ApiError(404, "Project not found");
    if (!project.selectedScriptId) throw new ApiError(400, "No script selected. Generate and approve a script first.");

    const script = await prisma.script.findUnique({
      where: { id: project.selectedScriptId },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });
    if (!script) throw new ApiError(404, `Script ${project.selectedScriptId} not found`);

    const storage = createStorageProvider();

    // Delete any existing voiceovers + audio files so we always start fresh
    const existing = await prisma.voiceover.findMany({ where: { projectId: project.id } });
    for (const vo of existing) {
      const audioKey = `projects/${project.id}/voiceover.mp3`;
      try { await storage.delete(audioKey); } catch { /* file may not exist */ }
    }
    await prisma.voiceover.deleteMany({ where: { projectId: project.id } });

    await prisma.project.update({ where: { id: project.id }, data: { status: "voicing" } });
    console.log(`[voice] Generating TTS for script ${script.id} (${script.sections.length} sections)`);

    // Narration sections only (exclude CTA for some setups, but include all here)
    const narrationSections = script.sections.filter((s) =>
      ["cold_open", "hook", "promise", "context", "escalation",
       "main_explanation_1", "main_explanation_2", "twist",
       "consequences", "closing_hook", "cta", "narration"].includes(s.sectionType)
    );
    const fullText = narrationSections.map((s) => s.text).join("\n\n");

    if (!ELEVENLABS_KEY) throw new ApiError(500, "ELEVENLABS_API_KEY not configured");

    // Use /with-timestamps endpoint to get character-level alignment for accurate subtitles
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/with-timestamps`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_KEY,
      },
      body: JSON.stringify({
        text: fullText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.22,
          similarity_boost: 0.70,
          style: 0.68,
          use_speaker_boost: true,
        },
      }),
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
    const costUsd = calculateTTSCost("eleven_multilingual_v2", fullText.length);
    console.log(`[voice] Alignment: ${allWords.length} words, real duration ${durationSec.toFixed(1)}s`);

    // Map words back to narration sections for accurate segment timestamps
    let wordIdx = 0;
    const segments = narrationSections.map((section) => {
      const sectionWords = section.text.split(/\s+/).filter(Boolean);
      const sectionWordData: Array<{ word: string; start: number; end: number }> = [];

      // Consume words from the alignment stream for this section
      for (let i = 0; i < sectionWords.length && wordIdx < allWords.length; i++) {
        sectionWordData.push(allWords[wordIdx]);
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
      model: "eleven_multilingual_v2",
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
    console.log(`[voice] Done — ${durationSec}s audio, cost $${costUsd.toFixed(3)}`);

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
