import type { IncomingMessage, ServerResponse } from "node:http";
import type { JobListing } from "../../../../packages/shared/src/index.js";
import { IbmTalentScraper } from "../scrapers/index.js";
import type { ScraperOptions } from "../types/scraper.js";
import { fail, ok } from "./response.js";

const ibmTalentScraper = new IbmTalentScraper();

export async function handleJobsRequest(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, fail("Method not allowed"));
    return;
  }

  const source = url.searchParams.get("source") ?? "ibm";

  if (source !== "ibm") {
    sendJson(response, 400, fail(`Unsupported source: ${source}`));
    return;
  }

  try {
    const result = await ibmTalentScraper.scrape(
      buildScraperOptions(url.searchParams),
    );

    sendJson<JobListing[]>(response, 200, ok(result.jobs));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scraper error";
    sendJson(response, 502, fail(message));
  }
}

function buildScraperOptions(searchParams: URLSearchParams): ScraperOptions {
  const options: ScraperOptions = {};
  const query = searchParams.get("query");
  const location = searchParams.get("location");
  const pageSize = parsePositiveInteger(searchParams.get("pageSize"));
  const maxPages = parsePositiveInteger(searchParams.get("maxPages"));

  if (query !== null) {
    options.query = query;
  }

  if (location !== null) {
    options.location = location;
  }

  if (pageSize !== undefined) {
    options.pageSize = pageSize;
  }

  if (maxPages !== undefined) {
    options.maxPages = maxPages;
  }

  return options;
}

function parsePositiveInteger(value: string | null): number | undefined {
  if (value === null) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function sendJson<T>(
  response: ServerResponse,
  statusCode: number,
  payload: { data: T; error: string | null },
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}
