# AI Project Summary

This file is a fast onboarding guide for AI agents working on `Job-Scrapper`.
It combines the current repository shape with the local Codex thread history for
this workspace as of 2026-05-11.

## Project Purpose

`Job-Scrapper` is a TypeScript monorepo for collecting public job listings,
normalizing them into a shared contract, and presenting them in a React UI.
The project also exposes an HTTP API, an in-memory alert system, and an
MCP-style JSON-RPC server that lets agents run curated job-search presets.

The governing design document is `constitution.md`. Its main constraints are:

- Use rate limiting and clear errors instead of silent failure.
- Keep scrapers, parsers, services, API, and UI concerns separate.
- Keep all job data normalized to the shared `JobListing` shape.
- Prefer strict TypeScript and simple, maintainable code.

## Stack

- Runtime: Node.js, ESM modules.
- Language: TypeScript with strict compiler options.
- Backend: Express 5.
- Frontend: React 19, Vite, lucide-react icons.
- Scraping/parsing: native `fetch`, Cheerio, Playwright for rendered pages.
- Push notifications: `web-push` plus a frontend service worker.
- Package management: npm workspaces.

## Root Scripts

- `npm run typecheck`: TypeScript check with no emit.
- `npm run build`: compile the whole monorepo into `dist`.
- `npm run dev:backend`: build then start the backend API.
- `npm run dev:frontend`: start Vite for the frontend.
- `npm run start:backend`: run `dist/apps/backend/src/server.js`.
- `npm run start:mcp`: run `dist/apps/backend/src/mcp/server.js`.

## Repository Layout

- `apps/backend`: Express API, scrapers, parsers, services, alerts, MCP server.
- `apps/frontend`: React UI, hooks, API clients, service worker.
- `packages/shared`: shared TypeScript contracts.
- `dist`: generated build output. Do not edit source behavior here directly.
- `node_modules`: installed dependencies. Do not summarize or edit manually.

Note: the repo currently has a misspelled `.gitgnore` file rather than the usual
`.gitignore`.

## Shared Data Contract

Shared jobs use `packages/shared/src/types/job-listing.ts`:

```ts
interface JobListing {
  id: string;
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  url: string;
  salary?: string;
  description?: string;
  datePosted?: string;
  source: string;
}
```

Backend scrapers implement `JobScraper` from
`apps/backend/src/types/scraper.ts`:

- `source`: display/source name.
- `scrape(options?: ScraperOptions)`: returns `{ jobs, source, collectedAt }`.

`ScraperOptions` is intentionally broad because each source supports different
filters: `query`, `location`, `country`, `careerArea`, `experienceLevel`,
`profile`, `skills`, `remote`, `targetLevel`, `businessArea`, `remoteType`,
`yearsOfExperience`, `employeeType`, `specialization`, `category`,
`hasPublicSalary`, `includeClosed`, `pageSize`, and `maxPages`.

## Backend Architecture

The backend entrypoint is `apps/backend/src/server.ts`.

- Default API port: `3001`.
- Mounts `apiRouter` from `apps/backend/src/routes/index.ts`.
- Logs each request with method, URL, status, and duration.
- Uses the response envelope from `apps/backend/src/api/response.ts`:
  `{ data, error }`.

Primary API endpoints:

- `GET /api/v1/jobs`: searches one source. Defaults to `source=ibm`.
- `GET /api/v1/jobs/agent-presets/:preset`: runs an agent preset.
- `GET /api/v1/alerts`: lists in-memory alerts.
- `POST /api/v1/alerts`: creates an in-memory alert.
- `GET /api/v1/alerts/notifications`: lists generated alert notifications.
- `GET /api/v1/alerts/push-public-key`: returns generated VAPID public key.
- `POST /api/v1/alerts/push-subscriptions`: stores a browser push subscription.
- `DELETE /api/v1/alerts/:id`: deletes an alert.
- `POST /api/v1/alerts/:id/run`: manually polls one alert.

`apps/backend/src/services/job-search.service.ts` owns source orchestration.
Supported sources are:

- `ibm`
- `ey`
- `google`
- `accenture`
- `stripe`
- `dynamite`
- `bumeran`
- `linkedin`
- `wellfound`

Errors from individual scrapers are caught, logged, and returned as source-level
errors. The API returns scraper failures as `502` for normal job searches.

## Scrapers

Scrapers live under `apps/backend/src/scrapers`. Parsers live under
`apps/backend/src/parsers` when parsing is non-trivial or source-specific.

Current source behavior:

- IBM: calls `https://www-api.ibm.com/search/api/v2`, maps IBM career area,
  experience level, and country filters, and normalizes hits into jobs.
