/**
 * ElevenLabs TTS adapter.
 * Uses eleven_v3 (latest model) with high-quality MP3 output.
 * Set USE_MOCK_TTS=true in env for local dev.
 */

import { calculateTTSCost } from "@atlas/shared";

export const ELEVENLABS_TTS_MODEL = "eleven_v3";
export const ELEVENLABS_OUTPUT_FORMAT = "mp3_44100_128";

export interface TTSSegment {
  text: string;
  start: number;
  end: number;
}

export interface TTSResult {
  audioBuffer: Buffer;
  durationSec: number;
  segments: TTSSegment[];
  costUsd: number;
  model: string;
  characterCount: number;
}

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface TTSProvider {
  generate(text: string, voiceId: string, voiceSettings?: VoiceSettings): Promise<TTSResult>;
}

/** Shape returned by ElevenLabs GET /v2/voices */
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string | null;
  preview_url: string | null;
  labels: Record<string, string>;
}

export interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
  has_more: boolean;
  next_page_token?: string;
}

/**
 * Fetch available voices from the ElevenLabs API (v2/voices).
 * Supports filtering by category and voice_type.
 */
export async function fetchElevenLabsVoices(options?: {
  pageSize?: number;
  category?: string;
  search?: string;
}): Promise<ElevenLabsVoice[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY ?? "";
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

  const params = new URLSearchParams();
  params.set("page_size", String(options?.pageSize ?? 100));
  if (options?.category) params.set("category", options.category);
  if (options?.search) params.set("search", options.search);

  const res = await fetch(`https://api.elevenlabs.io/v2/voices?${params}`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`ElevenLabs voices error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as ElevenLabsVoicesResponse;
  return data.voices;
}

// ─── Real ElevenLabs provider ────────────────────────────────────────────────

class ElevenLabsProvider implements TTSProvider {
  private apiKey: string;
  private baseUrl = "https://api.elevenlabs.io/v1";

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY ?? "";
    if (!this.apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  }

  async generate(text: string, voiceId: string, voiceSettings?: VoiceSettings): Promise<TTSResult> {
    const settings: VoiceSettings = {
      stability: 0.30,
      similarity_boost: 0.75,
      style: 0.70,
      use_speaker_boost: true,
      ...voiceSettings,
    };

    const audioRes = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}?output_format=${ELEVENLABS_OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_TTS_MODEL,
          voice_settings: settings,
        }),
      },
    );

    if (!audioRes.ok) {
      const err = await audioRes.text();
      throw new Error(`ElevenLabs error ${audioRes.status}: ${err}`);
    }

    const audioBuffer = Buffer.from(await audioRes.arrayBuffer());

    // Rough duration estimate (150 wpm average) — worker uses alignment for precise timing
    const wordCount = text.split(/\s+/).length;
    const durationSec = (wordCount / 150) * 60;

    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    let cursor = 0;
    const segments: TTSSegment[] = sentences.map((sentence) => {
      const sentenceDuration = (sentence.split(/\s+/).length / 150) * 60;
      const segment: TTSSegment = {
        text: sentence.trim(),
        start: cursor,
        end: cursor + sentenceDuration,
      };
      cursor += sentenceDuration;
      return segment;
    });

    const costUsd = calculateTTSCost(ELEVENLABS_TTS_MODEL, text.length);

    return {
      audioBuffer,
      durationSec,
      segments,
      costUsd,
      model: ELEVENLABS_TTS_MODEL,
      characterCount: text.length,
    };
  }
}

// ─── Mock provider ───────────────────────────────────────────────────────────

class MockTTSProvider implements TTSProvider {
  async generate(text: string): Promise<TTSResult> {
    const wordCount = text.split(/\s+/).length;
    const durationSec = (wordCount / 150) * 60;
    return {
      audioBuffer: Buffer.from("mock-audio-data"),
      durationSec,
      segments: [{ text: text.substring(0, 50), start: 0, end: durationSec }],
      costUsd: 0,
      model: "mock",
      characterCount: text.length,
    };
  }
}

export function createTTSProvider(): TTSProvider {
  if (process.env.USE_MOCK_TTS === "true") return new MockTTSProvider();
  return new ElevenLabsProvider();
}
