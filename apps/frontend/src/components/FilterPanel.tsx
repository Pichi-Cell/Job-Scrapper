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
          <button
            aria-pressed={filters.sources.includes("stripe")}
            className="segment"
            type="button"
            onClick={() => toggleSource("stripe")}
          >
            Stripe
          </button>
          <button
            aria-pressed={filters.sources.includes("dynamite")}
            className="segment"
            type="button"
            onClick={() => toggleSource("dynamite")}
          >
            Dynamite
          </button>
          <button
            aria-pressed={filters.sources.includes("bumeran")}
            className="segment"
            type="button"
            onClick={() => toggleSource("bumeran")}
          >
            Bumeran
          </button>
          <button
            aria-pressed={filters.sources.includes("linkedin")}
            className="segment"
            type="button"
            onClick={() => toggleSource("linkedin")}
          >
            LinkedIn
          </button>
          <button
            aria-pressed={filters.sources.includes("wellfound")}
            className="segment"
            type="button"
            onClick={() => toggleSource("wellfound")}
          >
            Wellfound
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
          <span>Area</span>
          <select
            value={filters.area}
            onChange={(event) => update("area", event.target.value)}
          >
            <option value="">Any</option>
            <option value="software-engineering">Software Engineering</option>
            <option value="marketing">Marketing</option>
            <option value="customer-support">Customer Support</option>
            <option value="sales">Sales</option>
            <option value="operations">Operations</option>
            <option value="product">Product</option>
            <option value="design">Design</option>
          </select>
        </label>

        <label>
          <span>Level</span>
          <select
            value={filters.level}
            onChange={(event) => update("level", event.target.value)}
          >
            <option value="">Any</option>
            <option value="early-mid-intern">Early, Mid, Intern</option>
            <option value="intern">Intern</option>
            <option value="entry">Entry</option>
            <option value="mid">Mid</option>
            <option value="professional">Professional</option>
          </select>
        </label>

        <label>
          <span>Profile</span>
          <select
            value={filters.profile}
            onChange={(event) => update("profile", event.target.value)}
          >
            <option value="">Both</option>
            <option value="students">Students</option>
            <option value="experienced">Experienced</option>
          </select>
        </label>

        <label className="checkbox-row">
          <input
            checked={filters.remote}
            type="checkbox"
            onChange={(event) => update("remote", event.target.checked)}
          />
          <span>Remote eligible</span>
        </label>

        <label className="checkbox-row">
          <input
            checked={filters.dynamitePublicSalary}
            type="checkbox"
            onChange={(event) =>
              update("dynamitePublicSalary", event.target.checked)
            }
          />
          <span>Dynamite public salary</span>
        </label>

        <label className="checkbox-row">
          <input
            checked={filters.dynamiteIncludeClosed}
            type="checkbox"
            onChange={(event) =>
              update("dynamiteIncludeClosed", event.target.checked)
            }
          />
          <span>Dynamite include closed</span>
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
