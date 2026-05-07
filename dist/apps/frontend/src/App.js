import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Bot, Search } from "lucide-react";
import { useState } from "react";
import { AgentPresetsPage } from "./pages/AgentPresetsPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
export function App() {
    const [activeView, setActiveView] = useState("search");
    return (_jsxs(_Fragment, { children: [_jsxs("nav", { className: "app-nav", "aria-label": "Main", children: [_jsxs("button", { type: "button", "aria-pressed": activeView === "search", onClick: () => setActiveView("search"), children: [_jsx(Search, { size: 17 }), "Search"] }), _jsxs("button", { type: "button", "aria-pressed": activeView === "agent-presets", onClick: () => setActiveView("agent-presets"), children: [_jsx(Bot, { size: 17 }), "Agent presets"] })] }), activeView === "search" ? _jsx(DashboardPage, {}) : _jsx(AgentPresetsPage, {})] }));
}
