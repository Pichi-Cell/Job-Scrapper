import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAllSources } from "../services/jobsApi.js";
export function useJobs(filters) {
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const abortRef = useRef(null);
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
            .catch((error) => {
            if (!(error instanceof DOMException && error.name === "AbortError")) {
                setResults(filters.sources.map((source) => ({
                    source,
                    jobs: [],
                    error: error instanceof Error ? error.message : "Unknown request error",
                })));
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
