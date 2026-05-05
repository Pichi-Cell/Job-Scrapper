import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { JobListing } from "../../../../packages/shared/src/index.js";

const STRIPE_BASE_URL = "https://stripe.com";

export function parseStripeJobs(html: string): JobListing[] {
  const $ = cheerio.load(html);
  const jobs = new Map<string, JobListing>();

  $("table tbody tr, tr").each((_index, row) => {
    const job = parseStripeJobRow($, row);

    if (job !== undefined) {
      jobs.set(job.url, job);
    }
  });

  return [...jobs.values()];
}

function parseStripeJobRow(
  $: cheerio.CheerioAPI,
  row: Element,
): JobListing | undefined {
  const cells = $(row).find("td");

  if (cells.length < 3) {
    return undefined;
  }

  const titleCell = cells.eq(0);
  const title = normalizeText(titleCell.text());
  const href = titleCell.find("a[href]").first().attr("href");
  const url = normalizeStripeUrl(href);

  if (title === undefined || url === undefined) {
    return undefined;
  }

  const team = normalizeText(cells.eq(1).text());
  const location = normalizeText(
    cells
      .eq(2)
      .text()
      .replace(/^Image:\s*/i, ""),
  );

  const jobListing: JobListing = {
    id: getStripeJobId(url),
    title,
    company: "Stripe",
    url,
    source: "Stripe",
  };

  if (location !== undefined) {
    jobListing.location = location;
    jobListing.remote = /remote/i.test(location);
  }

  if (team !== undefined) {
    jobListing.description = `Team: ${team}`;
  }

  return jobListing;
}

function normalizeStripeUrl(href: string | undefined): string | undefined {
  if (href === undefined || href.trim() === "") {
    return undefined;
  }

  return new URL(href, STRIPE_BASE_URL).toString();
}

function getStripeJobId(url: string): string {
  const parsedUrl = new URL(url);
  return parsedUrl.searchParams.get("gh_jid") ?? parsedUrl.pathname;
}

function normalizeText(value: string): string | undefined {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized === "" ? undefined : normalized;
}
