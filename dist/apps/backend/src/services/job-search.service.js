import { AccentureScraper, DynamiteScraper, EyScraper, GoogleScraper, IbmTalentScraper, StripeScraper, } from "../scrapers/index.js";
const ibmTalentScraper = new IbmTalentScraper();
const eyScraper = new EyScraper();
const googleScraper = new GoogleScraper();
const accentureScraper = new AccentureScraper();
const stripeScraper = new StripeScraper();
const dynamiteScraper = new DynamiteScraper();
export async function searchSource(request) {
    const scraper = getScraper(request.source);
    if (scraper === undefined) {
        return {
            source: request.source,
            jobs: [],
            error: `Unsupported source: ${request.source}`,
        };
    }
    try {
        const result = await scraper.scrape(request.options);
        return {
            source: request.source,
            jobs: result.jobs,
            error: null,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown scraper error";
        console.error(`[scraper:${request.source}] ${message}`, error);
        return {
            source: request.source,
            jobs: [],
            error: message,
        };
    }
}
export async function searchSources(requests) {
    return Promise.all(requests.map((request) => searchSource(request)));
}
export function isSupportedSource(source) {
    return getScraper(source) !== undefined;
}
function getScraper(source) {
    const normalizedSource = source.toLowerCase();
    if (normalizedSource === "ibm") {
        return ibmTalentScraper;
    }
    if (normalizedSource === "ey") {
        return eyScraper;
    }
    if (normalizedSource === "google") {
        return googleScraper;
    }
    if (normalizedSource === "accenture") {
        return accentureScraper;
    }
    if (normalizedSource === "stripe") {
        return stripeScraper;
    }
    if (normalizedSource === "dynamite") {
        return dynamiteScraper;
    }
    return undefined;
}
