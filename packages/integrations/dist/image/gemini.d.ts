/**
 * Image generation adapter (Gemini / configurable).
 * Set USE_MOCK_IMAGE=true in env for local dev.
 */
export interface ImageGenerationResult {
    imageBuffer: Buffer;
    mimeType: string;
    seed?: string;
    costUsd: number;
}
export interface ImageProvider {
    generate(prompt: string, seed?: string): Promise<ImageGenerationResult>;
}
export declare function createImageProvider(): ImageProvider;
//# sourceMappingURL=gemini.d.ts.map