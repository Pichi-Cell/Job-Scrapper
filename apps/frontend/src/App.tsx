import { Bot, Search } from "lucide-react";
import { useState } from "react";
import { AgentPresetsPage } from "./pages/AgentPresetsPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";

type AppView = "search" | "agent-presets";

export function App() {
  const [activeView, setActiveView] = useState<AppView>("search");

  return (
    <>
      <nav className="app-nav" aria-label="Main">
        <button
          type="button"
          aria-pressed={activeView === "search"}
          onClick={() => setActiveView("search")}
        >
          <Search size={17} />
          Search
        </button>
        <button
          type="button"
          aria-pressed={activeView === "agent-presets"}
          onClick={() => setActiveView("agent-presets")}
        >
          <Bot size={17} />
          Agent presets
        </button>
      </nav>

      {activeView === "search" ? <DashboardPage /> : <AgentPresetsPage />}
    </>
  );
}
