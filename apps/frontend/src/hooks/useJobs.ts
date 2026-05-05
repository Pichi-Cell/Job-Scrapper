import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAllSources } from "../services/jobsApi.js";
import type { JobFilters, SourceResult } from "../types/jobs.js";

export interface JobsState {
  results: SourceResult[];
  isLoading: boolean;
  lastUpdated: string | null;
}

export function useJobs(filters: JobFilters): JobsState & { refresh: () => void } {
  const [results, setResults] = useState<SourceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => {
    abortRef.current?.abort();

    const abortController = new AbortController();
    abortRef.current = abortController;
    setIsLoading(true);

    fetchAllSources(filters, abortController.signal)
      .then((nextResults) => {
        setResults(nextResults);
        setLastUpdated(new Date().toLocaleTimeString());
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setResults(
            filters.sources.map((source) => ({
              source,
              jobs: [],
              error: error instanceof Error ? error.message : "Unknown request error",
            })),
          );
        }
      })
      .finally(() => {
        if (abortRef.current === abortController) {
          setIsLoading(false);
        }
      });
  }, [filters]);

  useEffect(() => {
    refresh();

    return () => {
      abortRef.current?.abort();
    };
  }, [refresh]);

  return {
    results,
    isLoading,
    lastUpdated,
    refresh,
  };
}

