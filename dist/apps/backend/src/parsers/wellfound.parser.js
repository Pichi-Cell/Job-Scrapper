import * as cheerio from "cheerio";
const WELLFOUND_BASE_URL = "https://wellfound.com";
export function parseWellfoundJobs(html) {
    const jsonLdJobs = parseJsonLdJobs(html);
    if (jsonLdJobs.length > 0) {
        return jsonLdJobs;
    }
    const $ = cheerio.load(html);
    const jobs = new Map();
    $('a[href*="/jobs/"]').each((_index, element) => {
        const job = parseWellfoundJobLink($, element);
        if (job !== undefined) {
            jobs.set(job.url, job);
        }
    });
    return [...jobs.values()];
}
export function parseWellfoundJobDetail(html) {
    const jsonLdJobs = parseJsonLdJobs(html);
    const jsonLdDescription = jsonLdJobs.find((job) => job.description !== undefined)?.description;
    if (jsonLdDescription !== undefined) {
        return { description: jsonLdDescription };
    }
    const $ = cheerio.load(html);
    const description = extractWellfoundDescription($);
    return {
        ...(description !== undefined ? { description } : {}),
    };
}
function parseWellfoundJobLink($, element) {
    const link = $(element);
    const href = link.attr("href");
    const url = normalizeWellfoundUrl(href);
    const title = normalizeJobTitle(link.text());
    if (url === undefined || title === undefined) {
        return undefined;
    }
    const id = extractWellfoundJobId(url);
    if (id === undefined) {
        return undefined;
    }
    const container = link.closest("article, li, section, div");
    const company = getCompanyName($, container, link) ?? "Wellfound";
    const text = normalizeText(container.text()) ?? title;
    const jobListing = {
        id,
        title,
        company,
        url,
        source: "Wellfound",
    };
    const salary = extractSalary(text);
    if (salary !== undefined) {
        jobListing.salary = salary;
    }
    const location = extractLocation(text);
    if (location !== undefined) {
        jobListing.location = location;
    }
    const datePosted = extractDatePosted(text);
    if (datePosted !== undefined) {
        jobListing.datePosted = datePosted;
    }
    if (/\b(remote|distributed)\b/i.test(text)) {
        jobListing.remote = true;
    }
    return jobListing;
}
function parseJsonLdJobs(html) {
    const $ = cheerio.load(html);
    const jobs = [];
    $('script[type="application/ld+json"]').each((_index, element) => {
        const rawJson = $(element).contents().text();
        const parsed = parseJson(rawJson);
        for (const item of flattenJsonLd(parsed)) {
            const job = parseJsonLdJob(item);
            if (job !== undefined) {
                jobs.push(job);
            }
        }
    });
    return dedupeJobs(jobs);
}
function parseJsonLdJob(value) {
    if (!isRecord(value) || value["@type"] !== "JobPosting") {
        return undefined;
    }
    const title = getString(value.title);
    const url = normalizeWellfoundUrl(getString(value.url));
    if (title === undefined || url === undefined) {
        return undefined;
    }
    const id = extractWellfoundJobId(url) ?? url;
    const jobListing = {
        id,
        title,
        company: getJsonLdCompanyName(value.hiringOrganization) ?? "Wellfound",
        url,
        source: "Wellfound",
    };
    const description = normalizeText(stripHtml(getString(value.description)));
    if (description !== undefined) {
        jobListing.description = description;
    }
    const location = getJsonLdLocation(value.jobLocation);
    if (location !== undefined) {
        jobListing.location = location;
    }
    const salary = getJsonLdSalary(value.baseSalary);
    if (salary !== undefined) {
        jobListing.salary = salary;
    }
    const datePosted = getIsoDate(getString(value.datePosted));
    if (datePosted !== undefined) {
        jobListing.datePosted = datePosted;
    }
    const applicantLocation = getJsonLdLocation(value.applicantLocationRequirements);
    const locationType = getString(value.jobLocationType);
    if (locationType?.toUpperCase() === "TELECOMMUTE" || applicantLocation !== undefined) {
        jobListing.remote = true;
    }
    return jobListing;
}
function flattenJsonLd(value) {
    if (Array.isArray(value)) {
        return value.flatMap(flattenJsonLd);
    }
    if (!isRecord(value)) {
        return [];
    }
    const graph = value["@graph"];
    return Array.isArray(graph) ? graph.flatMap(flattenJsonLd) : [value];
}
function extractWellfoundDescription($) {
    $("script, style, noscript").remove();
    const containerText = normalizeText($([
        "[data-test='JobDescription']",
        "[data-testid='job-description']",
        ".job-description",
        "section:contains('About the role')",
        "section:contains('About the job')",
    ].join(","))
        .first()
        .text());
    if (containerText !== undefined) {
        return removeWellfoundDescriptionChrome(containerText);
    }
    return extractWellfoundDescriptionFromPageText(normalizeText($("body").text()));
}
function extractWellfoundDescriptionFromPageText(text) {
    if (text === undefined) {
        return undefined;
    }
    const startMatch = /(About the role|About the job|Job description|Description)/i.exec(text);
    const startIndex = startMatch?.index === undefined
        ? 0
        : startMatch.index + startMatch[0].length;
    const endMatch = /(Skills|Compensation|Benefits|Apply|Save|About the company)/i.exec(text.slice(startIndex));
    const endIndex = endMatch?.index === undefined ? text.length : startIndex + endMatch.index;
    return removeWellfoundDescriptionChrome(text.slice(startIndex, endIndex));
}
function removeWellfoundDescriptionChrome(text) {
    if (text === undefined) {
        return undefined;
    }
    return normalizeText(text.replace(/^(About the role|About the job|Job description|Description)\s*/i, ""));
}
function normalizeWellfoundUrl(value) {
    if (!isNonEmptyString(value)) {
        return undefined;
    }
    const url = new URL(value, WELLFOUND_BASE_URL);
    if (!url.hostname.endsWith("wellfound.com") || !url.pathname.includes("/jobs/")) {
        return undefined;
    }
    url.hash = "";
    url.search = "";
    return url.toString();
}
function extractWellfoundJobId(url) {
    const pathMatch = /\/jobs\/([^/?#]+)/.exec(url);
    return pathMatch?.[1];
}
function normalizeJobTitle(value) {
    const normalized = normalizeText(value);
    if (normalized === undefined ||
        /^(apply|save|view|search|jobs?|remote jobs?|sign up|log in)$/i.test(normalized)) {
        return undefined;
    }
    return normalized.length > 120 ? undefined : normalized;
}
function getCompanyName($, container, link) {
    const companyLink = container
        .find('a[href*="/company/"], a[href*="/companies/"]')
        .not(link)
        .first();
    const companyFromLink = normalizeText(companyLink.text());
    if (companyFromLink !== undefined) {
        return companyFromLink;
    }
    return normalizeText(container.find("h2, h3, [data-test='StartupName']").first().text());
}
function extractSalary(text) {
    const match = /\$\d{2,3}k\s*[–-]\s*\$\d{2,3}k(?:\s*\/\s*yr)?|\$\d{2,3}k\+/i.exec(text);
    return match?.[0];
}
function extractLocation(text) {
    const remoteMatch = /(Remote only|Onsite or remote|In office|Remote)/i.exec(text);
    if (remoteMatch === null) {
        return undefined;
    }
    const afterMode = text.slice(remoteMatch.index + remoteMatch[0].length);
    const locationMatch = /^\s*[•,]\s*([^•]+?)(?:\s*[•,]\s*\$|\s*[•,]\s*(?:today|yesterday|\d+\s+(?:day|week|month)s?\s+ago)|$)/i.exec(afterMode);
    const location = normalizeText(locationMatch?.[1]);
    return location ?? remoteMatch[0];
}
function extractDatePosted(text) {
    if (/\btoday\b/i.test(text)) {
        return new Date().toISOString();
    }
    if (/\byesterday\b/i.test(text)) {
        const date = new Date();
        date.setDate(date.getDate() - 1);
        return date.toISOString();
    }
    const relativeMatch = /\b(\d+)\s+(day|week|month)s?\s+ago\b/i.exec(text);
    if (relativeMatch?.[1] === undefined || relativeMatch[2] === undefined) {
        return undefined;
    }
    const amount = Number.parseInt(relativeMatch[1], 10);
    const date = new Date();
    const unit = relativeMatch[2].toLowerCase();
    if (unit === "day") {
        date.setDate(date.getDate() - amount);
    }
    else if (unit === "week") {
        date.setDate(date.getDate() - amount * 7);
    }
    else {
        date.setMonth(date.getMonth() - amount);
    }
    return date.toISOString();
}
function getJsonLdCompanyName(value) {
    if (Array.isArray(value)) {
        return value.map(getJsonLdCompanyName).find(isDefined);
    }
    return isRecord(value) ? getString(value.name) : undefined;
}
function getJsonLdLocation(value) {
    if (Array.isArray(value)) {
        const locations = value.map(getJsonLdLocation).filter(isDefined);
        return locations.length > 0 ? locations.join("; ") : undefined;
    }
    if (!isRecord(value)) {
        return undefined;
    }
    const address = value.address;
    if (!isRecord(address)) {
        return getString(value.name);
    }
    const parts = [
        getString(address.addressLocality),
        getString(address.addressRegion),
        getString(address.addressCountry),
    ].filter(isDefined);
    return parts.length > 0 ? parts.join(", ") : undefined;
}
function getJsonLdSalary(value) {
    if (!isRecord(value)) {
        return undefined;
    }
    const currency = getString(value.currency) ?? "USD";
    const amount = value.value;
    if (!isRecord(amount)) {
        return undefined;
    }
    const minimum = getNumber(amount.minValue);
    const maximum = getNumber(amount.maxValue);
    if (minimum !== undefined && maximum !== undefined) {
        return `${currency} ${minimum}-${maximum}`;
    }
    return minimum === undefined ? undefined : `${currency} ${minimum}+`;
}
function getIsoDate(value) {
    if (value === undefined) {
        return undefined;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
function stripHtml(value) {
    return value === undefined ? undefined : cheerio.load(value).text();
}
function normalizeText(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized === "" ? undefined : normalized;
}
function parseJson(value) {
    try {
        return JSON.parse(value);
    }
    catch {
        return undefined;
    }
}
function dedupeJobs(jobs) {
    return [...new Map(jobs.map((job) => [job.url, job])).values()];
}
function getString(value) {
    return typeof value === "string" && value.trim() !== "" ? value : undefined;
}
function getNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isNonEmptyString(value) {
    return value !== undefined && value.trim() !== "";
}
function isDefined(value) {
    return value !== undefined;
}
