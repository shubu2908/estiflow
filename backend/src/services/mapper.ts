import { Prisma } from "@prisma/client";
import type { ProjectDto, ProjectSummaryDto } from "shared";

const projectWithRelations = Prisma.validator<Prisma.ProjectDefaultArgs>()({
  include: {
    phases: { include: { roleHours: true }, orderBy: { order: "asc" } },
    stories: { include: { tasks: true, testCases: { orderBy: { order: "asc" } } }, orderBy: { order: "asc" } },
    customRoles: true,
  },
});

export type ProjectWithRelations = Prisma.ProjectGetPayload<typeof projectWithRelations>;
export const projectInclude = projectWithRelations.include;

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

export function toProjectDto(project: ProjectWithRelations): ProjectDto {
  return {
    id: project.id,
    name: project.name,
    technology: JSON.parse(project.technology),
    devStartDate: project.devStartDate.toISOString(),
    geminiModel: project.geminiModel,
    complexityOverride: project.complexityOverride as ProjectDto["complexityOverride"],
    aiComplexity: project.aiComplexity as ProjectDto["aiComplexity"],
    assumptions: JSON.parse(project.assumptions),
    hoursPerDay: project.hoursPerDay,
    workingDays: JSON.parse(project.workingDays),
    status: project.status as ProjectDto["status"],
    customRoles: project.customRoles.map((r) => r.name),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    phases: project.phases.map((phase) => ({
      id: phase.id,
      name: phase.name as ProjectDto["phases"][number]["name"],
      order: phase.order,
      hours: phase.hours,
      bufferPercent: phase.bufferPercent,
      startDate: toIso(phase.startDate),
      endDate: toIso(phase.endDate),
      rationale: phase.rationale,
      dependencies: phase.dependencies,
      roleHours: phase.roleHours.map((rh) => ({ id: rh.id, role: rh.role, hours: rh.hours })),
    })),
    stories: project.stories.map((story) => ({
      id: story.id,
      epic: story.epic,
      title: story.title,
      description: story.description,
      acceptanceCriteria: JSON.parse(story.acceptanceCriteria),
      storyPoints: story.storyPoints as ProjectDto["stories"][number]["storyPoints"],
      phaseId: story.phaseId,
      order: story.order,
      tasks: story.tasks.map((t) => ({ id: t.id, title: t.title, hours: t.hours, role: t.role })),
      testCases: story.testCases.map((tc) => ({
        id: tc.id,
        title: tc.title,
        precondition: tc.precondition,
        steps: JSON.parse(tc.steps),
        expectedResult: tc.expectedResult,
        priority: tc.priority as ProjectDto["stories"][number]["testCases"][number]["priority"],
        type: tc.type as ProjectDto["stories"][number]["testCases"][number]["type"],
        order: tc.order,
      })),
    })),
  };
}

export function toProjectSummaryDto(project: ProjectWithRelations): ProjectSummaryDto {
  return {
    id: project.id,
    name: project.name,
    technology: JSON.parse(project.technology),
    devStartDate: project.devStartDate.toISOString(),
    geminiModel: project.geminiModel,
    status: project.status as ProjectSummaryDto["status"],
    aiComplexity: project.aiComplexity as ProjectSummaryDto["aiComplexity"],
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
