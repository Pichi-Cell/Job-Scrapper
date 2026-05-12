# Backend

TypeScript + Node.js backend for scraping, parsing, normalizing, and exposing job listings.

## Structure

- `src/scrapers`: fetch raw public HTML or data
- `src/parsers`: extract structured data from raw source responses
- `src/services`: business logic, orchestration, deduplication, normalization
- `src/api`: HTTP routes and response contracts
- `src/utils`: shared backend helpers
- `src/types`: backend-only TypeScript types
- `tests`: backend unit tests

## MCP server

Build the project, then start the MCP HTTP server:

```sh
npm run build
npm run start:mcp
```

By default it listens at:

```text
http://localhost:3002/mcp
```

The server exposes two tools:

- `list_agent_job_presets`: returns the available presets and sources
- `search_agent_job_preset`: searches one preset, optionally narrowed to a source

Supported presets are `react`, `nodejs`, `fullstack`, and `embedded`. Each preset searches remote Software Engineering jobs in Argentina and returns up to 30 listings per source.

