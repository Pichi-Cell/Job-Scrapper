import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type { JobListing } from "../../../../packages/shared/src/index.js";

const LINKEDIN_BASE_URL = "https://www.linkedin.com";

export function parseLinkedInJobs(html: string): JobListing[] {
  const $ = cheerio.load(html);
  const jobs = new Map<string, JobListing>();

  $("li, .base-card, .job-search-card").each((_index, element) => {
    const job = parseLinkedInJobCard($, element);

    if (job !== undefined) {
      jobs.set(job.url, job);
    }
  });

  return [...jobs.values()];
}

export interface LinkedInJobDetail {
  description?: string;
}

export function parseLinkedInJobDetail(html: string): LinkedInJobDetail {
  const $ = cheerio.load(html);
  const description = extractLinkedInDescription($);

  return {
    ...(description !== undefined ? { description } : {}),
  };
}

function parseLinkedInJobCard(
  $: cheerio.CheerioAPI,
  element: AnyNode,
): JobListing | undefined {
  const card = $(element);
  const url = normalizeJobUrl(
    card.find('a[href*="/jobs/view/"]').first().attr("href"),
  );
  const id = getJobId(card, url);
  const title = normalizeText(
    card.find(".base-search-card__title, .sr-only").first().text(),
  );
  const company = normalizeText(
    card.find(".base-search-card__subtitle, .hidden-nested-link").first().text(),
  );

  if (id === undefined || title === undefined || url === undefined) {
    return undefined;
  }

  const jobListing: JobListing = {
    id,
    title,
    company: company ?? "LinkedIn",
    url,
    source: "LinkedIn",
  };

  const location = normalizeText(card.find(".job-search-card__location").first().text());
  if (location !== undefined) {
    jobListing.location = location;
  }

  const salary = normalizeText(card.find(".job-search-card__salary-info").first().text());
  if (salary !== undefined) {
    jobListing.salary = salary;
  }

  const datePosted = getDatePosted(card);
  if (datePosted !== undefined) {
    jobListing.datePosted = datePosted;
  }

  const text = card.text();
  if (/\bremote\b/i.test(`${location ?? ""} ${text}`)) {
    jobListing.remote = true;
  }

  return jobListing;
}

function getJobId(
  card: cheerio.Cheerio<AnyNode>,
  url: string | undefined,
): string | undefined {
  const urn = card.attr("data-entity-urn");
  const idFromUrn = urn?.split(":").at(-1);

  if (isNonEmptyString(idFromUrn)) {
    return idFromUrn;
  }

  if (url === undefined) {
    return undefined;
  }

  const pathMatch = /\/jobs\/view\/(?:[^/?-]+-)*(\d+)/.exec(url);
  const queryId = new URL(url).searchParams.get("currentJobId");

  return pathMatch?.[1] ?? queryId ?? undefined;
}

function normalizeJobUrl(value: string | undefined): string | undefined {
  if (!isNonEmptyString(value)) {
    return undefined;
  }

  const url = new URL(value, LINKEDIN_BASE_URL);
  const jobId = url.searchParams.get("currentJobId");

  url.hash = "";
  url.search = "";

  if (jobId !== null && !url.pathname.includes(jobId)) {
    url.searchParams.set("currentJobId", jobId);
  }

  return url.toString();
}

function getDatePosted(
  card: cheerio.Cheerio<AnyNode>,
): string | undefined {
  const datetime = card.find("time[datetime]").first().attr("datetime");

  if (!isNonEmptyString(datetime)) {
    return undefined;
  }

  const parsed = new Date(datetime);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function extractLinkedInDescription($: cheerio.CheerioAPI): string | undefined {
  $("script, style, noscript").remove();

  const containerText = normalizeText(
    $(
      [
        ".show-more-less-html__markup",
        ".description__text",
        ".jobs-description-content__text",
        "[data-test-id='job-description']",
      ].join(","),
    )
      .first()
      .text(),
  );

  if (containerText !== undefined) {
    return removeLinkedInDescriptionChrome(containerText);
  }

  return extractLinkedInDescriptionFromPageText(normalizeText($("body").text()));
}

function extractLinkedInDescriptionFromPageText(
  text: string | undefined,
): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  const startMatch = /(About the job|Job description|Description)/i.exec(text);
  const startIndex =
    startMatch?.index === undefined
      ? 0
      : startMatch.index + startMatch[0].length;
  const endMatch = /(Seniority level|Employment type|Job function|Industries|Referrals increase your chances|Show more|Show less)/i.exec(
    text.slice(startIndex),
  );
  const endIndex =
    endMatch?.index === undefined ? text.length : startIndex + endMatch.index;

  return removeLinkedInDescriptionChrome(text.slice(startIndex, endIndex));
}

function removeLinkedInDescriptionChrome(
  text: string | undefined,
): string | undefined {
  if (text === undefined) {
    return undefined;
  }

  return normalizeText(
    text
      .replace(/^(About the job|Job description|Description)\s*/i, "")
      .replace(/\bShow more\b|\bShow less\b/gi, " "),
  );
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized === "" ? undefined : normalized;
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "";
}
