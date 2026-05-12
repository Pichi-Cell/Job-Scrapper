import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertCircle, ExternalLink } from "lucide-react";
const SOURCE_LABELS = {
    ibm: "IBM",
    ey: "EY",
    google: "Google",
    accenture: "Accenture",
    stripe: "Stripe",
    dynamite: "Dynamite Jobs",
    bumeran: "Bumeran",
    linkedin: "LinkedIn",
    wellfound: "Wellfound",
};
export function ResultsBoard({ results, isLoading, lastUpdated, }) {
    const total = results.reduce((sum, result) => sum + result.jobs.length, 0);
    return (_jsxs("main", { className: "results-shell", children: [_jsxs("div", { className: "results-summary", children: [_jsxs("div", { children: [_jsx("h1", { children: "JobScraper" }), _jsxs("p", { children: [total, " results"] })] }), _jsxs("div", { className: "run-state", children: [_jsx("span", { "data-loading": isLoading, children: isLoading ? "Loading" : "Ready" }), lastUpdated !== null && _jsx("span", { children: lastUpdated })] })] }), _jsx("div", { className: "source-columns", children: results.map((result) => (_jsxs("section", { className: "source-section", children: [_jsxs("header", { children: [_jsx("h2", { children: SOURCE_LABELS[result.source] }), _jsx("span", { children: result.jobs.length })] }), result.error !== null && (_jsxs("div", { className: "source-error", children: [_jsx(AlertCircle, { size: 16 }), _jsx("span", { children: result.error })] })), _jsx("div", { className: "job-list", children: result.jobs.map((job) => (_jsxs("article", { className: "job-card", children: [_jsxs("div", { children: [_jsxs("a", { href: job.url, target: "_blank", rel: "noreferrer", children: [job.title, _jsx(ExternalLink, { size: 14 })] }), _jsx("p", { children: job.location ?? "Location not listed" })] }), job.description !== undefined && _jsx("span", { children: job.description })] }, `${result.source}-${job.id}`))) })] }, result.source))) })] }));
}
