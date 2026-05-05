import { RefreshCw, Search } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import type { JobFilters, JobSource } from "../types/jobs.js";

interface FilterPanelProps {
  filters: JobFilters;
  isLoading: boolean;
  onChange: (filters: JobFilters) => void;
  onSubmit: () => void;
}

export function FilterPanel({
  filters,
  isLoading,
  onChange,
  onSubmit,
}: FilterPanelProps) {
  function update<K extends keyof JobFilters>(key: K, value: JobFilters[K]): void {
    onChange({
      ...filters,
      [key]: value,
    });
  }

  function toggleSource(source: JobSource): void {
    const nextSources = filters.sources.includes(source)
      ? filters.sources.filter((item) => item !== source)
      : [...filters.sources, source];

    if (nextSources.length > 0) {
      update("sources", nextSources);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="filters" onSubmit={handleSubmit}>
      <div className="toolbar">
        <div className="source-toggle" aria-label="Sources">
          <button
            aria-pressed={filters.sources.includes("ibm")}
            className="segment"
            type="button"
            onClick={() => toggleSource("ibm")}
          >
            IBM
          </button>
          <button
            aria-pressed={filters.sources.includes("ey")}
            className="segment"
            type="button"
            onClick={() => toggleSource("ey")}
          >
            EY
          </button>
          <button
            aria-pressed={filters.sources.includes("google")}
            className="segment"
            type="button"
            onClick={() => toggleSource("google")}
          >
            Google
          </button>
          <button
            aria-pressed={filters.sources.includes("accenture")}
            className="segment"
            type="button"
            onClick={() => toggleSource("accenture")}
          >
            Accenture
          </button>
        </div>

        <button className="refresh-button" disabled={isLoading} type="submit">
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <div className="filter-grid">
        <label>
          <span>Keyword</span>
          <div className="search-input">
            <Search size={16} />
            <input
              value={filters.query}
              onChange={(event) => update("query", event.target.value)}
            />
          </div>
        </label>

        <label>
          <span>Location</span>
          <input
            value={filters.location}
            onChange={(event) => update("location", event.target.value)}
          />
        </label>

        <label>
          <span>IBM Area</span>
          <select
            value={filters.careerArea}
            onChange={(event) => update("careerArea", event.target.value)}
          >
            <option value="">Any</option>
            <option value="Software Engineering">Software Engineering</option>
          </select>
        </label>

        <label>
          <span>IBM Level</span>
          <select
            value={filters.experienceLevel}
            onChange={(event) => update("experienceLevel", event.target.value)}
          >
            <option value="">Any</option>
            <option value="Internship">Internship</option>
            <option value="Entry Level">Entry Level</option>
            <option value="Professional">Professional</option>
          </select>
        </label>

        <label>
          <span>EY Profile</span>
          <select
            value={filters.eyProfile}
            onChange={(event) => update("eyProfile", event.target.value)}
          >
            <option value="">Both</option>
            <option value="students">Students</option>
            <option value="experienced">Experienced</option>
          </select>
        </label>

        <label>
          <span>Google Skills</span>
          <input
            value={filters.googleSkills}
            onChange={(event) => update("googleSkills", event.target.value)}
          />
        </label>

        <label>
          <span>Google Level</span>
          <select
            value={filters.googleTargetLevel}
            onChange={(event) => update("googleTargetLevel", event.target.value)}
          >
            <option value="EARLY,MID,INTERN_AND_APPRENTICE">
              Early, Mid, Intern
            </option>
            <option value="EARLY">Early</option>
            <option value="MID">Mid</option>
            <option value="INTERN_AND_APPRENTICE">Intern</option>
          </select>
        </label>

        <label className="checkbox-row">
          <input
            checked={filters.googleRemote}
            type="checkbox"
            onChange={(event) => update("googleRemote", event.target.checked)}
          />
          <span>Google remote eligible</span>
        </label>

        <label>
          <span>Accenture Area</span>
          <input
            value={filters.accentureBusinessArea}
            onChange={(event) => update("accentureBusinessArea", event.target.value)}
          />
        </label>

        <label>
          <span>Limit</span>
          <select
            value={filters.pageSize}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              update("pageSize", Number.parseInt(event.target.value, 10))
            }
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
          </select>
        </label>
      </div>
    </form>
  );
}
