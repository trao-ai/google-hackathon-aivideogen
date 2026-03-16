/**
 * ADK runner helper — wraps Google ADK's InMemoryRunner + LlmAgent
 * into a simple `runAgent()` function for use in BullMQ workers.
 *
 * Each call creates an ephemeral session, runs the agent, and returns
 * the final text response along with token usage and cost.
 */

import {
  LlmAgent,
  InMemoryRunner,
  isFinalResponse,
  FunctionTool,
} from "@google/adk";
import type { Event } from "@google/adk";
import type { Content } from "@google/genai";
import { z } from "zod";
import { calculateLLMCost } from "@atlas/shared";

// Re-export so workers can import FunctionTool and z from @atlas/integrations
export { FunctionTool } from "@google/adk";
export { z } from "zod";

// ─── Public types ────────────────────────────────────────────────────────────

export interface ADKRunOptions {
  /** Agent name for debugging / logging */
  agentName: string;
  /** System instruction for the agent */
  instruction: string;
  /** User message (the prompt content) */
  userMessage: string;
  /** Gemini model to use (default: 'gemini-2.5-flash') */
  model?: string;
  /** Optional tools the agent can use */
  tools?: FunctionTool[];
  /** Optional generation config overrides */
  generationConfig?: { maxOutputTokens?: number; temperature?: number };
  /** Optional inline image data to include in the user message (for multimodal analysis) */
  imageData?: Array<{ inlineData: { mimeType: string; data: string } }>;
}

export interface ADKRunResult {
  /** The raw text response from the agent */
  content: string;
  /** The model that was used */
  model: string;
  /** Input token count */
  inputTokens: number;
  /** Output token count */
  outputTokens: number;
  /** Computed cost in USD */
  costUsd: number;
}

// ─── Core runner ─────────────────────────────────────────────────────────────

const APP_NAME = "atlas";

export async function runAgent(options: ADKRunOptions): Promise<ADKRunResult> {
  const {
    agentName,
    instruction,
    userMessage,
    model = "gemini-2.5-flash",
    tools,
    generationConfig,
    imageData,
  } = options;

  // Build agent config
  const agentConfig: ConstructorParameters<typeof LlmAgent>[0] = {
    name: agentName,
    model,
    instruction: instruction || "You are a helpful assistant.",
  };

  if (tools?.length) {
    agentConfig.tools = tools;
  }

  if (generationConfig) {
    agentConfig.generateContentConfig = {};
    if (generationConfig.maxOutputTokens !== undefined) {
      agentConfig.generateContentConfig.maxOutputTokens =
        generationConfig.maxOutputTokens;
    }
    if (generationConfig.temperature !== undefined) {
      agentConfig.generateContentConfig.temperature =
        generationConfig.temperature;
    }
  }

  const agent = new LlmAgent(agentConfig);

  const runner = new InMemoryRunner({ appName: APP_NAME, agent });

  // Create an ephemeral session
  const session = await runner.sessionService.createSession({
    appName: APP_NAME,
    userId: "worker",
  });

  // Build the user message as a Content object (supports multimodal with images)
  const messageParts: Content["parts"] = [];
  if (imageData?.length) {
    messageParts.push(...imageData);
  }
  messageParts.push({ text: userMessage });

  const newMessage: Content = {
    role: "user",
    parts: messageParts,
  };

  // Iterate events and collect final response + usage
  let finalText = "";
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of runner.runAsync({
    userId: "worker",
    sessionId: session.id,
    newMessage,
  })) {
    // Accumulate token usage from all events that carry usageMetadata
    if (event.usageMetadata) {
      inputTokens += event.usageMetadata.promptTokenCount ?? 0;
      outputTokens += event.usageMetadata.candidatesTokenCount ?? 0;
    }

    // Capture the final response text
    if (isFinalResponse(event) && event.content?.parts?.length) {
      finalText = event.content.parts
        .map((p: { text?: string }) => p.text ?? "")
        .filter(Boolean)
        .join("");
    }
  }

  // Fallback token estimation if metadata wasn't available
  if (inputTokens === 0 && outputTokens === 0) {
    inputTokens = Math.ceil(userMessage.length / 4);
    outputTokens = Math.ceil(finalText.length / 4);
  }

  const costUsd = calculateLLMCost(model, inputTokens, outputTokens);

  return {
    content: finalText,
    model,
    inputTokens,
    outputTokens,
    costUsd,
  };
}
