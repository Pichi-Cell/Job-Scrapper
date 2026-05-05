import { useMemo, useState } from "react";
import { FilterPanel } from "../components/FilterPanel.js";
import { ResultsBoard } from "../components/ResultsBoard.js";
import { useJobs } from "../hooks/useJobs.js";
import type { JobFilters } from "../types/jobs.js";

const INITIAL_FILTERS: JobFilters = {
  sources: ["ibm", "ey", "google", "accenture"],
  query: "",
  location: "Argentina",
  careerArea: "",
  experienceLevel: "",
  eyProfile: "",
  googleSkills: "Software",
  googleTargetLevel: "EARLY,MID,INTERN_AND_APPRENTICE",
  googleRemote: true,
  accentureBusinessArea: "industry x",
  pageSize: 10,
};

export function DashboardPage() {
  const [draftFilters, setDraftFilters] = useState<JobFilters>(INITIAL_FILTERS);
  const [activeFilters, setActiveFilters] = useState<JobFilters>(INITIAL_FILTERS);
  const stableFilters = useMemo(() => activeFilters, [activeFilters]);
  const jobsState = useJobs(stableFilters);

  return (
    <div className="app-shell">
      <FilterPanel
        filters={draftFilters}
        isLoading={jobsState.isLoading}
        onChange={setDraftFilters}
        onSubmit={() => setActiveFilters(draftFilters)}
      />
      <ResultsBoard
        results={jobsState.results}
        isLoading={jobsState.isLoading}
        lastUpdated={jobsState.lastUpdated}
      />
    </div>
  );
}
