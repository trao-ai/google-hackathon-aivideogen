"use strict";
/**
 * LLM provider adapter.
 * Wraps OpenAI (or any compatible API) with a simple interface.
 * Set USE_MOCK_LLM=true in env to use the mock provider for local dev.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLLMProvider = createLLMProvider;
// ─── Real OpenAI provider ───────────────────────────────────────────────────
class OpenAIProvider {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY ?? "";
        this.baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
        if (!this.apiKey)
            throw new Error("OPENAI_API_KEY is not set");
    }
    async chat(messages, model = "gpt-4o") {
        const res = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({ model, messages }),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`OpenAI API error ${res.status}: ${err}`);
        }
        const data = (await res.json());
        const inputTokens = data.usage.prompt_tokens;
        const outputTokens = data.usage.completion_tokens;
        // gpt-4o pricing approximation
        const costUsd = inputTokens * 0.000005 + outputTokens * 0.000015;
        return {
            content: data.choices[0].message.content,
            inputTokens,
            outputTokens,
            costUsd,
        };
    }
}
// ─── Mock provider ───────────────────────────────────────────────────────────
class MockLLMProvider {
    async chat(messages) {
        const lastMessage = messages[messages.length - 1].content;
        const mockResponse = `[MOCK LLM RESPONSE]\nPrompt received: "${lastMessage.substring(0, 100)}..."\n\nThis is a mock response for local development. Set USE_MOCK_LLM=false and provide OPENAI_API_KEY to use the real LLM.`;
        return {
            content: mockResponse,
            inputTokens: 100,
            outputTokens: 50,
            costUsd: 0,
        };
    }
}
// ─── Factory ─────────────────────────────────────────────────────────────────
function createLLMProvider() {
    if (process.env.USE_MOCK_LLM === "true")
        return new MockLLMProvider();
    return new OpenAIProvider();
}
//# sourceMappingURL=provider.js.map