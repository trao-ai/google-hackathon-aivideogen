"use strict";
/**
 * ElevenLabs TTS adapter.
 * Set USE_MOCK_TTS=true in env for local dev.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTTSProvider = createTTSProvider;
// ─── Real ElevenLabs provider ────────────────────────────────────────────────
class ElevenLabsProvider {
    constructor() {
        this.baseUrl = "https://api.elevenlabs.io/v1";
        this.apiKey = process.env.ELEVENLABS_API_KEY ?? "";
        if (!this.apiKey)
            throw new Error("ELEVENLABS_API_KEY is not set");
    }
    async generate(text, voiceId) {
        // Generate audio
        const audioRes = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": this.apiKey,
            },
            body: JSON.stringify({
                text,
                model_id: "eleven_multilingual_v2",
                voice_settings: { stability: 0.5, similarity_boost: 0.75 },
            }),
        });
        if (!audioRes.ok) {
            const err = await audioRes.text();
            throw new Error(`ElevenLabs error ${audioRes.status}: ${err}`);
        }
        const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
        // Rough duration estimate (150 wpm average)
        const wordCount = text.split(/\s+/).length;
        const durationSec = (wordCount / 150) * 60;
        // Rough segment split by sentence (simplified — real impl uses alignment API)
        const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
        let cursor = 0;
        const segments = sentences.map((sentence) => {
            const sentenceDuration = (sentence.split(/\s+/).length / 150) * 60;
            const segment = {
                text: sentence.trim(),
                start: cursor,
                end: cursor + sentenceDuration,
            };
            cursor += sentenceDuration;
            return segment;
        });
        // ElevenLabs pricing: ~$0.30 per 1000 characters (Starter)
        const costUsd = (text.length / 1000) * 0.3;
        return { audioBuffer, durationSec, segments, costUsd };
    }
}
// ─── Mock provider ───────────────────────────────────────────────────────────
class MockTTSProvider {
    async generate(text) {
        const wordCount = text.split(/\s+/).length;
        const durationSec = (wordCount / 150) * 60;
        return {
            audioBuffer: Buffer.from("mock-audio-data"),
            durationSec,
            segments: [{ text: text.substring(0, 50), start: 0, end: durationSec }],
            costUsd: 0,
        };
    }
}
function createTTSProvider() {
    if (process.env.USE_MOCK_TTS === "true")
        return new MockTTSProvider();
    return new ElevenLabsProvider();
}
//# sourceMappingURL=elevenlabs.js.map