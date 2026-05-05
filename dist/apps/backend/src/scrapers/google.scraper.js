import vm from "node:vm";
import * as cheerio from "cheerio";
const GOOGLE_CAREERS_BASE_URL = "https://www.google.com/about/careers/applications/";
const GOOGLE_CAREERS_RESULTS_URL = `${GOOGLE_CAREERS_BASE_URL}jobs/results/`;
const DEFAULT_LOCATION = "Argentina";
const DEFAULT_SKILLS = "Software";
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_TARGET_LEVELS = ["EARLY", "MID", "INTERN_AND_APPRENTICE"];
const TARGET_LEVELS = {
    early: "EARLY",
    mid: "MID",
    internship: "INTERN_AND_APPRENTICE",
    intern: "INTERN_AND_APPRENTICE",
    apprentice: "INTERN_AND_APPRENTICE",
    internandapprentice: "INTERN_AND_APPRENTICE",
};
export class GoogleScraper {
    source = "Google";
    async scrape(options = {}) {
        const url = buildGoogleSearchUrl(options);
        const response = await fetch(url, {
            headers: {
                accept: "text/html",
                "user-agent": "JobScraper/0.1 (+respectful research scraper)",
            },
        });
        if (!response.ok) {
            throw new Error(`Google careers request failed with status ${response.status}`);
        }
        const html = await response.text();
        const detailUrlById = extractDetailUrlsById(html);
        const jobs = extractGoogleJobs(html, detailUrlById).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE);
        return {
            jobs,
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
function buildGoogleSearchUrl(options) {
    const url = new URL(GOOGLE_CAREERS_RESULTS_URL);
    const params = url.searchParams;
    params.set("q", options.query ?? "");
    params.set("hl", "en-US");
    params.set("location", options.location ?? options.country ?? DEFAULT_LOCATION);
    params.set("has_remote", String(options.remote ?? true));
    params.set("skills", options.skills ?? options.careerArea ?? DEFAULT_SKILLS);
    for (const targetLevel of getTargetLevels(options)) {
        params.append("target_level", targetLevel);
    }
    return url;
}
function getTargetLevels(options) {
    const configuredLevel = options.targetLevel ?? options.experienceLevel;
    if (configuredLevel === undefined) {
        return DEFAULT_TARGET_LEVELS;
    }
    const levels = configuredLevel
        .split(",")
        .map((level) => level.trim())
        .filter((level) => level !== "")
        .map((level) => TARGET_LEVELS[normalizeFilterKey(level)] ?? level);
    return levels.length > 0 ? levels : DEFAULT_TARGET_LEVELS;
}
function extractGoogleJobs(html, detailUrlById) {
    const callback = extractGoogleJobsCallback(html);
    const jobRecords = callback?.data?.[0];
    if (!Array.isArray(jobRecords)) {
        return [];
    }
    return jobRecords
        .filter(Array.isArray)
        .map((record) => mapGoogleJobRecord(record, detailUrlById));
}
function extractGoogleJobsCallback(html) {
    const callbacks = [...html.matchAll(/AF_initDataCallback\((.*?)\);/gs)];
    for (const callback of callbacks) {
        const rawObject = callback[1];
        if (rawObject === undefined || !rawObject.includes("ds:1")) {
            continue;
        }
        const parsed = vm.runInNewContext(`(${rawObject})`);
        if (parsed.key === "ds:1") {
            return parsed;
        }
    }
    return undefined;
}
function mapGoogleJobRecord(record, detailUrlById) {
    const id = getString(record[0]) ?? "unknown-google-job";
    const title = getString(record[1]) ?? "Untitled Google role";
    const applyUrl = getString(record[2]);
    const detailUrl = detailUrlById.get(id);
    const locations = getLocations(record[9]);
    const description = normalizeText(stripHtml(getHtmlSection(record[10])));
    const datePosted = getDateFromTimestamp(record[12]);
    const remote = inferRemote(getHtmlSection(record[18]));
    const jobListing = {
        id,
        title,
        company: getString(record[7]) ?? "Google",
        url: detailUrl ?? applyUrl ?? GOOGLE_CAREERS_RESULTS_URL,
        source: "Google",
    };
    if (locations !== undefined) {
        jobListing.location = locations;
    }
    if (description !== undefined) {
        jobListing.description = description;
    }
    if (datePosted !== undefined) {
        jobListing.datePosted = datePosted;
    }
    if (remote !== undefined) {
        jobListing.remote = remote;
    }
    return jobListing;
}
function extractDetailUrlsById(html) {
    const $ = cheerio.load(html);
    const urls = new Map();
    $("li[ssk]").each((_index, element) => {
        const id = normalizeGoogleCardId($(element).attr("ssk"));
        const href = $(element).find('a[href*="jobs/results/"]').first().attr("href");
        if (id !== undefined && href !== undefined) {
            urls.set(id, new URL(href, GOOGLE_CAREERS_BASE_URL).toString());
        }
    });
    return urls;
}
function normalizeGoogleCardId(value) {
    if (value === undefined) {
        return undefined;
    }
    return value.split(":").at(-1);
}
function getLocations(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const locations = value
        .map((location) => {
        if (Array.isArray(location)) {
            return getString(location[0]);
        }
        return undefined;
    })
        .filter(isDefined);
    return locations.length > 0 ? locations.join("; ") : undefined;
}
function getHtmlSection(value) {
    if (!Array.isArray(value)) {
        return undefined;
    }
    return getString(value[1]);
}
function getDateFromTimestamp(value) {
    if (!Array.isArray(value) || typeof value[0] !== "number") {
        return undefined;
    }
    return new Date(value[0] * 1000).toISOString();
}
function inferRemote(value) {
    if (value === undefined) {
        return undefined;
    }
    const strippedValue = stripHtml(value);
    return strippedValue === undefined ? undefined : /remote/i.test(strippedValue);
}
function stripHtml(value) {
    if (value === undefined) {
        return undefined;
    }
    return cheerio.load(value).text();
}
function normalizeText(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized === "" ? undefined : normalized;
}
function getString(value) {
    return typeof value === "string" ? value : undefined;
}
function normalizeFilterKey(value) {
    return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
function isDefined(value) {
    return value !== undefined;
}
