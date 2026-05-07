import type { JobListing } from "../../../../packages/shared/src/index.js";

export type JobSource =
  | "ibm"
  | "ey"
  | "google"
  | "accenture"
  | "stripe"
  | "dynamite"
  | "bumeran";

export interface JobFilters {
  sources: JobSource[];
  query: string;
  location: string;
  area: string;
  level: string;
  profile: string;
  remote: boolean;
  dynamitePublicSalary: boolean;
  dynamiteIncludeClosed: boolean;
  pageSize: number;
}

export interface SourceResult {
  source: JobSource;
  jobs: JobListing[];
  error: string | null;
}

export interface AlertSourceFilter {
  source: JobSource;
  options: Record<string, string>;
}

export interface JobAlert {
  id: string;
  name: string;
  filters: AlertSourceFilter[];
  createdAt: string;
  lastCheckedAt: string | null;
  lastMatchCount: number;
  isPolling: boolean;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  alertName: string;
  createdAt: string;
  jobs: JobListing[];
}

export type { JobListing };
