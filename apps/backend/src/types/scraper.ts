import type { JobListing } from "../../../../packages/shared/src/index.js";

export interface ScraperOptions {
  query?: string;
  location?: string;
  country?: string;
  careerArea?: string;
  experienceLevel?: string;
  profile?: string;
  pageSize?: number;
  maxPages?: number;
}

export interface ScraperResult {
  jobs: JobListing[];
  source: string;
  collectedAt: string;
}

export interface JobScraper {
  readonly source: string;
  scrape(options?: ScraperOptions): Promise<ScraperResult>;
}
