import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { ProjectDto, PhaseDto, StoryDto, TaskDto, TestCaseDto } from "shared";
import { calculateTimeline } from "shared";
import { api } from "@/lib/api";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface EstimateState {
  project: ProjectDto | null;
  saveStatus: SaveStatus;
  saveError: string | null;

  load: (project: ProjectDto) => void;

  updatePhase: (phaseId: string, patch: Partial<Pick<PhaseDto, "hours" | "bufferPercent" | "rationale" | "dependencies">>) => void;
  addRoleHour: (phaseId: string, role: string) => void;
  updateRoleHour: (phaseId: string, roleHourId: string, hours: number) => void;
  removeRoleHour: (phaseId: string, roleHourId: string) => void;
  setRoleHour: (phaseId: string, role: string, hours: number) => void;

  updateStory: (storyId: string, patch: Partial<Pick<StoryDto, "title" | "description" | "storyPoints" | "phaseId" | "epic">>) => void;
  updateAcceptanceCriteria: (storyId: string, criteria: string[]) => void;

  updateTask: (storyId: string, taskId: string, patch: Partial<Pick<TaskDto, "title" | "hours" | "role">>) => void;
  addTask: (storyId: string) => void;
  removeTask: (storyId: string, taskId: string) => void;

  updateTestCase: (storyId: string, testCaseId: string, patch: Partial<Omit<TestCaseDto, "id" | "order">>) => void;
  addTestCase: (storyId: string) => void;
  removeTestCase: (storyId: string, testCaseId: string) => void;

  updateHoursPerDay: (hoursPerDay: number) => void;
  toggleWorkingDay: (day: number) => void;
  addCustomRole: (name: string) => void;
  removeCustomRole: (name: string) => void;

  save: () => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function newId(): string {
  return crypto.randomUUID();
}

function recalcDates(project: ProjectDto) {
  const timeline = calculateTimeline(
    project.phases.map((p) => ({ hours: p.hours, bufferPercent: p.bufferPercent })),
    project.devStartDate,
    project.hoursPerDay,
    project.workingDays
  );
  project.phases.forEach((phase, i) => {
    phase.startDate = timeline[i].startDate;
    phase.endDate = timeline[i].endDate;
  });
}

export const useEstimateStore = create<EstimateState>()(
  immer((set, get) => {
    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        void get().save();
      }, 800);
    }

    return {
      project: null,
      saveStatus: "idle",
      saveError: null,

      load: (project) =>
        set((state) => {
          state.project = project;
          state.saveStatus = "idle";
          state.saveError = null;
        }),

      updatePhase: (phaseId, patch) => {
        set((state) => {
          if (!state.project) return;
          const phase = state.project.phases.find((p) => p.id === phaseId);
          if (!phase) return;
          Object.assign(phase, patch);
          recalcDates(state.project);
        });
        scheduleSave();
      },

      addRoleHour: (phaseId, role) => {
        set((state) => {
          const phase = state.project?.phases.find((p) => p.id === phaseId);
          phase?.roleHours.push({ id: newId(), role, hours: 0 });
        });
        scheduleSave();
      },

      updateRoleHour: (phaseId, roleHourId, hours) => {
        set((state) => {
          const phase = state.project?.phases.find((p) => p.id === phaseId);
          const rh = phase?.roleHours.find((r) => r.id === roleHourId);
          if (rh) rh.hours = hours;
        });
        scheduleSave();
      },

      removeRoleHour: (phaseId, roleHourId) => {
        set((state) => {
          const phase = state.project?.phases.find((p) => p.id === phaseId);
          if (!phase) return;
          phase.roleHours = phase.roleHours.filter((r) => r.id !== roleHourId);
        });
        scheduleSave();
      },

      setRoleHour: (phaseId, role, hours) => {
        set((state) => {
          const phase = state.project?.phases.find((p) => p.id === phaseId);
          if (!phase) return;
          const existing = phase.roleHours.find((r) => r.role === role);
          if (existing) existing.hours = hours;
          else phase.roleHours.push({ id: newId(), role, hours });
        });
        scheduleSave();
      },

      updateStory: (storyId, patch) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          if (story) Object.assign(story, patch);
        });
        scheduleSave();
      },

      updateAcceptanceCriteria: (storyId, criteria) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          if (story) story.acceptanceCriteria = criteria;
        });
        scheduleSave();
      },

      updateTask: (storyId, taskId, patch) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          const task = story?.tasks.find((t) => t.id === taskId);
          if (task) Object.assign(task, patch);
        });
        scheduleSave();
      },

      addTask: (storyId) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          story?.tasks.push({ id: newId(), title: "New task", hours: 0, role: "Developer" });
        });
        scheduleSave();
      },

      removeTask: (storyId, taskId) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          if (!story) return;
          story.tasks = story.tasks.filter((t) => t.id !== taskId);
        });
        scheduleSave();
      },

      updateTestCase: (storyId, testCaseId, patch) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          const tc = story?.testCases.find((t) => t.id === testCaseId);
          if (tc) Object.assign(tc, patch);
        });
        scheduleSave();
      },

      addTestCase: (storyId) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          if (!story) return;
          story.testCases.push({
            id: newId(),
            title: "New test case",
            precondition: "",
            steps: [""],
            expectedResult: "",
            priority: "Med",
            type: "Functional",
            order: story.testCases.length,
          });
        });
        scheduleSave();
      },

      removeTestCase: (storyId, testCaseId) => {
        set((state) => {
          const story = state.project?.stories.find((s) => s.id === storyId);
          if (!story) return;
          story.testCases = story.testCases.filter((t) => t.id !== testCaseId);
        });
        scheduleSave();
      },

      updateHoursPerDay: (hoursPerDay) => {
        set((state) => {
          if (!state.project) return;
          state.project.hoursPerDay = hoursPerDay;
          recalcDates(state.project);
        });
        scheduleSave();
      },

      toggleWorkingDay: (day) => {
        set((state) => {
          if (!state.project) return;
          const days = new Set(state.project.workingDays);
          if (days.has(day)) days.delete(day);
          else days.add(day);
          if (days.size === 0) return; // never allow zero working days
          state.project.workingDays = Array.from(days).sort();
          recalcDates(state.project);
        });
        scheduleSave();
      },

      addCustomRole: (name) => {
        set((state) => {
          if (!state.project || state.project.customRoles.includes(name)) return;
          state.project.customRoles.push(name);
        });
        scheduleSave();
      },

      removeCustomRole: (name) => {
        set((state) => {
          if (!state.project) return;
          state.project.customRoles = state.project.customRoles.filter((r) => r !== name);
        });
        scheduleSave();
      },

      save: async () => {
        const project = get().project;
        if (!project) return;
        set((state) => {
          state.saveStatus = "saving";
        });
        try {
          const updated = await api.saveEstimate(project.id, {
            hoursPerDay: project.hoursPerDay,
            workingDays: project.workingDays,
            phases: project.phases,
            stories: project.stories,
            customRoles: project.customRoles,
          });
          set((state) => {
            state.project = updated;
            state.saveStatus = "saved";
          });
        } catch (err) {
          set((state) => {
            state.saveStatus = "error";
            state.saveError = err instanceof Error ? err.message : "Failed to save changes.";
          });
        }
      },
    };
  })
);
