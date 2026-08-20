import { Router } from "express";
import {
  createProjectSchema,
  saveEstimateSchema,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_WORKING_DAYS,
} from "shared";
import { prisma } from "../db.js";
import { projectInclude, toProjectDto, toProjectSummaryDto } from "../services/mapper.js";
import { getDefaultModel, isKnownModel } from "../config/geminiModels.js";

export const projectsRouter = Router();

projectsRouter.get("/", async (_req, res) => {
  const projects = await prisma.project.findMany({ include: projectInclude, orderBy: { updatedAt: "desc" } });
  res.json(projects.map(toProjectSummaryDto));
});

projectsRouter.post("/", async (req, res) => {
  const parsed = createProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
  }
  const input = parsed.data;
  const geminiModel = input.geminiModel && isKnownModel(input.geminiModel) ? input.geminiModel : getDefaultModel();

  const project = await prisma.project.create({
    data: {
      name: input.name,
      technology: JSON.stringify(input.technology),
      devStartDate: new Date(input.devStartDate),
      geminiModel,
      complexityOverride: input.complexityOverride ?? null,
      hoursPerDay: input.hoursPerDay ?? DEFAULT_HOURS_PER_DAY,
      workingDays: JSON.stringify(DEFAULT_WORKING_DAYS),
    },
    include: projectInclude,
  });

  res.status(201).json(toProjectDto(project));
});

projectsRouter.get("/:id", async (req, res) => {
  const project = await prisma.project.findUnique({ where: { id: req.params.id }, include: projectInclude });
  if (!project) return res.status(404).json({ error: "Project not found" });
  res.json(toProjectDto(project));
});

projectsRouter.put("/:id", async (req, res) => {
  const parsed = createProjectSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
  }
  const input = parsed.data;

  const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Project not found" });

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.technology !== undefined && { technology: JSON.stringify(input.technology) }),
      ...(input.devStartDate !== undefined && { devStartDate: new Date(input.devStartDate) }),
      ...(input.geminiModel !== undefined && { geminiModel: input.geminiModel }),
      ...(input.complexityOverride !== undefined && { complexityOverride: input.complexityOverride }),
      ...(input.hoursPerDay !== undefined && { hoursPerDay: input.hoursPerDay }),
    },
    include: projectInclude,
  });

  res.json(toProjectDto(project));
});

projectsRouter.delete("/:id", async (req, res) => {
  const existing = await prisma.project.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Project not found" });
  await prisma.project.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// Bulk replace of the editable estimate tree - the autosave target for all inline edits.
projectsRouter.put("/:id/estimate", async (req, res) => {
  const parsed = saveEstimateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join("; ") });
  }
  const body = parsed.data;
  const projectId = req.params.id;

  const existing = await prisma.project.findUnique({ where: { id: projectId } });
  if (!existing) return res.status(404).json({ error: "Project not found" });

  await prisma.$transaction(async (tx) => {
    await tx.story.deleteMany({ where: { projectId } });
    await tx.phase.deleteMany({ where: { projectId } });

    for (const phase of body.phases) {
      await tx.phase.create({
        data: {
          id: phase.id,
          projectId,
          name: phase.name,
          order: phase.order,
          hours: phase.hours,
          bufferPercent: phase.bufferPercent,
          startDate: phase.startDate ? new Date(phase.startDate) : null,
          endDate: phase.endDate ? new Date(phase.endDate) : null,
          rationale: phase.rationale,
          dependencies: phase.dependencies,
          roleHours: { create: phase.roleHours.map((rh) => ({ id: rh.id, role: rh.role, hours: rh.hours })) },
        },
      });
    }

    for (const story of body.stories) {
      await tx.story.create({
        data: {
          id: story.id,
          projectId,
          phaseId: story.phaseId,
          epic: story.epic,
          title: story.title,
          description: story.description,
          acceptanceCriteria: JSON.stringify(story.acceptanceCriteria),
          storyPoints: story.storyPoints,
          order: story.order,
          tasks: { create: story.tasks.map((t) => ({ id: t.id, title: t.title, hours: t.hours, role: t.role })) },
          testCases: {
            create: story.testCases.map((tc) => ({
              id: tc.id,
              title: tc.title,
              precondition: tc.precondition,
              steps: JSON.stringify(tc.steps),
              expectedResult: tc.expectedResult,
              priority: tc.priority,
              type: tc.type,
              order: tc.order,
            })),
          },
        },
      });
    }

    await tx.customRole.deleteMany({ where: { projectId } });
    for (const name of body.customRoles) {
      await tx.customRole.create({ data: { projectId, name } });
    }

    await tx.project.update({
      where: { id: projectId },
      data: {
        hoursPerDay: body.hoursPerDay,
        workingDays: JSON.stringify(body.workingDays),
        status: "edited",
      },
    });
  });

  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: projectInclude });
  res.json(toProjectDto(project));
});
