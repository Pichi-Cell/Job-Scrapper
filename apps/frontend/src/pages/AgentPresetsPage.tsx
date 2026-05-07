import { AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchAgentPreset,
  type AgentPresetId,
  type AgentPresetResponse,
} from "../services/agentPresetsApi.js";

const PRESETS: Array<{ id: AgentPresetId; label: string }> = [
  { id: "react", label: "React" },
  { id: "nodejs", label: "Node.JS" },
  { id: "fullstack", label: "Fullstack" },
  { id: "embedded", label: "Embedded" },
];

export function AgentPresetsPage() {
  const [activePreset, setActivePreset] = useState<AgentPresetId>("react");
  const [presetResult, setPresetResult] = useState<AgentPresetResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const endpoint = useMemo(
    () => `/api/v1/jobs/agent-presets/${activePreset}`,
    [activePreset],
  );

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
      .catch((caughtError: unknown) => {
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return;
        }

        setPresetResult(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Unknown preset request error",
        );
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

  return (
    <main className="preset-shell">
      <section className="preset-toolbar" aria-label="Agent preset controls">
        <div>
          <h1>Agent Presets</h1>
          <p>{endpoint}</p>
        </div>
        <button
          className="refresh-button"
          type="button"
          disabled={isLoading}
          onClick={refresh}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      <div className="preset-tabs" role="tablist" aria-label="Job presets">
        {PRESETS.map((preset) => (
          <button
            className="segment"
            type="button"
            role="tab"
            aria-selected={activePreset === preset.id}
            aria-pressed={activePreset === preset.id}
            key={preset.id}
            onClick={() => setActivePreset(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <section className="preset-meta" aria-label="Preset state">
        <span data-loading={isLoading}>{isLoading ? "Loading" : "Ready"}</span>
        <span>{presetResult?.jobs.length ?? 0} results</span>
        {presetResult !== null && (
          <span>{presetResult.limitPerSource} max per source</span>
        )}
        {presetResult !== null && <span>{presetResult.filters.location}</span>}
        {lastUpdated !== null && <span>{lastUpdated}</span>}
      </section>

      {error !== null && (
        <div className="source-error preset-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {presetResult !== null && presetResult.errors.length > 0 && (
        <section className="preset-source-errors" aria-label="Source errors">
          {presetResult.errors.map((sourceError) => (
            <div className="source-error" key={sourceError.source}>
              <AlertCircle size={16} />
              <span>
                {sourceError.source}: {sourceError.error}
              </span>
            </div>
          ))}
        </section>
      )}

      <section className="preset-results" aria-label="Preset jobs">
        {presetResult?.jobs.map((job) => (
          <article className="job-card" key={`${job.source}-${job.id}`}>
            <div>
              <a href={job.url} target="_blank" rel="noreferrer">
                {job.title}
                <ExternalLink size={14} />
              </a>
              <p>
                {job.company} · {job.location ?? "Location not listed"} · {job.source}
              </p>
            </div>
            {job.description !== undefined && <span>{job.description}</span>}
          </article>
        ))}
      </section>
    </main>
  );
}