- EY: fetches `https://careers.ey.com/ey/search/`, supports `CampusEY` and
  `ExperiencedEY` profiles, dedupes result rows, then fetches each detail page
  to enrich `description`, `datePosted`, and `salary` when available.
- Google: fetches public Google Careers result pages with location, skills, and
  target-level filters, then parses embedded/listing data with Cheerio.
- Accenture: calls the Accenture search API. `businessArea` defaults to the
  required fixed value `industry x`; the frontend intentionally does not expose
  that as a user choice.
- Stripe: parses a fixed, already-filtered Stripe jobs search URL for remote
  Argentina-relevant roles. No dynamic filters were intentionally added.
- Dynamite: calls Dynamite's Algolia-backed endpoint, supports category/skills
  and public-salary/closed-listing options.
- Bumeran: uses Playwright to render the React app and waits for
  `/api/avisos/searchV2`. It refuses Cloudflare challenge pages instead of
  bypassing them. Closed/inactive/expired jobs are filtered out unless
  `includeClosed=true`.
- LinkedIn: calls LinkedIn's public guest jobs search endpoint, parses the
  returned listing cards, then fetches public guest detail pages to enrich
  descriptions when available. It does not use auth, cookies, CAPTCHA handling,
  or challenge bypass; blocked search statuses are returned as explicit source
  errors, while blocked detail pages leave the base listing intact.
- Wellfound: fetches public Wellfound jobs/remote pages, parses JSON-LD when
  available and falls back to listing-link HTML parsing, then fetches public job
  detail pages to enrich descriptions. It does not use auth, cookies, CAPTCHA
  handling, or challenge bypass; blocked statuses are returned as explicit
  source errors for search pages and warnings for detail-page enrichment.

Common scraper conventions:

- Use a respectful `user-agent`.
- Prefer explicit timeouts.
- Retry transient failures up to 3 times where implemented.
- Use `DomainRateLimiter` for sites that may receive repeated requests.
- Do not make failures silent; surface useful error messages to callers.

## Frontend Architecture

The frontend entrypoint is `apps/frontend/src/main.tsx`; the main app is
`apps/frontend/src/App.tsx`.

Views:

- `DashboardPage`: normal source search plus alert management.
- `AgentPresetsPage`: UI for the agent preset endpoints.

Main components:

- `FilterPanel`: source toggles and unified filter controls.
- `ResultsBoard`: grouped source results and source-level errors.
- `AlertPanel`: create/delete alerts and enable push notifications.

Main hooks:

- `useJobs`: fetches all selected sources, aborts stale requests, tracks loading
  and last-updated state.
- `useAlerts`: fetches alerts/notifications, refreshes every minute, creates
  alerts, deletes alerts, and enables push notifications.

Main frontend API clients:

- `jobsApi.ts`: builds source-specific query params from unified filters.
- `alertsApi.ts`: creates alerts from current filters and manages push setup.
- `agentPresetsApi.ts`: fetches `/api/v1/jobs/agent-presets/:preset`.

## Unified Filters

The frontend uses one compact `JobFilters` model:

- `sources`
- `query`
- `location`
- `area`
- `level`
- `profile`
- `remote`
- `dynamitePublicSalary`
- `dynamiteIncludeClosed`
- `pageSize`

`jobsApi.ts` translates this unified model into source-specific params.
Examples:

- `area=software-engineering` maps to IBM `careerArea=Software Engineering`,
  generic `skills=software engineering`, and Dynamite `category=development`.
- `level` maps to IBM `experienceLevel`, Google `targetLevel`, and Accenture
  `yearsOfExperience`.
- Accenture always sends `businessArea=industry x`.
- Google and Accenture receive `remote`/`remoteType` when the unified remote
  checkbox is enabled.

## Alerts

The alert system is intentionally in-memory. It does not use a database and all
alert state resets when the backend process restarts.

Backend behavior:

- `createAlert` stores alert filters and starts a `setInterval`.
- Polling interval is 6 hours.
- The first poll is baseline-only so existing jobs do not immediately notify.
- Later polls compare job keys by URL, falling back to `source:id`.
- New matches are stored in an in-memory notification list.
- Push notifications are sent to all registered browser subscriptions.

Frontend behavior:

- Alerts are created from the current filter set.
- Saving an alert also attempts to subscribe to browser push notifications.
- `apps/frontend/public/alert-sw.js` displays notifications with
  `requireInteraction: true`, so they remain until manually closed.

## Agent Presets and MCP Layer

Agent presets live in `apps/backend/src/services/agent-preset.service.ts`.

