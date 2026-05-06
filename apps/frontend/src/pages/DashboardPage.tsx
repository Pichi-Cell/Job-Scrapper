import { useMemo, useState } from "react";
import { AlertPanel } from "../components/AlertPanel.js";
import { FilterPanel } from "../components/FilterPanel.js";
import { ResultsBoard } from "../components/ResultsBoard.js";
import { useAlerts } from "../hooks/useAlerts.js";
import { useJobs } from "../hooks/useJobs.js";
import type { JobFilters } from "../types/jobs.js";

const INITIAL_FILTERS: JobFilters = {
  sources: ["ibm", "ey", "google", "accenture", "stripe", "dynamite"],
  query: "",
  location: "Argentina",
  area: "software-engineering",
  level: "early-mid-intern",
  profile: "",
  remote: true,
  dynamitePublicSalary: false,
  dynamiteIncludeClosed: false,
  pageSize: 10,
};

export function DashboardPage() {
  const [draftFilters, setDraftFilters] = useState<JobFilters>(INITIAL_FILTERS);
  const [activeFilters, setActiveFilters] = useState<JobFilters>(INITIAL_FILTERS);
  const stableFilters = useMemo(() => activeFilters, [activeFilters]);
  const jobsState = useJobs(stableFilters);
  const alertsState = useAlerts();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <FilterPanel
          filters={draftFilters}
          isLoading={jobsState.isLoading}
          onChange={setDraftFilters}
          onSubmit={() => setActiveFilters(draftFilters)}
        />
        <AlertPanel
          filters={draftFilters}
          alerts={alertsState.alerts}
          notifications={alertsState.notifications}
          error={alertsState.error}
          isSaving={alertsState.isSaving}
          onCreateAlert={alertsState.createAlert}
          onRemoveAlert={alertsState.removeAlert}
          onEnableNotifications={alertsState.enableNotifications}
        />
      </aside>
      <ResultsBoard
        results={jobsState.results}
        isLoading={jobsState.isLoading}
        lastUpdated={jobsState.lastUpdated}
      />
    </div>
  );
}
