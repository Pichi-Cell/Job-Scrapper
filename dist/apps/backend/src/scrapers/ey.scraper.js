import * as cheerio from "cheerio";
import { DomainRateLimiter } from "../utils/rate-limit.js";
const EY_SEARCH_URL = "https://careers.ey.com/ey/search/";
const EY_BASE_URL = "https://careers.ey.com";
const DEFAULT_LOCATION = "argentina";
const DEFAULT_PAGE_SIZE = 30;
const EY_REQUEST_TIMEOUT_MS = 15_000;
const eyRateLimiter = new DomainRateLimiter(500);
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
        const uniqueJobs = dedupeJobs(jobs).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE);
        const enrichedJobs = await enrichEyJobs(uniqueJobs);
        return {
            jobs: enrichedJobs,
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
async function fetchEySearchPage(profileQuery, options) {
    const url = new URL(EY_SEARCH_URL);
    url.searchParams.set("q", options.query ?? profileQuery);
    url.searchParams.set("locationsearch", options.location ?? options.country ?? DEFAULT_LOCATION);
    const response = await fetchEyHtml(url);
    return {
        html: response,
        profile: profileQuery,
    };
}
async function fetchEyHtml(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), EY_REQUEST_TIMEOUT_MS);
    try {
        await eyRateLimiter.waitFor(url);
        const response = await fetch(url, {
            headers: {
                accept: "text/html",
                "user-agent": "JobScraper/0.1 (+respectful research scraper)",
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`EY request failed with status ${response.status}`);
        }
        return await response.text();
    }
    finally {
        clearTimeout(timeoutId);
    }
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
async function enrichEyJobs(jobs) {
    const enrichedJobs = [];
    for (const job of jobs) {
        enrichedJobs.push(await enrichEyJob(job));
    }
    return enrichedJobs;
}
async function enrichEyJob(job) {
    try {
        const html = await fetchEyHtml(new URL(job.url));
        const detail = parseEyJobDetail(html);
        const enrichedJob = {
            ...job,
            ...detail,
        };
        const description = detail.description ?? job.description;
        if (description !== undefined) {
            enrichedJob.description = description;
        }
        return enrichedJob;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn(`[scraper:EY] Could not fetch job detail for ${job.url}: ${message}`);
        return job;
    }
}
function parseEyJobDetail(html) {
    const $ = cheerio.load(html);
    const salary = normalizeLabelValue(extractLabelValue($, ["Salary", "Salario"]));
    const datePosted = normalizeEyDate(normalizeLabelValue(extractLabelValue($, ["Date", "Fecha"])));
    const description = extractEyDescription($);
    return {
        ...(description !== undefined ? { description } : {}),
        ...(datePosted !== undefined ? { datePosted } : {}),
        ...(salary !== undefined ? { salary } : {}),
    };
}
function extractEyDescription($) {
    $("script, style, noscript").remove();
    const descriptionContainer = $([
        ".jobdescription",
        ".job-description",
        ".jobDescription",
        ".jobdetail",
        ".jobDetail",
        "[data-automation-id='jobPostingDescription']",
    ].join(",")).first();
    const containerText = normalizeText(descriptionContainer.text());
    if (containerText !== undefined) {
        return removeDescriptionChrome(containerText);
    }
    return extractDescriptionFromPageText(normalizeText($("body").text()));
}
function extractDescriptionFromPageText(text) {
    if (text === undefined) {
        return undefined;
    }
    const startMatch = /(Job description|Descripción del trabajo)/i.exec(text);
    const startIndex = startMatch?.index === undefined
        ? 0
        : startMatch.index + startMatch[0].length;
    const endMatch = /(Apply now|Enviar candidatura ahora|Find similar jobs|Buscar ofertas de empleo similares|Cookie Settings|Administrador de consentimiento de cookies)/i.exec(text.slice(startIndex));
    const endIndex = endMatch?.index === undefined ? text.length : startIndex + endMatch.index;
    return removeDescriptionChrome(text.slice(startIndex, endIndex));
}
function removeDescriptionChrome(text) {
    if (text === undefined) {
        return undefined;
    }
    const withoutHeading = text
        .replace(/^(Job description|Descripción del trabajo)\s*/i, "")
        .replace(/#\s*(CampusEY|ExperiencedEY)\b/gi, "");
    return normalizeText(withoutHeading);
}
function extractLabelValue($, labels) {
    const pageText = normalizeText($("body").text());
    if (pageText === undefined) {
        return undefined;
    }
    for (const label of labels) {
        const escapedLabel = escapeRegExp(label);
        const match = new RegExp(`${escapedLabel}:\\s*(.+?)(?=\\s+(?:Location|Locación|Other locations|Otra ubicación|Salary|Salario|Date|Fecha|Job description|Descripción del trabajo):|\\s+(?:Other locations|Otra ubicación|Job description|Descripción del trabajo)\\b|$)`, "i").exec(pageText);
        if (match?.[1] !== undefined) {
            return match[1];
        }
    }
    return undefined;
}
function normalizeLabelValue(value) {
    if (value === undefined || /competitive|competitiva/i.test(value)) {
        return value;
    }
    return normalizeText(value);
}
function normalizeEyDate(value) {
    if (value === undefined) {
        return undefined;
    }
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized === "" ? undefined : normalized;
}
function normalizeFilterKey(value) {
    return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