Preset IDs:

- `react`
- `nodejs`
- `fullstack`
- `embedded`

Each preset targets remote Software Engineering jobs in Argentina at any
seniority level and caps results at 30 per source.

HTTP endpoint:

- `GET /api/v1/jobs/agent-presets/:preset`
- Optional query: `source=<ibm|ey|google|accenture|stripe|dynamite|bumeran|linkedin|wellfound>`

MCP-style server:

- Source: `apps/backend/src/mcp/server.ts`
- Start with `npm run build` then `npm run start:mcp`.
- Default URL: `http://localhost:3002/mcp`.
- Health check: `http://localhost:3002/health`.
- JSON-RPC protocol version returned by initialize: `2024-11-05`.
- Exposes tools:
  - `list_agent_job_presets`
  - `search_agent_job_preset`

The local thread history indicates the configured Codex MCP server name was
normalized to `job_scraper`/`job_scraper2` during setup experiments. Check the
user's Codex config if MCP discovery is part of the task.

## Thread-Derived History

These are the project-relevant threads found in local Codex session records:

- 2026-05-05, "Update accenture filters": Accenture's `industry x` business area
  became a fixed required parameter. The frontend should not expose it as a
  user-editable filter.
- 2026-05-05, "Add Stripe jobs scraper": Stripe was added from a pre-filtered
  URL. Dynamite and Bumeran work also happened in this thread. LinkedIn scraping
  was not implemented then, consistent with the project's legality/ethics rules.
- 2026-05-11, "Add LinkedIn data source": LinkedIn was added through the public
  guest jobs endpoint with rate limiting, no authentication, and explicit errors
  when LinkedIn blocks public search access. LinkedIn detail-page enrichment was
  then added for job descriptions.
- 2026-05-11, "Add Wellfound data source": Wellfound was added through public
  jobs/remote pages with rate limiting, JSON-LD/listing-link parsing, detail-page
  description enrichment, and explicit blocked-access errors.
- 2026-05-05, Bumeran follow-ups: errors should not be swallowed; Bumeran moved
  to a Playwright-rendered extraction path because direct requests returned 403;
  closed listings are filtered unless explicitly included.
- 2026-05-06, "Unify filter translations": frontend source-specific filters were
  collapsed into shared `area`, `level`, `profile`, and `remote` controls with
  translation in `jobsApi.ts`.
- 2026-05-06, "Follow constitution.md": in-memory alerts and push notifications
  were added. Alerts poll every 6 hours and browser notifications are persistent.
- 2026-05-07, "Add job search endpoints": agent-oriented preset endpoints were
  added for React, Node.JS, Fullstack, and Embedded searches.
- 2026-05-07, MCP setup threads: the project MCP HTTP server was added/tested,
  `tmp-call-job-mcp.mjs` was used as a local diagnostic script, and Codex config
  naming was investigated.
- 2026-05-07, "List MCP servers": a working `job_scraper2` server exposed the
  four presets and seven sources at the time.
- 2026-05-07, "Add EY job descriptions": EY now enriches listings by fetching
  detail pages and extracting longer descriptions, dates, and salaries when
  available.

## Current Working Tree Notes

At the time this summary was created, the repo already had uncommitted changes
outside this file:

- `apps/backend/README.md`
- `apps/backend/src/mcp/server.ts`
- `apps/backend/src/scrapers/ey.scraper.ts`
- `dist/apps/backend/src/mcp/server.js`
- `dist/apps/backend/src/scrapers/ey.scraper.js`
- `tmp-call-job-mcp.mjs`

Treat those as user/project changes unless explicitly asked to revert or commit
them. Do not edit generated `dist` files directly unless the task specifically
requires updating compiled output.

## Development Guidance for Future AI Agents

- Read `constitution.md` before changing scraper behavior.
- Prefer source files under `apps/**/src` and `packages/**/src`; ignore
  `dist` unless checking generated output.
- Keep new scraper code isolated by source.
- Use `ScraperOptions` rather than inventing a second filter contract.
- Update `JOB_SOURCES`, frontend `JobSource`, `FilterPanel`, and `jobsApi.ts`
  together when adding a source.
- Update `agent-preset.service.ts`, `AgentPresetsPage`, and MCP tool schemas
  together when adding an agent preset.
- Keep API responses in `{ data, error }` form.
- Preserve source-level error visibility; users explicitly asked not to fail
  silently.
- For Bumeran and similar rendered sites, do not bypass bot challenges. Return a
  clear error instead.
- Run `npm run typecheck` after source changes. Run `npm run build` when backend
  runtime output or MCP startup behavior matters.
