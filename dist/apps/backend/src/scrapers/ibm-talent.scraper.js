import { parseIbmTalentSearchResponse, } from "../parsers/ibm-talent.parser.js";
import { fetchJson } from "../utils/http-client.js";
import { DomainRateLimiter } from "../utils/rate-limit.js";
const IBM_TALENT_SEARCH_ENDPOINT = "https://jobsapi-google.m-cloud.io/api/job/search";
const IBM_COMPANY_NAME = "companies/728ae96b-0028-4d31-9697-9b42f37dd3f4";
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_MAX_PAGES = 3;
const DEFAULT_DELAY_MS = 2_500;
export class IbmTalentScraper {
    source = "IBM Talent";
    rateLimiter = new DomainRateLimiter(DEFAULT_DELAY_MS);
    async scrape(options = {}) {
        const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
        const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
        const jobs = [];
        let pageToken;
        for (let page = 1; page <= maxPages; page += 1) {
            const url = buildIbmTalentSearchUrl(buildIbmTalentSearchUrlOptions(options, pageSize, pageToken));
            const parsedPage = await fetchJson(url, {
                rateLimiter: this.rateLimiter,
                retries: 3,
            }).then(parseIbmTalentSearchResponse);
            jobs.push(...parsedPage.jobs);
            pageToken = parsedPage.nextPageToken;
            if (pageToken === undefined) {
                break;
            }
        }
        return {
            jobs: dedupeJobs(jobs),
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
function buildIbmTalentSearchUrlOptions(options, pageSize, pageToken) {
    const urlOptions = {
        pageSize,
    };
    if (options.query !== undefined) {
        urlOptions.query = options.query;
    }
    if (options.location !== undefined) {
        urlOptions.location = options.location;
    }
    if (pageToken !== undefined) {
        urlOptions.pageToken = pageToken;
    }
    return urlOptions;
}
function buildIbmTalentSearchUrl(options) {
    const url = new URL(IBM_TALENT_SEARCH_ENDPOINT);
    url.searchParams.set("companyName", IBM_COMPANY_NAME);
    url.searchParams.set("pageSize", String(options.pageSize));
    url.searchParams.set("jobView", "JOB_VIEW_FULL");
    if (options.query !== undefined && options.query.trim() !== "") {
        url.searchParams.set("query", options.query.trim());
    }
    if (options.location !== undefined && options.location.trim() !== "") {
        url.searchParams.set("location", options.location.trim());
    }
    if (options.pageToken !== undefined) {
        url.searchParams.set("pageToken", options.pageToken);
    }
    return url;
}
function dedupeJobs(jobs) {
    const seen = new Set();
    return jobs.filter((job) => {
        const dedupeKey = job.url || job.id;
        if (seen.has(dedupeKey)) {
            return false;
        }
        seen.add(dedupeKey);
        return true;
    });
}
