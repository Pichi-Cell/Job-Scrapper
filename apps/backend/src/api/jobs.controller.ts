import type { Request, Response } from "express";
import type { JobListing } from "../../../../packages/shared/src/index.js";
import type { ScraperOptions } from "../types/scraper.js";
import { isSupportedSource, searchSource } from "../services/job-search.service.js";
import { fail, ok } from "./response.js";

export async function handleJobsRequest(
  request: Request,
  response: Response,
): Promise<void> {
  const source = getQueryString(request.query.source) ?? "ibm";

  if (!isSupportedSource(source)) {
    response.status(400).json(fail(`Unsupported source: ${source}`));
    return;
  }

  const result = await searchSource({
    source,
    options: buildScraperOptions(request),
  });

  if (result.error !== null) {
    response.status(502).json(fail(result.error));
    return;
  }

  response.status(200).json(ok<JobListing[]>(result.jobs));
}

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
  const category = getQueryString(request.query.category);
  const remote = parseBoolean(getQueryString(request.query.remote));
  const hasPublicSalary = parseBoolean(
    getQueryString(request.query.hasPublicSalary),
  );
  const includeClosed = parseBoolean(getQueryString(request.query.includeClosed));
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

  if (category !== undefined) {
    options.category = category;
  }

  if (remote !== undefined) {
    options.remote = remote;
  }

  if (hasPublicSalary !== undefined) {
    options.hasPublicSalary = hasPublicSalary;
  }

  if (includeClosed !== undefined) {
    options.includeClosed = includeClosed;
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
