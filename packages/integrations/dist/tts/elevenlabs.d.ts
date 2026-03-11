/**
 * ElevenLabs TTS adapter.
 * Set USE_MOCK_TTS=true in env for local dev.
 */
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
}
export interface TTSProvider {
    generate(text: string, voiceId: string): Promise<TTSResult>;
}
export declare function createTTSProvider(): TTSProvider;
//# sourceMappingURL=elevenlabs.d.ts.map