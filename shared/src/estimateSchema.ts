import { z } from "zod";
import { PHASE_NAMES, STORY_POINTS, TEST_CASE_PRIORITIES, TEST_CASE_TYPES, AI_COMPLEXITY_LEVELS } from "./constants.js";

// ---- Shape Gemini must return (structured output / response_format.schema) ----

export const geminiRoleHourSchema = z.object({
  role: z.string(),
  hours: z.number().nonnegative(),
});

export const geminiPhaseSchema = z.object({
  name: z.enum(PHASE_NAMES),
  hours: z.number().positive(),
  bufferPercent: z.number().min(0).max(100),
  rationale: z.string(),
  dependencies: z.string(),
  roleHours: z.array(geminiRoleHourSchema).min(1),
});

export const geminiTaskSchema = z.object({
  title: z.string(),
  hours: z.number().positive(),
  role: z.string(),
});

export const geminiTestCaseSchema = z.object({
  title: z.string(),
  precondition: z.string(),
  steps: z.array(z.string()).min(1),
  expectedResult: z.string(),
  priority: z.enum(TEST_CASE_PRIORITIES),
  type: z.enum(TEST_CASE_TYPES),
});

export const geminiStorySchema = z.object({
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()).min(1),
  // AI output is loosely validated as a positive int, then snapped to the nearest
  // Fibonacci value server-side - stricter literal-union validation here is brittle
  // against models that return an off-sequence number despite prompt instructions.
  storyPoints: z.number().int().positive(),
  phase: z.enum(PHASE_NAMES),
  tasks: z.array(geminiTaskSchema).min(1),
  testCases: z.array(geminiTestCaseSchema).min(1),
});

export const geminiEpicSchema = z.object({
  name: z.string(),
  stories: z.array(geminiStorySchema).min(1),
});

export const geminiEstimateResponseSchema = z.object({
  overallComplexity: z.enum(AI_COMPLEXITY_LEVELS),
  assumptions: z.array(z.string()),
  phases: z.array(geminiPhaseSchema).length(PHASE_NAMES.length),
  epics: z.array(geminiEpicSchema).min(1),
});

export type GeminiEstimateResponse = z.infer<typeof geminiEstimateResponseSchema>;
export type GeminiPhase = z.infer<typeof geminiPhaseSchema>;
export type GeminiStory = z.infer<typeof geminiStorySchema>;
export type GeminiTask = z.infer<typeof geminiTaskSchema>;
export type GeminiTestCase = z.infer<typeof geminiTestCaseSchema>;

export { STORY_POINTS };
