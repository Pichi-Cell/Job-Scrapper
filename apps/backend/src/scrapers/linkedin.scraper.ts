import type { JobListing } from "../../../../packages/shared/src/index.js";
import {
  parseLinkedInJobDetail,
  parseLinkedInJobs,
} from "../parsers/linkedin.parser.js";
import type { JobScraper, ScraperOptions, ScraperResult } from "../types/scraper.js";
import { DomainRateLimiter } from "../utils/rate-limit.js";
import { sleep } from "../utils/sleep.js";

const LINKEDIN_SEARCH_URL =
  "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const DEFAULT_LOCATION = "Argentina";
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGES = 1;
const LINKEDIN_PAGE_SIZE = 25;
const REQUEST_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;

const rateLimiter = new DomainRateLimiter(3_000);

export class LinkedInScraper implements JobScraper {
  readonly source = "LinkedIn";

  async scrape(options: ScraperOptions = {}): Promise<ScraperResult> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    const jobs: JobListing[] = [];

    for (let page = 0; page < maxPages && jobs.length < pageSize; page += 1) {
      const html = await fetchLinkedInSearch(buildLinkedInSearchUrl(options, page));
      const pageJobs = parseLinkedInJobs(html);

      if (pageJobs.length === 0) {
        break;
      }

      jobs.push(...pageJobs);
    }

    const uniqueJobs = dedupeJobs(jobs).slice(0, pageSize);

    return {
      jobs: await enrichLinkedInJobs(uniqueJobs),
      source: this.source,
      collectedAt: new Date().toISOString(),
    };
  }
}

function buildLinkedInSearchUrl(options: ScraperOptions, page: number): URL {
  const url = new URL(LINKEDIN_SEARCH_URL);
  const params = url.searchParams;
  const keywords = buildKeywords(options);

  if (keywords !== "") {
    params.set("keywords", keywords);
  }

  params.set("location", options.location ?? options.country ?? DEFAULT_LOCATION);
  params.set("start", String(page * LINKEDIN_PAGE_SIZE));

  if (options.remote === true || options.remoteType?.toLowerCase() === "remote") {
    params.set("f_WT", "2");
  }

  return url;
}

async function fetchLinkedInSearch(url: URL): Promise<string> {
  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      await rateLimiter.waitFor(url);

      const response = await fetch(url, {
        headers: {
          accept: "text/html,application/xhtml+xml",
          "user-agent": "JobScraper/0.1 (+respectful research scraper)",
        },
        signal: controller.signal,
      });

      if (isBlockedStatus(response.status)) {
        throw new Error(
          `LinkedIn public jobs request was blocked with status ${response.status}; authentication, CAPTCHA, and challenge bypass are not supported`,
        );
      }

      if (!response.ok) {
        throw new Error(
          `LinkedIn public jobs request failed with status ${response.status}`,
        );
      }

      return await response.text();
    } catch (error) {
      if (attempt === REQUEST_RETRIES || isLinkedInPolicyError(error)) {
        throw error;
      }

      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("LinkedIn public jobs request failed without a response");
}

async function enrichLinkedInJobs(jobs: JobListing[]): Promise<JobListing[]> {
  const enrichedJobs: JobListing[] = [];

  for (const job of jobs) {
    enrichedJobs.push(await enrichLinkedInJob(job));
  }

  return enrichedJobs;
}

async function enrichLinkedInJob(job: JobListing): Promise<JobListing> {
  try {
    const html = await fetchLinkedInSearch(buildLinkedInDetailUrl(job.id));
    const detail = parseLinkedInJobDetail(html);

    return {
      ...job,
      ...detail,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `[scraper:LinkedIn] Could not fetch job detail for ${job.url}: ${message}`,
    );
    return job;
  }
}

function buildLinkedInDetailUrl(jobId: string): URL {
  return new URL(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`);
}

function buildKeywords(options: ScraperOptions): string {
  return [options.query, options.skills, options.careerArea]
    .map((value) => value?.trim())
    .filter(isNonEmptyString)
    .join(" ");
}

function dedupeJobs<T extends { url: string }>(jobs: T[]): T[] {
  return [...new Map(jobs.map((job) => [job.url, job])).values()];
}

function isBlockedStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status === 999;
}

function isLinkedInPolicyError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("challenge bypass");
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
