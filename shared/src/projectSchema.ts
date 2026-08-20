import { z } from "zod";
import { PHASE_NAMES, TEST_CASE_PRIORITIES, TEST_CASE_TYPES, AI_COMPLEXITY_LEVELS, COMPLEXITY_LEVELS } from "./constants.js";

// ---- Persisted / API-facing shapes (post-generation, editable) ----

export const roleHourDtoSchema = z.object({
  id: z.string(),
  role: z.string(),
  hours: z.number().nonnegative(),
});

export const phaseDtoSchema = z.object({
  id: z.string(),
  name: z.enum(PHASE_NAMES),
  order: z.number().int(),
  hours: z.number().nonnegative(),
  bufferPercent: z.number().min(0).max(100),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  rationale: z.string().nullable(),
  dependencies: z.string().nullable(),
  roleHours: z.array(roleHourDtoSchema),
});

export const taskDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  hours: z.number().nonnegative(),
  role: z.string(),
});

export const testCaseDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  precondition: z.string().nullable(),
  steps: z.array(z.string()),
  expectedResult: z.string(),
  priority: z.enum(TEST_CASE_PRIORITIES),
  type: z.enum(TEST_CASE_TYPES),
  order: z.number().int(),
});

export const storyDtoSchema = z.object({
  id: z.string(),
  epic: z.string(),
  title: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string()),
  storyPoints: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5), z.literal(8), z.literal(13)]),
  phaseId: z.string().nullable(),
  order: z.number().int(),
  tasks: z.array(taskDtoSchema),
  testCases: z.array(testCaseDtoSchema),
});

export const projectDtoSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  technology: z.array(z.string()),
  devStartDate: z.string(),
  geminiModel: z.string(),
  complexityOverride: z.enum(COMPLEXITY_LEVELS).nullable(),
  aiComplexity: z.enum(AI_COMPLEXITY_LEVELS).nullable(),
  assumptions: z.array(z.string()),
  hoursPerDay: z.number().positive(),
  workingDays: z.array(z.number().int().min(0).max(6)),
  status: z.enum(["draft", "generated", "edited"]),
  customRoles: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  phases: z.array(phaseDtoSchema),
  stories: z.array(storyDtoSchema),
});

export const projectSummaryDtoSchema = projectDtoSchema.pick({
  id: true,
  name: true,
  technology: true,
  devStartDate: true,
  geminiModel: true,
  status: true,
  aiComplexity: true,
  createdAt: true,
  updatedAt: true,
});

// Payload for POST /api/projects (setup form)
export const createProjectSchema = z.object({
  name: z.string().min(1),
  technology: z.array(z.string()).min(1),
  devStartDate: z.string(),
  geminiModel: z.string(),
  complexityOverride: z.enum(COMPLEXITY_LEVELS).nullable().optional(),
  hoursPerDay: z.number().positive().optional(),
});

// Payload for PUT /api/projects/:id/estimate (bulk save of edited tree)
export const saveEstimateSchema = projectDtoSchema.pick({
  hoursPerDay: true,
  workingDays: true,
  phases: true,
  stories: true,
  customRoles: true,
});

export type RoleHourDto = z.infer<typeof roleHourDtoSchema>;
export type PhaseDto = z.infer<typeof phaseDtoSchema>;
export type TaskDto = z.infer<typeof taskDtoSchema>;
export type TestCaseDto = z.infer<typeof testCaseDtoSchema>;
export type StoryDto = z.infer<typeof storyDtoSchema>;
export type ProjectDto = z.infer<typeof projectDtoSchema>;
export type ProjectSummaryDto = z.infer<typeof projectSummaryDtoSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type SaveEstimateInput = z.infer<typeof saveEstimateSchema>;
