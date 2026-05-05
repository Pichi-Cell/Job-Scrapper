import type { JobListing } from "../../../../packages/shared/src/index.js";

export type JobSource = "ibm" | "ey";

export interface JobFilters {
  sources: JobSource[];
  query: string;
  location: string;
  careerArea: string;
  experienceLevel: string;
  eyProfile: string;
  pageSize: number;
}

export interface SourceResult {
  source: JobSource;
  jobs: JobListing[];
  error: string | null;
}

export type { JobListing };

