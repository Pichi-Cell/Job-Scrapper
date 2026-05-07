import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAgentPreset, } from "../services/agentPresetsApi.js";
const PRESETS = [
    { id: "react", label: "React" },
    { id: "nodejs", label: "Node.JS" },
    { id: "fullstack", label: "Fullstack" },
    { id: "embedded", label: "Embedded" },
];
export function AgentPresetsPage() {
    const [activePreset, setActivePreset] = useState("react");
    const [presetResult, setPresetResult] = useState(null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const abortRef = useRef(null);
    const endpoint = useMemo(() => `/api/v1/jobs/agent-presets/${activePreset}`, [activePreset]);
    const refresh = useCallback(() => {
        abortRef.current?.abort();
        const abortController = new AbortController();
        abortRef.current = abortController;
        setIsLoading(true);
        setError(null);
        fetchAgentPreset(activePreset, abortController.signal)
            .then((result) => {
            setPresetResult(result);
            setLastUpdated(new Date().toLocaleTimeString());
        })
            .catch((caughtError) => {
            if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
                return;
            }
            setPresetResult(null);
            setError(caughtError instanceof Error
                ? caughtError.message
                : "Unknown preset request error");
        })
            .finally(() => {
            if (abortRef.current === abortController) {
                setIsLoading(false);
            }
        });
    }, [activePreset]);
    useEffect(() => {
        refresh();
        return () => {
            abortRef.current?.abort();
        };
    }, [refresh]);
    return (_jsxs("main", { className: "preset-shell", children: [_jsxs("section", { className: "preset-toolbar", "aria-label": "Agent preset controls", children: [_jsxs("div", { children: [_jsx("h1", { children: "Agent Presets" }), _jsx("p", { children: endpoint })] }), _jsxs("button", { className: "refresh-button", type: "button", disabled: isLoading, onClick: refresh, children: [_jsx(RefreshCw, { size: 16 }), "Refresh"] })] }), _jsx("div", { className: "preset-tabs", role: "tablist", "aria-label": "Job presets", children: PRESETS.map((preset) => (_jsx("button", { className: "segment", type: "button", role: "tab", "aria-selected": activePreset === preset.id, "aria-pressed": activePreset === preset.id, onClick: () => setActivePreset(preset.id), children: preset.label }, preset.id))) }), _jsxs("section", { className: "preset-meta", "aria-label": "Preset state", children: [_jsx("span", { "data-loading": isLoading, children: isLoading ? "Loading" : "Ready" }), _jsxs("span", { children: [presetResult?.jobs.length ?? 0, " results"] }), presetResult !== null && (_jsxs("span", { children: [presetResult.limitPerSource, " max per source"] })), presetResult !== null && _jsx("span", { children: presetResult.filters.location }), lastUpdated !== null && _jsx("span", { children: lastUpdated })] }), error !== null && (_jsxs("div", { className: "source-error preset-error", children: [_jsx(AlertCircle, { size: 16 }), _jsx("span", { children: error })] })), presetResult !== null && presetResult.errors.length > 0 && (_jsx("section", { className: "preset-source-errors", "aria-label": "Source errors", children: presetResult.errors.map((sourceError) => (_jsxs("div", { className: "source-error", children: [_jsx(AlertCircle, { size: 16 }), _jsxs("span", { children: [sourceError.source, ": ", sourceError.error] })] }, sourceError.source))) })), _jsx("section", { className: "preset-results", "aria-label": "Preset jobs", children: presetResult?.jobs.map((job) => (_jsxs("article", { className: "job-card", children: [_jsxs("div", { children: [_jsxs("a", { href: job.url, target: "_blank", rel: "noreferrer", children: [job.title, _jsx(ExternalLink, { size: 14 })] }), _jsxs("p", { children: [job.company, " \u00B7 ", job.location ?? "Location not listed", " \u00B7 ", job.source] })] }), job.description !== undefined && _jsx("span", { children: job.description })] }, `${job.source}-${job.id}`))) })] }));
}
