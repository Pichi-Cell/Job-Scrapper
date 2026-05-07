import { JOB_SOURCES, isSupportedSource, searchSources, } from "./job-search.service.js";
export const AGENT_PRESET_LIMIT_PER_SOURCE = 30;
export const AGENT_JOB_PRESETS = {
    react: buildAgentJobPreset("react", "React"),
    nodejs: buildAgentJobPreset("nodejs", "Node.JS"),
    fullstack: buildAgentJobPreset("fullstack", "Fullstack"),
    embedded: buildAgentJobPreset("embedded", "Embedded"),
};
export function getAgentJobPreset(preset) {
    if (preset === undefined) {
        return undefined;
    }
    return AGENT_JOB_PRESETS[preset.toLowerCase()];
}
export function listAgentJobPresets() {
    return Object.values(AGENT_JOB_PRESETS);
}
export async function searchAgentJobPreset(presetId, requestedSource) {
    const preset = AGENT_JOB_PRESETS[presetId];
    const sources = requestedSource === undefined ? JOB_SOURCES : [requestedSource];
    const unsupportedSource = sources.find((source) => !isSupportedSource(source));
    if (unsupportedSource !== undefined) {
        throw new Error(`Unsupported source: ${unsupportedSource}`);
    }
    const results = await searchSources(sources.map((source) => ({
        source: source,
        options: buildAgentPresetOptions(source, preset),
    })));
    return {
        preset: preset.id,
        filters: preset.filters,
        limitPerSource: AGENT_PRESET_LIMIT_PER_SOURCE,
        jobs: results.flatMap((result) => result.jobs),
        errors: results
            .filter((result) => result.error !== null)
            .map((result) => ({
            source: result.source,
            error: result.error ?? "Unknown scraper error",
        })),
    };
}
function buildAgentJobPreset(id, skill) {
    return {
        id,
        skill,
        filters: {
            remote: true,
            location: "Argentina",
            careerArea: "Software Engineering",
            seniority: "any",
        },
    };
}
function buildAgentPresetOptions(source, preset) {
    const baseOptions = {
        query: preset.skill,
        location: preset.filters.location,
        country: preset.filters.location,
        pageSize: AGENT_PRESET_LIMIT_PER_SOURCE,
    };
    if (source === "ibm") {
        return {
            ...baseOptions,
            careerArea: preset.filters.careerArea,
        };
    }
    if (source === "google") {
        return {
            ...baseOptions,
            skills: `${preset.filters.careerArea} ${preset.skill}`,
            remote: preset.filters.remote,
            targetLevel: "all",
        };
    }
    if (source === "accenture") {
        return {
            ...baseOptions,
            skills: `${preset.filters.careerArea} ${preset.skill}`,
            businessArea: "industry x",
            remoteType: "Remote",
        };
    }
    if (source === "dynamite") {
        return {
            ...baseOptions,
            skills: `${preset.filters.careerArea} ${preset.skill}`,
            category: "development",
        };
    }
    return {
        ...baseOptions,
        skills: `${preset.filters.careerArea} ${preset.skill}`,
        remote: preset.filters.remote,
    };
}
