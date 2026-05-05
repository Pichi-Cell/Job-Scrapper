import type { JobListing } from "../../../../packages/shared/src/index.js";

export type JobSource = "ibm" | "ey" | "google" | "accenture" | "stripe";

export interface JobFilters {
  sources: JobSource[];
  query: string;
  location: string;
  careerArea: string;
  experienceLevel: string;
  eyProfile: string;
  googleSkills: string;
  googleTargetLevel: string;
  googleRemote: boolean;
  accentureSkills: string;
  accentureRemoteType: string;
  accentureExperience: string;
  pageSize: number;
}

export interface SourceResult {
  source: JobSource;
  jobs: JobListing[];
  error: string | null;
}

export type { JobListing };
