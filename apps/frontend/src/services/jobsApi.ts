import type { JobFilters, JobSource, SourceResult } from "../types/jobs.js";

const ACCENTURE_BUSINESS_AREA = "industry x";

interface AreaTranslation {
  ibmCareerArea?: string;
  skills?: string;
  dynamiteCategory?: string;
}

const AREA_TRANSLATIONS: Record<string, AreaTranslation> = {
  "software-engineering": {
    ibmCareerArea: "Software Engineering",
    skills: "software engineering",
    dynamiteCategory: "development",
  },
  marketing: {
    skills: "marketing",
    dynamiteCategory: "marketing",
  },
  "customer-support": {
    skills: "customer support",
    dynamiteCategory: "customer-support",
  },
  sales: {
    skills: "sales",
    dynamiteCategory: "sales",
  },
  operations: {
    skills: "operations",
    dynamiteCategory: "operations",
  },
  product: {
    skills: "product",
    dynamiteCategory: "product",
  },
  design: {
    skills: "design",
    dynamiteCategory: "design",
  },
};

const IBM_LEVELS: Record<string, string> = {
  intern: "Internship",
  entry: "Entry Level",
  professional: "Professional",
};

const GOOGLE_TARGET_LEVELS: Record<string, string> = {
  "early-mid-intern": "EARLY,MID,INTERN_AND_APPRENTICE",
  intern: "INTERN_AND_APPRENTICE",
  entry: "EARLY",
  mid: "MID",
  professional: "MID",
};

const ACCENTURE_EXPERIENCE_LEVELS: Record<string, string> = {
  intern: "Internship",
  entry: "Entry Level",
  mid: "Experienced",
  professional: "Experienced",
};

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

export function buildSourceParams(
  source: JobSource,
  filters: JobFilters,
): URLSearchParams {
  const area = translateArea(filters.area);
  const skills = area.skills ?? filters.query;

  const params = new URLSearchParams({
    source,
    pageSize: String(filters.pageSize),
  });

  addParam(params, "query", filters.query);
  addParam(params, "location", filters.location);

  if (source === "ibm") {
    addParam(params, "country", filters.location);
    addParam(params, "careerArea", area.ibmCareerArea);
    addParam(params, "experienceLevel", IBM_LEVELS[filters.level]);
  }

  if (source === "ey") {
    addParam(params, "profile", filters.profile);
  }

  if (source === "google") {
    addParam(params, "skills", skills);
    addParam(params, "targetLevel", GOOGLE_TARGET_LEVELS[filters.level]);
    params.set("remote", String(filters.remote));
  }

  if (source === "accenture") {
    addParam(params, "skills", skills);
    addParam(params, "businessArea", ACCENTURE_BUSINESS_AREA);
    addParam(params, "remoteType", filters.remote ? "Remote" : "");
    addParam(params, "yearsOfExperience", ACCENTURE_EXPERIENCE_LEVELS[filters.level]);
  }

  if (source === "dynamite") {
    addParam(params, "skills", skills);
    addParam(params, "category", area.dynamiteCategory);
    params.set("hasPublicSalary", String(filters.dynamitePublicSalary));
    params.set("includeClosed", String(filters.dynamiteIncludeClosed));
  }

  if (source === "linkedin") {
    addParam(params, "skills", skills);
    params.set("remote", String(filters.remote));
  }

  if (source === "wellfound") {
    addParam(params, "skills", skills);
    params.set("remote", String(filters.remote));
  }

  return params;
}

function translateArea(area: string): AreaTranslation {
  if (area.trim() === "") {
    return {};
  }

  return AREA_TRANSLATIONS[area] ?? {
    ibmCareerArea: area,
    skills: area,
    dynamiteCategory: area,
  };
}

function addParam(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value === undefined) {
    return;
  }

  if (value.trim() !== "") {
    params.set(key, value.trim());
  }
}
