import { AlertCircle, ExternalLink } from "lucide-react";
import type { SourceResult } from "../types/jobs.js";

interface ResultsBoardProps {
  results: SourceResult[];
  isLoading: boolean;
  lastUpdated: string | null;
}

const SOURCE_LABELS: Record<string, string> = {
  ibm: "IBM",
  ey: "EY",
};

export function ResultsBoard({
  results,
  isLoading,
  lastUpdated,
}: ResultsBoardProps) {
  const total = results.reduce((sum, result) => sum + result.jobs.length, 0);

  return (
    <main className="results-shell">
      <div className="results-summary">
        <div>
          <h1>JobScraper</h1>
          <p>{total} results</p>
        </div>
        <div className="run-state">
          <span data-loading={isLoading}>{isLoading ? "Loading" : "Ready"}</span>
          {lastUpdated !== null && <span>{lastUpdated}</span>}
        </div>
      </div>

      <div className="source-columns">
        {results.map((result) => (
          <section className="source-section" key={result.source}>
            <header>
              <h2>{SOURCE_LABELS[result.source]}</h2>
              <span>{result.jobs.length}</span>
            </header>

            {result.error !== null && (
              <div className="source-error">
                <AlertCircle size={16} />
                <span>{result.error}</span>
              </div>
            )}

            <div className="job-list">
              {result.jobs.map((job) => (
                <article className="job-card" key={`${result.source}-${job.id}`}>
                  <div>
                    <a href={job.url} target="_blank" rel="noreferrer">
                      {job.title}
                      <ExternalLink size={14} />
                    </a>
                    <p>{job.location ?? "Location not listed"}</p>
                  </div>
                  {job.description !== undefined && <span>{job.description}</span>}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
