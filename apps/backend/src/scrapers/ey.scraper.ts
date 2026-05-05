import * as cheerio from "cheerio";
import type { JobListing } from "../../../../packages/shared/src/index.js";
import type { JobScraper, ScraperOptions, ScraperResult } from "../types/scraper.js";

const EY_SEARCH_URL = "https://careers.ey.com/ey/search/";
const EY_BASE_URL = "https://careers.ey.com";
const DEFAULT_LOCATION = "argentina";
const DEFAULT_PAGE_SIZE = 30;

const EY_PROFILE_QUERIES: Record<string, string> = {
  students: "CampusEY",
  student: "CampusEY",
  campus: "CampusEY",
  campusey: "CampusEY",
  experienced: "ExperiencedEY",
  experience: "ExperiencedEY",
  experiencedey: "ExperiencedEY",
};

export class EyScraper implements JobScraper {
  readonly source = "EY";

  async scrape(options: ScraperOptions = {}): Promise<ScraperResult> {
    const profileQueries = getProfileQueries(options.profile);
    const pages = await Promise.all(
      profileQueries.map((query) => fetchEySearchPage(query, options)),
    );
    const jobs = pages.flatMap(({ html, profile }) =>
      parseEyJobs(html, profile, options.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    return {
      jobs: dedupeJobs(jobs).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE),
      source: this.source,
      collectedAt: new Date().toISOString(),
    };
  }
}

interface EySearchPage {
  html: string;
  profile: string;
}

async function fetchEySearchPage(
  profileQuery: string,
  options: ScraperOptions,
): Promise<EySearchPage> {
  const url = new URL(EY_SEARCH_URL);
  url.searchParams.set("q", options.query ?? profileQuery);
  url.searchParams.set(
    "locationsearch",
    options.location ?? options.country ?? DEFAULT_LOCATION,
  );

  const response = await fetch(url, {
    headers: {
      accept: "text/html",
      "user-agent": "JobScraper/0.1 (+respectful research scraper)",
    },
  });

  if (!response.ok) {
    throw new Error(`EY search request failed with status ${response.status}`);
  }

  return {
    html: await response.text(),
    profile: profileQuery,
  };
}

function parseEyJobs(
  html: string,
  profile: string,
  limit: number,
): JobListing[] {
  const $ = cheerio.load(html);
  const jobs: JobListing[] = [];

  $("tr.data-row").each((_index, row) => {
    const titleLink = $(row).find("span.jobTitle.hidden-phone a.jobTitle-link").first();
    const title = normalizeText(titleLink.text());
    const href = titleLink.attr("href");
    const location = normalizeText($(row).find("span.jobLocation").first().text());

    if (title === undefined || href === undefined) {
      return;
    }

    const url = normalizeEyUrl(href);
    const jobListing: JobListing = {
      id: extractEyJobId(url) ?? url,
      title,
      company: "EY",
      url,
      source: "EY",
    };

    if (location !== undefined) {
      jobListing.location = location;
    }

    jobListing.description = `Profile: ${profile}`;
    jobs.push(jobListing);
  });

  return jobs.slice(0, limit);
}

function getProfileQueries(profile: string | undefined): string[] {
  if (profile === undefined) {
    return ["CampusEY", "ExperiencedEY"];
  }

  const profileQuery = EY_PROFILE_QUERIES[normalizeFilterKey(profile)] ?? profile;
  return [profileQuery];
}

function normalizeEyUrl(href: string): string {
  if (href.startsWith("http")) {
    return href;
  }

  return `${EY_BASE_URL}${href}`;
}

function extractEyJobId(url: string): string | undefined {
  const match = /\/(\d+)\/?$/.exec(url);
  return match?.[1];
}

function dedupeJobs(jobs: JobListing[]): JobListing[] {
  const seen = new Set<string>();

  return jobs.filter((job) => {
    if (seen.has(job.url)) {
      return false;
    }

    seen.add(job.url);
    return true;
  });
}

function normalizeText(value: string): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized === "" ? undefined : normalized;
}

function normalizeFilterKey(value: string): string {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
