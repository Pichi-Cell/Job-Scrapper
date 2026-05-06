import * as cheerio from "cheerio";
import type { JobListing } from "../../../../packages/shared/src/index.js";

const DYNAMITE_BASE_URL = "https://dynamitejobs.com";

export interface DynamiteSearchResponse {
  hits?: unknown[];
}

export function parseDynamiteJobs(payload: DynamiteSearchResponse): JobListing[] {
  return (payload.hits ?? [])
    .map(mapDynamiteHitToJobListing)
    .filter(isDefined);
}

function mapDynamiteHitToJobListing(hit: unknown): JobListing | undefined {
  if (!isRecord(hit)) {
    return undefined;
  }

  const id = getString(hit.objectID);
  const title = getString(hit.title);
  const company = getCompanyName(hit.company);
  const url = buildDynamiteJobUrl(hit);

  if (id === undefined || title === undefined || url === undefined) {
    return undefined;
  }

  const jobListing: JobListing = {
    id,
    title,
    company: company ?? "Dynamite Jobs",
    url,
    source: "Dynamite Jobs",
  };

  const location = getLocation(hit);
  if (location !== undefined) {
    jobListing.location = location;
  }

  const salary = getSalary(hit);
  if (salary !== undefined) {
    jobListing.salary = salary;
  }

  const description = normalizeText(stripHtml(getString(hit.description)));
  if (description !== undefined) {
    jobListing.description = description;
  }

  const datePosted = getIsoDate(hit.publishedAt);
  if (datePosted !== undefined) {
    jobListing.datePosted = datePosted;
  }

  jobListing.remote = true;

  return jobListing;
}

function buildDynamiteJobUrl(hit: Record<string, unknown>): string | undefined {
  const company = hit.company;
  const companySlug = isRecord(company) ? getString(company.usernameLow) : undefined;
  const jobSlug = getString(hit.slug);

  if (companySlug !== undefined && jobSlug !== undefined) {
    return `${DYNAMITE_BASE_URL}/company/${companySlug}/remote-job/${jobSlug}`;
  }

  const id = getString(hit.objectID);
  return id === undefined ? undefined : `${DYNAMITE_BASE_URL}/jid/${id}`;
}

function getCompanyName(value: unknown): string | undefined {
  return isRecord(value) ? getString(value.name) : undefined;
}

function getLocation(hit: Record<string, unknown>): string | undefined {
  const locations = hit.locations;
  if (Array.isArray(locations)) {
    const names = locations
      .map((location) => (isRecord(location) ? getString(location.name) : undefined))
      .filter(isDefined);

    if (names.length > 0) {
      return names.join("; ");
    }
  }

  const locationSlugs = hit.locationSlugs;
  if (Array.isArray(locationSlugs)) {
    const names = locationSlugs.map(getString).filter(isDefined);
    return names.length > 0 ? names.join("; ") : undefined;
  }

  return undefined;
}

function getSalary(hit: Record<string, unknown>): string | undefined {
  const salary = hit.salary;
  if (!isRecord(salary)) {
    return undefined;
  }

  const minimum = getNumber(salary.minimum ?? salary.min);
  const maximum = getNumber(salary.maximum ?? salary.max);
  const currency = getString(salary.currency) ?? "USD";

  if (minimum !== undefined && maximum !== undefined) {
    return `${currency} ${minimum}-${maximum}`;
  }

  if (minimum !== undefined) {
    return `${currency} ${minimum}+`;
  }

  return undefined;
}

function getIsoDate(value: unknown): string | undefined {
  const timestamp = getNumber(value);
  return timestamp === undefined ? undefined : new Date(timestamp).toISOString();
}

function stripHtml(value: string | undefined): string | undefined {
  return value === undefined ? undefined : cheerio.load(value).text();
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized === "" ? undefined : normalized;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
