import { parseDynamiteJobs, } from "../parsers/dynamite.parser.js";
import { DomainRateLimiter } from "../utils/rate-limit.js";
import { sleep } from "../utils/sleep.js";
const DYNAMITE_ALGOLIA_URL = "https://49HKL9G3SB-dsn.algolia.net/1/indexes/prod_jobs/query";
const DYNAMITE_APP_ID = "49HKL9G3SB";
const DYNAMITE_SEARCH_KEY = "578864e6f2d8bc38a05a8f3302d5a9ac";
const DEFAULT_PAGE_SIZE = 20;
const REQUEST_RETRIES = 3;
const REQUEST_TIMEOUT_MS = 15_000;
const rateLimiter = new DomainRateLimiter(2_500);
export class DynamiteScraper {
    source = "Dynamite Jobs";
    async scrape(options = {}) {
        const url = new URL(DYNAMITE_ALGOLIA_URL);
        const payload = await fetchDynamiteSearch(url, options);
        return {
            jobs: parseDynamiteJobs(payload).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE),
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
async function fetchDynamiteSearch(url, options) {
    for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            await rateLimiter.waitFor(url);
            const response = await fetch(url, {
                body: JSON.stringify({ params: buildDynamiteSearchParams(options) }),
                headers: {
                    accept: "application/json",
                    "content-type": "application/json",
                    "user-agent": "JobScraper/0.1 (+respectful research scraper)",
                    "x-algolia-api-key": DYNAMITE_SEARCH_KEY,
                    "x-algolia-application-id": DYNAMITE_APP_ID,
                },
                method: "POST",
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`Dynamite Jobs search request failed with status ${response.status}`);
            }
            return (await response.json());
        }
        catch (error) {
            if (attempt === REQUEST_RETRIES) {
                throw error;
            }
            await sleep(500 * attempt);
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    throw new Error("Dynamite Jobs search request failed without a response");
}
function buildDynamiteSearchParams(options) {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const searchParams = new URLSearchParams({
        disableExactOnAttributes: JSON.stringify(["description"]),
        facetFilters: JSON.stringify(buildFacetFilters(options)),
        hitsPerPage: String(pageSize),
        page: "0",
        query: buildSearchQuery(options),
        removeWordsIfNoResults: "lastWords",
    });
    return searchParams.toString();
}
function buildFacetFilters(options) {
    const filters = [
        ["flags.isVisible:true"],
        ["flags.isBlocked:false"],
    ];
    if (options.includeClosed !== true) {
        filters.push([
            "flags.isFinished:false",
            "flags.isExpired:false",
            "flags.isFulfilled:false",
        ]);
    }
    if (options.hasPublicSalary === true) {
        filters.push(["flags.hasPublicSalary:true"]);
    }
    const categoryFilter = getCategoryFilter(options.category ?? options.careerArea);
    if (categoryFilter !== undefined) {
        filters.push([categoryFilter]);
    }
    const skillFilters = getSkillFilters(options.skills);
    if (skillFilters.length > 0) {
        filters.push(skillFilters);
    }
    const locationFilters = getLocationFilters(options.location ?? options.country);
    if (locationFilters.length > 0) {
        filters.push(locationFilters);
    }
    return filters;
}
function buildSearchQuery(options) {
    return [options.query, options.skills]
        .map((value) => value?.trim())
        .filter(isNonEmptyString)
        .join(" ");
}
function getCategoryFilter(category) {
    if (category === undefined || category.trim() === "") {
        return undefined;
    }
    return `categories.category.slug:${toSlug(category)}`;
}
function getSkillFilters(skills) {
    if (skills === undefined || skills.trim() === "") {
        return [];
    }
    return skills
        .split(",")
        .map((skill) => skill.trim())
        .filter(isNonEmptyString)
        .map((skill) => `skillSlugs:${toSlug(skill)}`);
}
function getLocationFilters(location) {
    if (location === undefined || location.trim() === "") {
        return [];
    }
    const normalized = location.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (normalized === "argentina" || normalized === "ar") {
        return ["locationSlugs:AR", "locationSlugs:latinamerica"];
    }
    if (normalized === "latinamerica" || normalized === "latam") {
        return ["locationSlugs:latinamerica"];
    }
    return [`locationSlugs:${location.trim()}`];
}
function toSlug(value) {
    return value
        .trim()
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}
function isNonEmptyString(value) {
    return value !== undefined && value !== "";
}
