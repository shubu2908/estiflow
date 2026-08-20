import { GoogleGenAI } from "@google/genai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { geminiEstimateResponseSchema, type GeminiEstimateResponse } from "shared";
import { buildSystemInstruction, type EstimatePromptParams } from "../prompts/estimatePrompt.js";
import type { GeminiInputPart } from "./fileService.js";

const RESPONSE_JSON_SCHEMA = zodToJsonSchema(geminiEstimateResponseSchema, { $refStrategy: "none", target: "jsonSchema7" });

export class GeminiGenerationError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "GeminiGenerationError";
  }
}

function isRetryable(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /429|RESOURCE_EXHAUSTED|UNAVAILABLE|5\d\d|ECONNRESET|ETIMEDOUT/i.test(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateEstimate(
  model: string,
  files: GeminiInputPart[],
  promptParams: EstimatePromptParams
): Promise<GeminiEstimateResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiGenerationError("GEMINI_API_KEY is not set on the server. Add it to backend/.env.", false);
  }

  const ai = new GoogleGenAI({ apiKey });
  const systemInstruction = buildSystemInstruction(promptParams);

  const input = [
    {
      type: "text" as const,
      text: "Here is the Solution Design Document / process flow material for this project. Analyze it and produce the estimate JSON per your instructions.",
    },
    ...files,
  ];

  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const interaction = await ai.interactions.create({
        model,
        system_instruction: systemInstruction,
        input,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: RESPONSE_JSON_SCHEMA,
        },
      } as never);

      const outputText = (interaction as { output_text?: string }).output_text;
      if (!outputText) {
        throw new GeminiGenerationError("Gemini returned an empty response.", true);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(outputText);
      } catch {
        throw new GeminiGenerationError("Gemini did not return valid JSON.", true);
      }

      const validated = geminiEstimateResponseSchema.safeParse(parsed);
      if (!validated.success) {
        throw new GeminiGenerationError(
          `Gemini's response didn't match the expected schema: ${validated.error.issues.map((i) => i.message).join("; ")}`,
          true
        );
      }

      return validated.data;
    } catch (err) {
      lastError = err;
      const retryable = err instanceof GeminiGenerationError ? err.retryable : isRetryable(err);
      if (!retryable || attempt === maxAttempts) break;
      await sleep(1000 * 2 ** (attempt - 1));
    }
  }

  if (lastError instanceof GeminiGenerationError) throw lastError;
  const message = lastError instanceof Error ? lastError.message : "Unknown error calling Gemini.";
  throw new GeminiGenerationError(message, isRetryable(lastError));
}
