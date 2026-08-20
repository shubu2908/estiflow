import type { ProjectDto, ProjectSummaryDto, CreateProjectInput, SaveEstimateInput } from "shared";
import type { GeminiModelOption } from "@/types/geminiModel";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let retryable = false;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      if (typeof body?.retryable === "boolean") retryable = body.retryable;
    } catch {
      // response wasn't JSON - fall back to the generic message
    }
    throw new ApiError(message, res.status, retryable);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.retryable = retryable;
  }
}

export const api = {
  getModels: () => request<GeminiModelOption[]>("/models"),

  listProjects: () => request<ProjectSummaryDto[]>("/projects"),
  createProject: (input: CreateProjectInput) =>
    request<ProjectDto>("/projects", { method: "POST", body: JSON.stringify(input) }),
  getProject: (id: string) => request<ProjectDto>(`/projects/${id}`),
  updateProject: (id: string, input: Partial<CreateProjectInput>) =>
    request<ProjectDto>(`/projects/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),

  saveEstimate: (id: string, input: SaveEstimateInput) =>
    request<ProjectDto>(`/projects/${id}/estimate`, { method: "PUT", body: JSON.stringify(input) }),

  generate: (id: string, files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append("files", file);
    return request<ProjectDto>(`/projects/${id}/generate`, { method: "POST", body: form });
  },

  exportUrl: (id: string, kind: string) => `/api/projects/${id}/export/${kind}`,
};
