/**
 * LLM provider adapter.
 * Wraps OpenAI (or any compatible API) with a simple interface.
 * Set USE_MOCK_LLM=true in env to use the mock provider for local dev.
 */

import { calculateLLMCost } from "@atlas/shared";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface LLMProvider {
  chat(messages: LLMMessage[], model?: string): Promise<LLMResponse>;
}

// ─── Real OpenAI provider ───────────────────────────────────────────────────

class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY ?? "";
    this.baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    if (!this.apiKey) throw new Error("OPENAI_API_KEY is not set");
  }

  async chat(messages: LLMMessage[], model = "gpt-4o"): Promise<LLMResponse> {
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

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    const inputTokens = data.usage.prompt_tokens;
    const outputTokens = data.usage.completion_tokens;
    const costUsd = calculateLLMCost(model, inputTokens, outputTokens);

    return {
      content: data.choices[0].message.content,
      model,
      inputTokens,
      outputTokens,
      costUsd,
    };
  }
}

// ─── Mock provider ───────────────────────────────────────────────────────────

class MockLLMProvider implements LLMProvider {
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1].content;
    const mockResponse = `[MOCK LLM RESPONSE]\nPrompt received: "${lastMessage.substring(0, 100)}..."\n\nThis is a mock response for local development. Set USE_MOCK_LLM=false and provide OPENAI_API_KEY to use the real LLM.`;
    return {
      content: mockResponse,
      model: "mock",
      inputTokens: 100,
      outputTokens: 50,
      costUsd: 0,
    };
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createLLMProvider(): LLMProvider {
  if (process.env.USE_MOCK_LLM === "true") return new MockLLMProvider();
  return new OpenAIProvider();
}
