"use strict";
/**
 * Image generation adapter (Gemini / configurable).
 * Set USE_MOCK_IMAGE=true in env for local dev.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageProvider = createImageProvider;
// ─── Gemini image provider ───────────────────────────────────────────────────
class GeminiImageProvider {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY ?? "";
        if (!this.apiKey)
            throw new Error("GEMINI_API_KEY is not set");
    }
    async generate(prompt) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${this.apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                instances: [{ prompt }],
                parameters: { sampleCount: 1 },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini image API error ${res.status}: ${err}`);
        }
        const data = (await res.json());
        const prediction = data.predictions[0];
        const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
        // Approximate cost: $0.04 per image
        const costUsd = 0.04;
        return { imageBuffer, mimeType: prediction.mimeType, costUsd };
    }
}
// ─── Mock provider ───────────────────────────────────────────────────────────
class MockImageProvider {
    async generate(prompt) {
        // Return a tiny valid PNG (1x1 transparent pixel)
        const png1x1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
        console.log(`[MockImage] Generating frame for prompt: "${prompt.substring(0, 80)}..."`);
        return { imageBuffer: png1x1, mimeType: "image/png", costUsd: 0 };
    }
}
function createImageProvider() {
    if (process.env.USE_MOCK_IMAGE === "true")
        return new MockImageProvider();
    return new GeminiImageProvider();
}
//# sourceMappingURL=gemini.js.map