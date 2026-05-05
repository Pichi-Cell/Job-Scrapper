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

