export async function fetchAllSources(filters, signal) {
    const results = await Promise.all(filters.sources.map((source) => fetchSource(source, filters, signal)));
    return results;
}
async function fetchSource(source, filters, signal) {
    const params = buildSourceParams(source, filters);
    try {
        const requestInit = {};
        if (signal !== undefined) {
            requestInit.signal = signal;
        }
        const response = await fetch(`/api/v1/jobs?${params.toString()}`, requestInit);
        const payload = (await response.json());
        if (!response.ok || payload.error !== null) {
            return {
                source,
                jobs: [],
                error: payload.error ?? `Request failed with status ${response.status}`,
            };
        }
        return {
            source,
            jobs: payload.data,
            error: null,
        };
    }
    catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
        }
        return {
            source,
            jobs: [],
            error: error instanceof Error ? error.message : "Unknown request error",
        };
    }
}
function buildSourceParams(source, filters) {
    const params = new URLSearchParams({
        source,
        pageSize: String(filters.pageSize),
    });
    addParam(params, "query", filters.query);
    addParam(params, "location", filters.location);
    if (source === "ibm") {
        addParam(params, "country", filters.location);
        addParam(params, "careerArea", filters.careerArea);
        addParam(params, "experienceLevel", filters.experienceLevel);
    }
    if (source === "ey") {
        addParam(params, "profile", filters.eyProfile);
    }
    if (source === "google") {
        addParam(params, "skills", filters.googleSkills);
        addParam(params, "targetLevel", filters.googleTargetLevel);
        params.set("remote", String(filters.googleRemote));
    }
    if (source === "accenture") {
        addParam(params, "skills", filters.query || filters.googleSkills);
        addParam(params, "businessArea", filters.accentureBusinessArea);
    }
    return params;
}
function addParam(params, key, value) {
    if (value.trim() !== "") {
        params.set(key, value.trim());
    }
}
