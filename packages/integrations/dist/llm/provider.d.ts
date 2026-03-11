/**
 * LLM provider adapter.
 * Wraps OpenAI (or any compatible API) with a simple interface.
 * Set USE_MOCK_LLM=true in env to use the mock provider for local dev.
 */
export interface LLMMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface LLMResponse {
    content: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
}
export interface LLMProvider {
    chat(messages: LLMMessage[], model?: string): Promise<LLMResponse>;
}
export declare function createLLMProvider(): LLMProvider;
//# sourceMappingURL=provider.d.ts.map