import { EyScraper, IbmTalentScraper } from "../scrapers/index.js";
import { fail, ok } from "./response.js";
const ibmTalentScraper = new IbmTalentScraper();
const eyScraper = new EyScraper();
export async function handleJobsRequest(request, response) {
    const source = getQueryString(request.query.source) ?? "ibm";
    const scraper = getScraper(source);
    if (scraper === undefined) {
        response.status(400).json(fail(`Unsupported source: ${source}`));
        return;
    }
    try {
        const result = await scraper.scrape(buildScraperOptions(request));
        response.status(200).json(ok(result.jobs));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown scraper error";
        response.status(502).json(fail(message));
    }
}
function getScraper(source) {
    const normalizedSource = source.toLowerCase();
    if (normalizedSource === "ibm") {
        return ibmTalentScraper;
    }
    if (normalizedSource === "ey") {
        return eyScraper;
    }
    return undefined;
}
function buildScraperOptions(request) {
    const options = {};
    const query = getQueryString(request.query.query);
    const location = getQueryString(request.query.location);
    const country = getQueryString(request.query.country);
    const careerArea = getQueryString(request.query.careerArea);
    const experienceLevel = getQueryString(request.query.experienceLevel);
    const profile = getQueryString(request.query.profile);
    const pageSize = parsePositiveInteger(getQueryString(request.query.pageSize));
    const maxPages = parsePositiveInteger(getQueryString(request.query.maxPages));
    if (query !== undefined) {
        options.query = query;
    }
    if (location !== undefined) {
        options.location = location;
    }
    if (country !== undefined) {
        options.country = country;
    }
    if (careerArea !== undefined) {
        options.careerArea = careerArea;
    }
    if (experienceLevel !== undefined) {
        options.experienceLevel = experienceLevel;
    }
    if (profile !== undefined) {
        options.profile = profile;
    }
    if (pageSize !== undefined) {
        options.pageSize = pageSize;
    }
    if (maxPages !== undefined) {
        options.maxPages = maxPages;
    }
    return options;
}
function parsePositiveInteger(value) {
    if (value === undefined) {
        return undefined;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
function getQueryString(value) {
    if (typeof value === "string" && value.trim() !== "") {
        return value;
    }
    return undefined;
}
