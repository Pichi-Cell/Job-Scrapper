import type { JobListing } from "../../../../packages/shared/src/index.js";
import {
  parseWellfoundJobDetail,
  parseWellfoundJobs,
} from "../parsers/wellfound.parser.js";
import type { JobScraper, ScraperOptions, ScraperResult } from "../types/scraper.js";
import { DomainRateLimiter } from "../utils/rate-limit.js";
import { sleep } from "../utils/sleep.js";

const WELLFOUND_BASE_URL = "https://wellfound.com";
const WELLFOUND_JOBS_URL = `${WELLFOUND_BASE_URL}/jobs`;
const WELLFOUND_REMOTE_URL = `${WELLFOUND_BASE_URL}/remote`;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_MAX_PAGES = 1;
const REQUEST_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;

const rateLimiter = new DomainRateLimiter(3_000);

export class WellfoundScraper implements JobScraper {
  readonly source = "Wellfound";

  async scrape(options: ScraperOptions = {}): Promise<ScraperResult> {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    const jobs: JobListing[] = [];

    for (let page = 1; page <= maxPages && jobs.length < pageSize; page += 1) {
      const html = await fetchWellfoundHtml(buildWellfoundSearchUrl(options, page));
      const pageJobs = parseWellfoundJobs(html);

      if (pageJobs.length === 0) {
        break;
      }

      jobs.push(...pageJobs);
    }

    const uniqueJobs = dedupeJobs(jobs).slice(0, pageSize);

    return {
      jobs: await enrichWellfoundJobs(uniqueJobs),
      source: this.source,
      collectedAt: new Date().toISOString(),
    };
  }
}

function buildWellfoundSearchUrl(options: ScraperOptions, page: number): URL {
  const url = new URL(options.remote === true ? WELLFOUND_REMOTE_URL : WELLFOUND_JOBS_URL);
  const keywords = buildKeywords(options);

  if (keywords !== "") {
    url.searchParams.set("q", keywords);
    url.searchParams.set("query", keywords);
  }

  if (options.location !== undefined || options.country !== undefined) {
    url.searchParams.set("location", options.location ?? options.country ?? "");
  }

  if (page > 1) {
    url.searchParams.set("page", String(page));
  }

  return url;
}

async function enrichWellfoundJobs(jobs: JobListing[]): Promise<JobListing[]> {
  const enrichedJobs: JobListing[] = [];

  for (const job of jobs) {
    enrichedJobs.push(await enrichWellfoundJob(job));
  }

  return enrichedJobs;
}

async function enrichWellfoundJob(job: JobListing): Promise<JobListing> {
  try {
    const html = await fetchWellfoundHtml(new URL(job.url));
    const detail = parseWellfoundJobDetail(html);

    return {
      ...job,
      ...detail,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.warn(
      `[scraper:Wellfound] Could not fetch job detail for ${job.url}: ${message}`,
    );
    return job;
  }
}

async function fetchWellfoundHtml(url: URL): Promise<string> {
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
          `Wellfound public jobs request was blocked with status ${response.status}; authentication, CAPTCHA, and challenge bypass are not supported`,
        );
      }

      if (!response.ok) {
        throw new Error(
          `Wellfound public jobs request failed with status ${response.status}`,
        );
      }

      return await response.text();
    } catch (error) {
      if (attempt === REQUEST_RETRIES || isWellfoundPolicyError(error)) {
        throw error;
      }

      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Wellfound public jobs request failed without a response");
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
  return status === 401 || status === 403 || status === 429;
}

function isWellfoundPolicyError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("challenge bypass");
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value !== "";
}
