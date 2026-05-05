import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DashboardPage } from "./pages/DashboardPage.js";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <DashboardPage />
  </StrictMode>,
);

