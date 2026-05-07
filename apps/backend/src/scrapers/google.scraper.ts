import vm from "node:vm";
import * as cheerio from "cheerio";
import type { JobListing } from "../../../../packages/shared/src/index.js";
import type { JobScraper, ScraperOptions, ScraperResult } from "../types/scraper.js";

const GOOGLE_CAREERS_BASE_URL =
  "https://www.google.com/about/careers/applications/";
const GOOGLE_CAREERS_RESULTS_URL = `${GOOGLE_CAREERS_BASE_URL}jobs/results/`;
const DEFAULT_LOCATION = "Argentina";
const DEFAULT_SKILLS = "Software";
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_TARGET_LEVELS = ["EARLY", "MID", "INTERN_AND_APPRENTICE"];

const TARGET_LEVELS: Record<string, string> = {
  early: "EARLY",
  mid: "MID",
  internship: "INTERN_AND_APPRENTICE",
  intern: "INTERN_AND_APPRENTICE",
  apprentice: "INTERN_AND_APPRENTICE",
  internandapprentice: "INTERN_AND_APPRENTICE",
};

export class GoogleScraper implements JobScraper {
  readonly source = "Google";

  async scrape(options: ScraperOptions = {}): Promise<ScraperResult> {
    const url = buildGoogleSearchUrl(options);
    const response = await fetch(url, {
      headers: {
        accept: "text/html",
        "user-agent": "JobScraper/0.1 (+respectful research scraper)",
      },
    });

    if (!response.ok) {
      throw new Error(`Google careers request failed with status ${response.status}`);
    }

    const html = await response.text();
    const detailUrlById = extractDetailUrlsById(html);
    const jobs = extractGoogleJobs(html, detailUrlById).slice(
      0,
      options.pageSize ?? DEFAULT_PAGE_SIZE,
    );

    return {
      jobs,
      source: this.source,
      collectedAt: new Date().toISOString(),
    };
  }
}

interface GoogleInitDataCallback {
  key?: string;
  data?: unknown[];
}

type GoogleJobRecord = unknown[];

function buildGoogleSearchUrl(options: ScraperOptions): URL {
  const url = new URL(GOOGLE_CAREERS_RESULTS_URL);
  const params = url.searchParams;

  params.set("q", options.query ?? "");
  params.set("hl", "en-US");
  params.set("location", options.location ?? options.country ?? DEFAULT_LOCATION);
  params.set("has_remote", String(options.remote ?? true));
  params.set("skills", options.skills ?? options.careerArea ?? DEFAULT_SKILLS);

  for (const targetLevel of getTargetLevels(options)) {
    params.append("target_level", targetLevel);
  }

  return url;
}

function getTargetLevels(options: ScraperOptions): string[] {
  const configuredLevel = options.targetLevel ?? options.experienceLevel;

  if (configuredLevel === undefined) {
    return DEFAULT_TARGET_LEVELS;
  }

  if (normalizeFilterKey(configuredLevel) === "all") {
    return [];
  }

  const levels = configuredLevel
    .split(",")
    .map((level) => level.trim())
    .filter((level) => level !== "")
    .map((level) => TARGET_LEVELS[normalizeFilterKey(level)] ?? level);

  return levels.length > 0 ? levels : DEFAULT_TARGET_LEVELS;
}

function extractGoogleJobs(
  html: string,
  detailUrlById: Map<string, string>,
): JobListing[] {
  const callback = extractGoogleJobsCallback(html);
  const jobRecords = callback?.data?.[0];

  if (!Array.isArray(jobRecords)) {
    return [];
  }

  return jobRecords
    .filter(Array.isArray)
    .map((record) => mapGoogleJobRecord(record, detailUrlById));
}

function extractGoogleJobsCallback(
  html: string,
): GoogleInitDataCallback | undefined {
  const callbacks = [...html.matchAll(/AF_initDataCallback\((.*?)\);/gs)];

  for (const callback of callbacks) {
    const rawObject = callback[1];

    if (rawObject === undefined || !rawObject.includes("ds:1")) {
      continue;
    }

    const parsed = vm.runInNewContext(`(${rawObject})`) as GoogleInitDataCallback;

    if (parsed.key === "ds:1") {
      return parsed;
    }
  }

  return undefined;
}

function mapGoogleJobRecord(
  record: GoogleJobRecord,
  detailUrlById: Map<string, string>,
): JobListing {
  const id = getString(record[0]) ?? "unknown-google-job";
  const title = getString(record[1]) ?? "Untitled Google role";
  const applyUrl = getString(record[2]);
  const detailUrl = detailUrlById.get(id);
  const locations = getLocations(record[9]);
  const description = normalizeText(stripHtml(getHtmlSection(record[10])));
  const datePosted = getDateFromTimestamp(record[12]);
  const remote = inferRemote(getHtmlSection(record[18]));

  const jobListing: JobListing = {
    id,
    title,
    company: getString(record[7]) ?? "Google",
    url: detailUrl ?? applyUrl ?? GOOGLE_CAREERS_RESULTS_URL,
    source: "Google",
  };

  if (locations !== undefined) {
    jobListing.location = locations;
  }

  if (description !== undefined) {
    jobListing.description = description;
  }

  if (datePosted !== undefined) {
    jobListing.datePosted = datePosted;
  }

  if (remote !== undefined) {
    jobListing.remote = remote;
  }

  return jobListing;
}

function extractDetailUrlsById(html: string): Map<string, string> {
  const $ = cheerio.load(html);
  const urls = new Map<string, string>();

  $("li[ssk]").each((_index, element) => {
    const id = normalizeGoogleCardId($(element).attr("ssk"));
    const href = $(element).find('a[href*="jobs/results/"]').first().attr("href");

    if (id !== undefined && href !== undefined) {
      urls.set(id, new URL(href, GOOGLE_CAREERS_BASE_URL).toString());
    }
  });

  return urls;
}

function normalizeGoogleCardId(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value.split(":").at(-1);
}

function getLocations(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const locations = value
    .map((location) => {
      if (Array.isArray(location)) {
        return getString(location[0]);
      }

      return undefined;
    })
    .filter(isDefined);

  return locations.length > 0 ? locations.join("; ") : undefined;
}

function getHtmlSection(value: unknown): string | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return getString(value[1]);
}

function getDateFromTimestamp(value: unknown): string | undefined {
  if (!Array.isArray(value) || typeof value[0] !== "number") {
    return undefined;
  }

  return new Date(value[0] * 1000).toISOString();
}

function inferRemote(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  const strippedValue = stripHtml(value);
  return strippedValue === undefined ? undefined : /remote/i.test(strippedValue);
}

function stripHtml(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return cheerio.load(value).text();
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized === "" ? undefined : normalized;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeFilterKey(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
