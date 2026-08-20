import { Router } from "express";
import multer from "multer";
import { PHASE_NAMES, calculateTimeline, nearestFibonacci } from "shared";
import { prisma } from "../db.js";
import { projectInclude, toProjectDto } from "../services/mapper.js";
import { filesToInputParts } from "../services/fileService.js";
import { generateEstimate, GeminiGenerationError } from "../services/geminiService.js";

export const generateRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10 },
});

generateRouter.post("/:id/generate", upload.array("files", 10), async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!project) return res.status(404).json({ error: "Project not found" });

  const files = (req.files as Express.Multer.File[]) ?? [];
  if (files.length === 0) {
    return res.status(400).json({ error: "Upload at least one file (SDD and/or process flow diagram)." });
  }

  try {
    const inputParts = await filesToInputParts(files);
    const estimate = await generateEstimate(project.geminiModel, inputParts, {
      technology: JSON.parse(project.technology),
      complexityOverride: project.complexityOverride,
      hoursPerDay: project.hoursPerDay,
    });

    const workingDays: number[] = JSON.parse(project.workingDays);
    const orderedPhases = PHASE_NAMES.map((name) => estimate.phases.find((p) => p.name === name)!);
    const timeline = calculateTimeline(
      orderedPhases.map((p) => ({ hours: p.hours, bufferPercent: p.bufferPercent })),
      project.devStartDate.toISOString(),
      project.hoursPerDay,
      workingDays
    );

    await prisma.$transaction(async (tx) => {
      await tx.story.deleteMany({ where: { projectId: project.id } });
      await tx.phase.deleteMany({ where: { projectId: project.id } });

      const phaseIdByName = new Map<string, string>();
      for (let i = 0; i < orderedPhases.length; i++) {
        const phase = orderedPhases[i];
        const dates = timeline[i];
        const created = await tx.phase.create({
          data: {
            projectId: project.id,
            name: phase.name,
            order: i,
            hours: phase.hours,
            bufferPercent: phase.bufferPercent,
            startDate: new Date(dates.startDate),
            endDate: new Date(dates.endDate),
            rationale: phase.rationale,
            dependencies: phase.dependencies,
            roleHours: { create: phase.roleHours.map((rh) => ({ role: rh.role, hours: rh.hours })) },
          },
        });
        phaseIdByName.set(phase.name, created.id);
      }

      let storyOrder = 0;
      for (const epic of estimate.epics) {
        for (const story of epic.stories) {
          await tx.story.create({
            data: {
              projectId: project.id,
              phaseId: phaseIdByName.get(story.phase) ?? null,
              epic: epic.name,
              title: story.title,
              description: story.description,
              acceptanceCriteria: JSON.stringify(story.acceptanceCriteria),
              storyPoints: nearestFibonacci(story.storyPoints),
              order: storyOrder++,
              tasks: { create: story.tasks.map((t) => ({ title: t.title, hours: t.hours, role: t.role })) },
              testCases: {
                create: story.testCases.map((tc, idx) => ({
                  title: tc.title,
                  precondition: tc.precondition,
                  steps: JSON.stringify(tc.steps),
                  expectedResult: tc.expectedResult,
                  priority: tc.priority,
                  type: tc.type,
                  order: idx,
                })),
              },
            },
          });
        }
      }

      await tx.project.update({
        where: { id: project.id },
        data: {
          status: "generated",
          aiComplexity: estimate.overallComplexity,
          assumptions: JSON.stringify(estimate.assumptions),
        },
      });
    });

    const full = await prisma.project.findUniqueOrThrow({ where: { id: project.id }, include: projectInclude });
    res.json(toProjectDto(full));
  } catch (err) {
    if (err instanceof GeminiGenerationError) {
      return res.status(err.retryable ? 502 : 400).json({ error: err.message, retryable: err.retryable });
    }
    const message = err instanceof Error ? err.message : "Unknown error during generation.";
    res.status(500).json({ error: message, retryable: false });
  }
});
