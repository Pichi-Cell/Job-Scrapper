# JobScraper

TypeScript job-listing scraper and viewer. The project collects public job
listings from multiple sources, normalizes them into a shared contract, exposes
them through an Express API, and presents them in a React frontend.

For a deeper AI-oriented handoff, see `AI_PROJECT_SUMMARY.md`.

## What It Does

- Searches supported job sources with a unified filter model.
- Normalizes results into the shared `JobListing` type.
- Shows grouped source results and source-level errors in the frontend.
- Supports in-memory alerts that poll every 6 hours.
- Sends Web Push notifications for newly discovered positions.
- Exposes agent-ready preset searches through HTTP and an MCP-style server.

## Stack

- Node.js + TypeScript using ESM modules.
- Express backend.
- React + Vite frontend.
- Cheerio for HTML parsing.
- Playwright for rendered public pages that need browser execution.
- `web-push` for browser notifications.
- npm workspaces.

## Project Layout

```text
apps/
  backend/
    src/
      api/        HTTP controllers and response helpers
      mcp/        JSON-RPC MCP-style HTTP server
      parsers/    source-specific parsing logic
      routes/     Express route wiring
      scrapers/   public source fetch/render logic
      services/   search orchestration, presets, alerts, push
      types/      backend-only contracts
      utils/      rate limiting, sleep, HTTP helpers
  frontend/
    public/       service worker for alert notifications
    src/
      components/ reusable UI components
      hooks/      data-fetching and alert hooks
      pages/      app views
      services/   frontend API clients
      types/      frontend types
packages/
  shared/         shared data contracts
```

## Setup

```sh
npm install
```

## Scripts

```sh
npm run typecheck
npm run build
npm run dev:backend
npm run dev:frontend
npm run start:backend
npm run start:mcp
```

- Backend API default: `http://localhost:3001`
- Frontend Vite dev server: the URL printed by Vite, usually
  `http://localhost:5173`
- MCP HTTP server default: `http://localhost:3002/mcp`

## Supported Sources

- `ibm`
- `ey`
- `google`
- `accenture`
- `stripe`
- `dynamite`
- `bumeran`
- `linkedin`
- `wellfound`

## API

All API responses use:

```json
{
  "data": [],
  "error": null
}
```

Main endpoints:

- `GET /api/v1/jobs`
- `GET /api/v1/jobs/agent-presets/:preset`
- `GET /api/v1/alerts`
- `POST /api/v1/alerts`
- `GET /api/v1/alerts/notifications`
- `GET /api/v1/alerts/push-public-key`
- `POST /api/v1/alerts/push-subscriptions`
- `DELETE /api/v1/alerts/:id`
- `POST /api/v1/alerts/:id/run`

Example:

```text
GET /api/v1/jobs?source=ibm&location=Argentina&careerArea=Software%20Engineering&pageSize=10
```

## Agent Presets

Agent presets search remote Software Engineering jobs in Argentina and cap
results at 30 per source.

Supported presets:

- `react`
- `nodejs`
- `fullstack`
- `embedded`

Example:

```text
GET /api/v1/jobs/agent-presets/react
GET /api/v1/jobs/agent-presets/react?source=linkedin
```

The MCP-style server exposes:

- `list_agent_job_presets`
- `search_agent_job_preset`

Start it with:

```sh
npm run build
npm run start:mcp
```

## Alerts

Alerts are stored in memory only. Restarting the backend clears saved alerts,
known job keys, notification history, and push subscriptions.

When an alert is created, the backend performs an initial baseline poll so
existing jobs do not immediately trigger notifications. Later polls compare by
job URL, falling back to `source:id`, and notify only for new matches.

## Development Notes

The project follows `constitution.md`:

- Scrape only public data.
- Do not bypass authentication, paywalls, CAPTCHAs, or bot challenges.
- Use rate limiting and explicit timeouts.
- Surface source errors instead of failing silently.
- Keep scrapers, parsers, services, API, and UI concerns separated.
- Run `npm run typecheck` after source changes.

Generated build output lives in `dist`; edit source files under `apps/**/src`
and `packages/**/src`.
