import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { AlertPanel } from "../components/AlertPanel.js";
import { FilterPanel } from "../components/FilterPanel.js";
import { ResultsBoard } from "../components/ResultsBoard.js";
import { useAlerts } from "../hooks/useAlerts.js";
import { useJobs } from "../hooks/useJobs.js";
const INITIAL_FILTERS = {
    sources: ["ibm", "ey", "google", "accenture", "stripe", "dynamite", "bumeran"],
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
    const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
    const [activeFilters, setActiveFilters] = useState(INITIAL_FILTERS);
    const stableFilters = useMemo(() => activeFilters, [activeFilters]);
    const jobsState = useJobs(stableFilters);
    const alertsState = useAlerts();
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsx(FilterPanel, { filters: draftFilters, isLoading: jobsState.isLoading, onChange: setDraftFilters, onSubmit: () => setActiveFilters(draftFilters) }), _jsx(AlertPanel, { filters: draftFilters, alerts: alertsState.alerts, notifications: alertsState.notifications, error: alertsState.error, isSaving: alertsState.isSaving, onCreateAlert: alertsState.createAlert, onRemoveAlert: alertsState.removeAlert, onEnableNotifications: alertsState.enableNotifications })] }), _jsx(ResultsBoard, { results: jobsState.results, isLoading: jobsState.isLoading, lastUpdated: jobsState.lastUpdated })] }));
}
