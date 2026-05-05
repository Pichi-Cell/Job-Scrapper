import { parseStripeJobs } from "../parsers/stripe.parser.js";
import type { JobScraper, ScraperOptions, ScraperResult } from "../types/scraper.js";
import { DomainRateLimiter } from "../utils/rate-limit.js";
import { sleep } from "../utils/sleep.js";

const STRIPE_JOBS_URL =
  "https://stripe.com/jobs/search?teams=Infrastructure+%26+Corporate+Tech&teams=Machine+Learning&teams=Tech+Programs&remote_locations=Latin+America--Argentina+Remote";
const DEFAULT_PAGE_SIZE = 20;
const REQUEST_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;

const rateLimiter = new DomainRateLimiter(2_500);

export class StripeScraper implements JobScraper {
  readonly source = "Stripe";

  async scrape(options: ScraperOptions = {}): Promise<ScraperResult> {
    const url = new URL(STRIPE_JOBS_URL);
    const html = await fetchStripeJobsHtml(url);

    return {
      jobs: parseStripeJobs(html).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE),
      source: this.source,
      collectedAt: new Date().toISOString(),
    };
  }
}

async function fetchStripeJobsHtml(url: URL): Promise<string> {
  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      await rateLimiter.waitFor(url);

      const response = await fetch(url, {
        headers: {
          accept: "text/html",
          "user-agent": "JobScraper/0.1 (+respectful research scraper)",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Stripe jobs request failed with status ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt === REQUEST_RETRIES) {
        throw error;
      }

      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Stripe jobs request failed without a response");
}
