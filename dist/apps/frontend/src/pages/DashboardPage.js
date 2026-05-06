import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { FilterPanel } from "../components/FilterPanel.js";
import { ResultsBoard } from "../components/ResultsBoard.js";
import { useJobs } from "../hooks/useJobs.js";
const INITIAL_FILTERS = {
    sources: ["ibm", "ey", "google", "accenture", "stripe", "dynamite"],
    query: "",
    location: "Argentina",
    careerArea: "",
    experienceLevel: "",
    eyProfile: "",
    googleSkills: "Software",
    googleTargetLevel: "EARLY,MID,INTERN_AND_APPRENTICE",
    googleRemote: true,
    accentureSkills: "software engineering",
    accentureRemoteType: "",
    accentureExperience: "",
    pageSize: 10,
};
export function DashboardPage() {
    const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
    const [activeFilters, setActiveFilters] = useState(INITIAL_FILTERS);
    const stableFilters = useMemo(() => activeFilters, [activeFilters]);
    const jobsState = useJobs(stableFilters);
    return (_jsxs("div", { className: "app-shell", children: [_jsx(FilterPanel, { filters: draftFilters, isLoading: jobsState.isLoading, onChange: setDraftFilters, onSubmit: () => setActiveFilters(draftFilters) }), _jsx(ResultsBoard, { results: jobsState.results, isLoading: jobsState.isLoading, lastUpdated: jobsState.lastUpdated })] }));
}
