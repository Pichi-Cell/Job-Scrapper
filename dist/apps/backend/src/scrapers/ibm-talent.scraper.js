const IBM_SEARCH_API_URL = "https://www-api.ibm.com/search/api/v2";
const IBM_CAREERS_URL_PREFIX = "https://careers.ibm.com";
const DEFAULT_PAGE_SIZE = 30;
const CAREER_AREAS = {
    softwareengineering: "Software Engineering",
};
const EXPERIENCE_LEVELS = {
    internship: "Internship",
    intern: "Internship",
    entrylevel: "Entry Level",
    professional: "Professional",
};
const COUNTRIES = {
    argentina: "Argentina",
};
export class IbmTalentScraper {
    source = "IBM Talent";
    async scrape(options = {}) {
        const response = await fetch(IBM_SEARCH_API_URL, {
            method: "POST",
            headers: {
                accept: "application/json",
                "content-type": "application/json",
                "user-agent": "JobScraper/0.1 (+respectful research scraper)",
            },
            body: JSON.stringify(buildIbmSearchPayload(options)),
        });
        if (!response.ok) {
            throw new Error(`IBM search request failed with status ${response.status}`);
        }
        const payload = (await response.json());
        return {
            jobs: mapIbmHitsToJobListings(payload.hits?.hits ?? []),
            source: this.source,
            collectedAt: new Date().toISOString(),
        };
    }
}
function buildIbmSearchPayload(options) {
    const filters = buildIbmTermFilters(options);
    const payload = {
        appId: "careers",
        scopes: ["careers2"],
        query: {
            bool: {
                must: [],
            },
        },
        size: options.pageSize ?? DEFAULT_PAGE_SIZE,
        sort: [{ _score: "desc" }, { pageviews: "desc" }],
        lang: "zz",
        localeSelector: {},
        sm: {
            query: options.query ?? "",
            lang: "zz",
        },
        _source: [
            "_id",
            "title",
            "url",
            "description",
            "language",
            "entitled",
            "field_keyword_05",
            "field_keyword_08",
            "field_keyword_17",
            "field_keyword_18",
            "field_keyword_19",
        ],
    };
    if (filters.length > 0) {
        payload.post_filter = {
            bool: {
                must: filters,
            },
        };
    }
    return payload;
}
function buildIbmTermFilters(options) {
    const filters = [];
    const country = getMappedFilterValue(COUNTRIES, options.country ?? options.location);
    const careerArea = getMappedFilterValue(CAREER_AREAS, options.careerArea);
    const experienceLevel = getMappedFilterValue(EXPERIENCE_LEVELS, options.experienceLevel);
    if (country !== undefined) {
        filters.push({ term: { field_keyword_05: country } });
    }
    if (careerArea !== undefined) {
        filters.push({ term: { field_keyword_08: careerArea } });
    }
    if (experienceLevel !== undefined) {
        filters.push({ term: { field_keyword_18: experienceLevel } });
    }
    return filters;
}
function mapIbmHitsToJobListings(hits) {
    return hits.map((hit) => {
        const source = hit._source;
        const url = normalizeIbmUrl(source.url);
        const jobListing = {
            id: extractJobId(url) ?? hit._id,
            title: source.title ?? "Untitled IBM role",
            company: "IBM",
            url,
            source: "IBM Talent",
        };
        if (source.field_keyword_19 !== undefined) {
            jobListing.location = source.field_keyword_19;
        }
        if (source.description !== undefined) {
            jobListing.description = source.description;
        }
        return jobListing;
    });
}
function getMappedFilterValue(values, value) {
    if (value === undefined) {
        return undefined;
    }
    return values[normalizeFilterKey(value)] ?? value;
}
function normalizeIbmUrl(url) {
    if (url === undefined) {
        return IBM_CAREERS_URL_PREFIX;
    }
    if (url.startsWith("http")) {
        return url;
    }
    return `${IBM_CAREERS_URL_PREFIX}${url}`;
}
function extractJobId(url) {
    try {
        return new URL(url).searchParams.get("jobId") ?? undefined;
    }
    catch {
        return undefined;
    }
}
function normalizeFilterKey(value) {
    return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}
