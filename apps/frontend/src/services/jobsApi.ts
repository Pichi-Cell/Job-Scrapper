import type { JobFilters, JobSource, SourceResult } from "../types/jobs.js";

interface ApiResponse<T> {
  data: T;
  error: string | null;
}

export async function fetchAllSources(
  filters: JobFilters,
  signal?: AbortSignal,
): Promise<SourceResult[]> {
  const results = await Promise.all(
    filters.sources.map((source) => fetchSource(source, filters, signal)),
  );

  return results;
}

async function fetchSource(
  source: JobSource,
  filters: JobFilters,
  signal?: AbortSignal,
): Promise<SourceResult> {
  const params = buildSourceParams(source, filters);

  try {
    const requestInit: RequestInit = {};

    if (signal !== undefined) {
      requestInit.signal = signal;
    }

    const response = await fetch(`/api/v1/jobs?${params.toString()}`, requestInit);
    const payload = (await response.json()) as ApiResponse<SourceResult["jobs"]>;

    if (!response.ok || payload.error !== null) {
      return {
        source,
        jobs: [],
        error: payload.error ?? `Request failed with status ${response.status}`,
      };
    }

    return {
      source,
      jobs: payload.data,
      error: null,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    return {
      source,
      jobs: [],
      error: error instanceof Error ? error.message : "Unknown request error",
    };
  }
}

function buildSourceParams(source: JobSource, filters: JobFilters): URLSearchParams {
  const params = new URLSearchParams({
    source,
    pageSize: String(filters.pageSize),
  });

  addParam(params, "query", filters.query);
  addParam(params, "location", filters.location);

  if (source === "ibm") {
    addParam(params, "country", filters.location);
    addParam(params, "careerArea", filters.careerArea);
    addParam(params, "experienceLevel", filters.experienceLevel);
  }

  if (source === "ey") {
    addParam(params, "profile", filters.eyProfile);
  }

  return params;
}

function addParam(
  params: URLSearchParams,
  key: string,
  value: string,
): void {
  if (value.trim() !== "") {
    params.set(key, value.trim());
  }
}
