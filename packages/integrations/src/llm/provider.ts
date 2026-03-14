/**
 * LLM provider adapter.
 * Wraps Google Gemini (via ADK) with a simple interface.
 * Set USE_MOCK_LLM=true in env to use the mock provider for local dev.
 */

import { calculateLLMCost } from "@atlas/shared";
import { runAgent } from "./adk-runner";

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

// ─── Gemini ADK provider ────────────────────────────────────────────────────

class GeminiADKProvider implements LLMProvider {
  constructor() {
    if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  }

  async chat(
    messages: LLMMessage[],
    model = "gemini-2.5-flash",
  ): Promise<LLMResponse> {
    // Separate system messages (become agent instruction) from user/assistant messages
    const systemParts = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content);
    const userParts = messages
      .filter((m) => m.role !== "system")
      .map((m) => m.content);

    const result = await runAgent({
      agentName: "llm-chat",
      instruction: systemParts.join("\n\n"),
      userMessage: userParts.join("\n\n"),
      model,
    });

    return {
      content: result.content,
      model: result.model,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    };
  }
}

// ─── Mock provider ───────────────────────────────────────────────────────────

class MockLLMProvider implements LLMProvider {
  async chat(messages: LLMMessage[]): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1].content;
    const mockResponse = `[MOCK LLM RESPONSE]\nPrompt received: "${lastMessage.substring(0, 100)}..."\n\nThis is a mock response for local development. Set USE_MOCK_LLM=false and provide GEMINI_API_KEY to use the real LLM.`;
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
  return new GeminiADKProvider();
}
