import type { JobListing } from "../types/jobs.js";

export type AgentPresetId = "react" | "nodejs" | "fullstack" | "embedded";

export interface AgentPresetError {
  source: string;
  error: string;
}

export interface AgentPresetResponse {
  preset: AgentPresetId;
  filters: {
    remote: true;
    location: "Argentina";
    careerArea: "Software Engineering";
    seniority: "any";
  };
  limitPerSource: number;
  jobs: JobListing[];
  errors: AgentPresetError[];
}

interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export async function fetchAgentPreset(
  preset: AgentPresetId,
  signal?: AbortSignal,
): Promise<AgentPresetResponse> {
  const requestInit: RequestInit = {};

  if (signal !== undefined) {
    requestInit.signal = signal;
  }

  const response = await fetch(`/api/v1/jobs/agent-presets/${preset}`, requestInit);
  const payload = (await response.json()) as ApiResponse<AgentPresetResponse>;

  if (!response.ok || payload.error !== null) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload.data;
}
