import * as cheerio from "cheerio";
const EY_SEARCH_URL = "https://careers.ey.com/ey/search/";
const EY_BASE_URL = "https://careers.ey.com";
const DEFAULT_LOCATION = "argentina";
const DEFAULT_PAGE_SIZE = 30;
const EY_PROFILE_QUERIES = {
    students: "CampusEY",
    student: "CampusEY",
    campus: "CampusEY",
    campusey: "CampusEY",
    experienced: "ExperiencedEY",
    experience: "ExperiencedEY",
    experiencedey: "ExperiencedEY",
};
export class EyScraper {
    source = "EY";
    async scrape(options = {}) {
        const profileQueries = getProfileQueries(options.profile);
        const pages = await Promise.all(profileQueries.map((query) => fetchEySearchPage(query, options)));
        const jobs = pages.flatMap(({ html, profile }) => parseEyJobs(html, profile, options.pageSize ?? DEFAULT_PAGE_SIZE));
        return {
            jobs: dedupeJobs(jobs).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE),
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
async function fetchEySearchPage(profileQuery, options) {
    const url = new URL(EY_SEARCH_URL);
    url.searchParams.set("q", options.query ?? profileQuery);
    url.searchParams.set("locationsearch", options.location ?? options.country ?? DEFAULT_LOCATION);
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
function parseEyJobs(html, profile, limit) {
    const $ = cheerio.load(html);
    const jobs = [];
    $("tr.data-row").each((_index, row) => {
        const titleLink = $(row).find("span.jobTitle.hidden-phone a.jobTitle-link").first();
        const title = normalizeText(titleLink.text());
        const href = titleLink.attr("href");
        const location = normalizeText($(row).find("span.jobLocation").first().text());
        if (title === undefined || href === undefined) {
            return;
        }
        const url = normalizeEyUrl(href);
        const jobListing = {
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
function getProfileQueries(profile) {
    if (profile === undefined) {
        return ["CampusEY", "ExperiencedEY"];
    }
    const profileQuery = EY_PROFILE_QUERIES[normalizeFilterKey(profile)] ?? profile;
    return [profileQuery];
}
function normalizeEyUrl(href) {
    if (href.startsWith("http")) {
        return href;
    }
    return `${EY_BASE_URL}${href}`;
}
function extractEyJobId(url) {
    const match = /\/(\d+)\/?$/.exec(url);
    return match?.[1];
}
function dedupeJobs(jobs) {
    const seen = new Set();
    return jobs.filter((job) => {
        if (seen.has(job.url)) {
            return false;
        }
        seen.add(job.url);
        return true;
    });
}
function normalizeText(value) {
    const normalized = value.replace(/\s+/g, " ").trim();
    return normalized === "" ? undefined : normalized;
}
function normalizeFilterKey(value) {
    return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
