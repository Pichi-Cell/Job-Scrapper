const ACCENTURE_SEARCH_API_URL = "https://www.accenture.com/api/accenture/jobsearch/result";
const ACCENTURE_BASE_URL = "https://www.accenture.com";
const ACCENTURE_REFERER = "https://www.accenture.com/ar-es/careers/jobsearch?jk=&sb=1&vw=0&is_rj=0&pg=1&sk=software%20engineering&ba=industry%20x";
const DEFAULT_KEYWORD = "software engineering";
const DEFAULT_BUSINESS_AREA = "industry x";
const DEFAULT_PAGE_SIZE = 10;
const ACCENTURE_AGGREGATIONS = [
    { fieldName: "location" },
    { fieldName: "postedDate" },
    { fieldName: "jobTypeDescription" },
    { fieldName: "workforceEntity" },
    { fieldName: "businessArea" },
    { fieldName: "skill" },
    { fieldName: "travelPercentage" },
    { fieldName: "yearsOfExperience" },
    { fieldName: "specialization" },
    { fieldName: "employeeType" },
    { fieldName: "remoteType" },
];
export class AccentureScraper {
    source = "Accenture";
    async scrape(options = {}) {
        const response = await fetch(ACCENTURE_SEARCH_API_URL, {
            method: "POST",
            body: buildAccentureFormData(options),
            headers: {
                accept: "application/json",
                referer: ACCENTURE_REFERER,
                "user-agent": "JobScraper/0.1 (+respectful research scraper)",
            },
        });
        if (!response.ok) {
            throw new Error(`Accenture search request failed with status ${response.status}`);
        }
        const text = await response.text();
        const payload = parseAccentureResponse(text);
        return {
            jobs: mapAccentureJobs(payload).slice(0, options.pageSize ?? DEFAULT_PAGE_SIZE),
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
function buildAccentureFormData(options) {
    const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    const startIndex = ((options.maxPages ?? 1) - 1) * pageSize;
    const skill = normalizeAccentureSkill(options.query ?? options.skills ?? DEFAULT_KEYWORD);
    const formData = new FormData();
    formData.append("startIndex", String(startIndex));
    formData.append("maxResultSize", String(pageSize));
    formData.append("jobKeyword", "");
    formData.append("jobLanguage", "es");
    formData.append("countrySite", "ar-es");
    formData.append("jobFilters", JSON.stringify(buildAccentureFilters(options, skill)));
    formData.append("aggregations", JSON.stringify(ACCENTURE_AGGREGATIONS));
    formData.append("jobCountry", options.country ?? options.location ?? "Argentina");
    formData.append("sortBy", "1");
    formData.append("componentId", "careerjobsearchresults-bb814c48ff");
    return formData;
}
function buildAccentureFilters(options, skill) {
    const businessArea = options.businessArea ?? options.careerArea ?? DEFAULT_BUSINESS_AREA;
    const filters = [
        {
            fieldName: "businessArea",
            items: businessArea.trim() === "" ? [] : [businessArea],
        },
        {
            fieldName: "skill",
            items: skill.trim() === "" ? [] : [skill],
        },
        {
            fieldName: "remoteType",
            items: toFilterItems(options.remoteType),
        },
        {
            fieldName: "yearsOfExperience",
            items: toFilterItems(options.yearsOfExperience),
        },
        {
            fieldName: "employeeType",
            items: toFilterItems(options.employeeType),
        },
        {
            fieldName: "specialization",
            items: toFilterItems(options.specialization),
        },
    ];
    return filters.filter((filter) => filter.items.length > 0);
}
function toFilterItems(value) {
    if (value === undefined) {
        return [];
    }
    return value
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
}
function normalizeAccentureSkill(value) {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "" || normalizedValue === "software") {
        return DEFAULT_KEYWORD;
    }
    return value;
}
function parseAccentureResponse(text) {
    if (text.trim() === "") {
        return [];
    }
    return JSON.parse(text.replace(/&#34;/g, '"'));
}
function mapAccentureJobs(payload) {
    const jobs = Array.isArray(payload)
        ? payload
        : findFirstArray(payload, [
            "jobs",
            "jobResults",
            "results",
            "searchResults",
            "data",
        ]);
    return jobs.map(mapAccentureJob).filter(isDefined);
}
function mapAccentureJob(job) {
    const title = job.title ?? job.jobTitle ?? job.jobName;
    const url = normalizeAccentureUrl(job.jobDetailUrl ?? job.jobUrl ?? job.url ?? job.applyUrl ?? job.internalReferUrl);
    if (title === undefined || url === undefined) {
        return undefined;
    }
    const jobListing = {
        id: job.jobId ?? job.requisitionId ?? extractAccentureJobId(url) ?? url,
        title,
        company: "Accenture",
        url,
        source: "Accenture",
    };
    const location = normalizeAccentureLocation(job);
    if (location !== undefined) {
        jobListing.location = location;
    }
    const description = normalizeText(stripHtml(job.description ?? job.jobDescription));
    const datePosted = normalizeAccentureDate(job.postedDate ?? job.datePosted);
    const remote = normalizeAccentureRemote(job.jobRemoteType);
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
function findFirstArray(payload, keys) {
    for (const key of keys) {
        const value = payload[key];
        if (Array.isArray(value)) {
            return value;
        }
    }
    return [];
}
function normalizeAccentureUrl(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value.startsWith("http")) {
        return value;
    }
    return `${ACCENTURE_BASE_URL}${value}`;
}
function normalizeAccentureLocation(job) {
    if (Array.isArray(job.jobCityState)) {
        return job.jobCityState.join("; ");
    }
    if (Array.isArray(job.locations)) {
        return job.locations.join("; ");
    }
    const location = job.location ?? job.locations ?? [job.city, job.country].filter(Boolean).join(", ");
    return location === "" ? undefined : location;
}
function extractAccentureJobId(url) {
    try {
        return new URL(url).searchParams.get("id") ?? url.split("/").filter(Boolean).at(-1);
    }
    catch {
        return url.split("/").filter(Boolean).at(-1);
    }
}
function normalizeAccentureDate(value) {
    if (typeof value === "number") {
        return new Date(value).toISOString();
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsedDate = new Date(value);
        return Number.isNaN(parsedDate.getTime()) ? value : parsedDate.toISOString();
    }
    return undefined;
}
function normalizeAccentureRemote(value) {
    if (value === undefined) {
        return undefined;
    }
    return /remote|hybrid/i.test(value);
}
function stripHtml(value) {
    return value?.replace(/<[^>]*>/g, " ");
}
function normalizeText(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized === "" ? undefined : normalized;
}
function isDefined(value) {
    return value !== undefined;
}
