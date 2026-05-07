import type { JobListing } from "../../../../packages/shared/src/index.js";
import {
  AccentureScraper,
  BumeranScraper,
  DynamiteScraper,
  EyScraper,
  GoogleScraper,
  IbmTalentScraper,
  StripeScraper,
} from "../scrapers/index.js";
import type { ScraperOptions } from "../types/scraper.js";

const ibmTalentScraper = new IbmTalentScraper();
const eyScraper = new EyScraper();
const googleScraper = new GoogleScraper();
const accentureScraper = new AccentureScraper();
const stripeScraper = new StripeScraper();
const dynamiteScraper = new DynamiteScraper();
const bumeranScraper = new BumeranScraper();

export type JobSource =
  | "ibm"
  | "ey"
  | "google"
  | "accenture"
  | "stripe"
  | "dynamite"
  | "bumeran";

export const JOB_SOURCES: JobSource[] = [
  "ibm",
  "ey",
  "google",
  "accenture",
  "stripe",
  "dynamite",
  "bumeran",
];

export interface SourceSearchRequest {
  source: JobSource;
  options: ScraperOptions;
}

export interface SourceSearchResult {
  source: JobSource;
  jobs: JobListing[];
  error: string | null;
}

export async function searchSource(
  request: SourceSearchRequest,
): Promise<SourceSearchResult> {
  const scraper = getScraper(request.source);

  if (scraper === undefined) {
    return {
      source: request.source,
      jobs: [],
      error: `Unsupported source: ${request.source}`,
    };
  }

  try {
    const result = await scraper.scrape(request.options);

    return {
      source: request.source,
      jobs: result.jobs,
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraper error";
    console.error(`[scraper:${request.source}] ${message}`, error);

    return {
      source: request.source,
      jobs: [],
      error: message,
    };
  }
}

export async function searchSources(
  requests: SourceSearchRequest[],
): Promise<SourceSearchResult[]> {
  return Promise.all(requests.map((request) => searchSource(request)));
}

export function isSupportedSource(source: string): source is JobSource {
  return getScraper(source) !== undefined;
}

function getScraper(source: string): JobSourceScraper | undefined {
  const normalizedSource = source.toLowerCase();

  if (normalizedSource === "ibm") {
    return ibmTalentScraper;
  }

  if (normalizedSource === "ey") {
    return eyScraper;
  }

  if (normalizedSource === "google") {
    return googleScraper;
  }

  if (normalizedSource === "accenture") {
    return accentureScraper;
  }

  if (normalizedSource === "stripe") {
    return stripeScraper;
  }

  if (normalizedSource === "dynamite") {
    return dynamiteScraper;
  }

  if (normalizedSource === "bumeran") {
    return bumeranScraper;
  }

  return undefined;
}

type JobSourceScraper =
  | IbmTalentScraper
  | EyScraper
  | GoogleScraper
  | AccentureScraper
  | StripeScraper
  | DynamiteScraper
  | BumeranScraper;
