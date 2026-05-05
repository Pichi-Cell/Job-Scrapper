import type { Request, Response } from "express";
import type { JobListing } from "../../../../packages/shared/src/index.js";
import {
  AccentureScraper,
  EyScraper,
  GoogleScraper,
  IbmTalentScraper,
  StripeScraper,
} from "../scrapers/index.js";
import type { ScraperOptions } from "../types/scraper.js";
import { fail, ok } from "./response.js";

const ibmTalentScraper = new IbmTalentScraper();
const eyScraper = new EyScraper();
const googleScraper = new GoogleScraper();
const accentureScraper = new AccentureScraper();
const stripeScraper = new StripeScraper();

export async function handleJobsRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const source = getQueryString(request.query.source) ?? "ibm";
  const scraper = getScraper(source);

  if (scraper === undefined) {
    response.status(400).json(fail(`Unsupported source: ${source}`));
    return;
  }

  try {
    const result = await scraper.scrape(
      buildScraperOptions(request),
    );

    response.status(200).json(ok<JobListing[]>(result.jobs));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraper error";
    console.error(`[scraper:${source}] ${message}`, error);
    response.status(502).json(fail(message));
  }
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

  return undefined;
}

type JobSourceScraper =
  | IbmTalentScraper
  | EyScraper
  | GoogleScraper
  | AccentureScraper
  | StripeScraper;

function buildScraperOptions(request: Request): ScraperOptions {
  const options: ScraperOptions = {};
  const query = getQueryString(request.query.query);
  const location = getQueryString(request.query.location);
  const country = getQueryString(request.query.country);
  const careerArea = getQueryString(request.query.careerArea);
  const experienceLevel = getQueryString(request.query.experienceLevel);
  const profile = getQueryString(request.query.profile);
  const skills = getQueryString(request.query.skills);
  const targetLevel = getQueryString(request.query.targetLevel);
  const businessArea = getQueryString(request.query.businessArea);
  const remoteType = getQueryString(request.query.remoteType);
  const yearsOfExperience = getQueryString(request.query.yearsOfExperience);
  const employeeType = getQueryString(request.query.employeeType);
  const specialization = getQueryString(request.query.specialization);
  const remote = parseBoolean(getQueryString(request.query.remote));
  const pageSize = parsePositiveInteger(getQueryString(request.query.pageSize));
  const maxPages = parsePositiveInteger(getQueryString(request.query.maxPages));

  if (query !== undefined) {
    options.query = query;
  }

  if (location !== undefined) {
    options.location = location;
  }

  if (country !== undefined) {
    options.country = country;
  }

  if (careerArea !== undefined) {
    options.careerArea = careerArea;
  }

  if (experienceLevel !== undefined) {
    options.experienceLevel = experienceLevel;
  }

  if (profile !== undefined) {
    options.profile = profile;
  }

  if (skills !== undefined) {
    options.skills = skills;
  }

  if (targetLevel !== undefined) {
    options.targetLevel = targetLevel;
  }

  if (businessArea !== undefined) {
    options.businessArea = businessArea;
  }

  if (remoteType !== undefined) {
    options.remoteType = remoteType;
  }

  if (yearsOfExperience !== undefined) {
    options.yearsOfExperience = yearsOfExperience;
  }

  if (employeeType !== undefined) {
    options.employeeType = employeeType;
  }

  if (specialization !== undefined) {
    options.specialization = specialization;
  }

  if (remote !== undefined) {
    options.remote = remote;
  }

  if (pageSize !== undefined) {
    options.pageSize = pageSize;
  }

  if (maxPages !== undefined) {
    options.maxPages = maxPages;
  }

  return options;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value.toLowerCase() === "true") {
    return true;
  }

  if (value.toLowerCase() === "false") {
    return false;
  }

  return undefined;
}

function getQueryString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return undefined;
}
