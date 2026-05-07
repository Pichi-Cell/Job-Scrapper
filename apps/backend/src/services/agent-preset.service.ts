import type { JobListing } from "../../../../packages/shared/src/index.js";
import type { ScraperOptions } from "../types/scraper.js";
import {
  JOB_SOURCES,
  isSupportedSource,
  searchSources,
  type JobSource,
} from "./job-search.service.js";

export type AgentPresetId = "react" | "nodejs" | "fullstack" | "embedded";

export const AGENT_PRESET_LIMIT_PER_SOURCE = 30;

export interface AgentJobPreset {
  id: AgentPresetId;
  skill: string;
  filters: {
    remote: true;
    location: "Argentina";
    careerArea: "Software Engineering";
    seniority: "any";
  };
}

export interface AgentPresetSearchError {
  source: JobSource;
  error: string;
}

export interface AgentPresetSearchResult {
  preset: AgentPresetId;
  filters: AgentJobPreset["filters"];
  limitPerSource: number;
  jobs: JobListing[];
  errors: AgentPresetSearchError[];
}

export const AGENT_JOB_PRESETS: Record<AgentPresetId, AgentJobPreset> = {
  react: buildAgentJobPreset("react", "React"),
  nodejs: buildAgentJobPreset("nodejs", "Node.JS"),
  fullstack: buildAgentJobPreset("fullstack", "Fullstack"),
  embedded: buildAgentJobPreset("embedded", "Embedded"),
};

export function getAgentJobPreset(
  preset: string | undefined,
): AgentJobPreset | undefined {
  if (preset === undefined) {
    return undefined;
  }

  return AGENT_JOB_PRESETS[preset.toLowerCase() as AgentPresetId];
}

export function listAgentJobPresets(): AgentJobPreset[] {
  return Object.values(AGENT_JOB_PRESETS);
}

export async function searchAgentJobPreset(
  presetId: AgentPresetId,
  requestedSource?: string,
): Promise<AgentPresetSearchResult> {
  const preset = AGENT_JOB_PRESETS[presetId];
  const sources = requestedSource === undefined ? JOB_SOURCES : [requestedSource];
  const unsupportedSource = sources.find((source) => !isSupportedSource(source));

  if (unsupportedSource !== undefined) {
    throw new Error(`Unsupported source: ${unsupportedSource}`);
  }

  const results = await searchSources(
    sources.map((source) => ({
      source: source as JobSource,
      options: buildAgentPresetOptions(source as JobSource, preset),
    })),
  );

  return {
    preset: preset.id,
    filters: preset.filters,
    limitPerSource: AGENT_PRESET_LIMIT_PER_SOURCE,
    jobs: results.flatMap((result) => result.jobs),
    errors: results
      .filter((result) => result.error !== null)
      .map((result) => ({
        source: result.source,
        error: result.error ?? "Unknown scraper error",
      })),
  };
}

function buildAgentJobPreset(
  id: AgentPresetId,
  skill: string,
): AgentJobPreset {
  return {
    id,
    skill,
    filters: {
      remote: true,
      location: "Argentina",
      careerArea: "Software Engineering",
      seniority: "any",
    },
  };
}

function buildAgentPresetOptions(
  source: JobSource,
  preset: AgentJobPreset,
): ScraperOptions {
  const baseOptions: ScraperOptions = {
    query: preset.skill,
    location: preset.filters.location,
    country: preset.filters.location,
    pageSize: AGENT_PRESET_LIMIT_PER_SOURCE,
  };

  if (source === "ibm") {
    return {
      ...baseOptions,
      careerArea: preset.filters.careerArea,
    };
  }

  if (source === "google") {
    return {
      ...baseOptions,
      skills: `${preset.filters.careerArea} ${preset.skill}`,
      remote: preset.filters.remote,
      targetLevel: "all",
    };
  }

  if (source === "accenture") {
    return {
      ...baseOptions,
      skills: `${preset.filters.careerArea} ${preset.skill}`,
      businessArea: "industry x",
      remoteType: "Remote",
    };
  }

  if (source === "dynamite") {
    return {
      ...baseOptions,
      skills: `${preset.filters.careerArea} ${preset.skill}`,
      category: "development",
    };
  }

  return {
    ...baseOptions,
    skills: `${preset.filters.careerArea} ${preset.skill}`,
    remote: preset.filters.remote,
  };
}
