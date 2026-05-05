# 📜 CONSTITUTION.md  
**Project Constitution for Job Listing Scraper**

---

## 1. Purpose

This project aims to build a reliable, maintainable, job listing scraper and viewer using:

- **Backend:** TypeScript + Node.js  
- **Frontend:** React (TypeScript)  

The system collects publicly available job listings, normalizes them, and presents them in a user-friendly interface.

---

## 2. Core Principles

### 2.1 Legality & Ethics First
- Only scrape **publicly accessible data**
- Respect **robots.txt** and website terms of service
- Avoid aggressive scraping (rate limiting is mandatory)
- Do not bypass authentication, paywalls, or CAPTCHAs

### 2.2 Maintainability Over Cleverness
- Prefer clear, readable code over complex optimizations
- Every module should be understandable within minutes

### 2.3 Type Safety is Non-Negotiable
- Use strict TypeScript settings
- Avoid `any` unless absolutely necessary (and justify it)

### 2.4 Separation of Concerns
- Scraping logic ≠ data processing ≠ API ≠ UI
- Keep layers independent and testable

---

## 3. Architecture Guidelines

### 3.1 Backend (Node.js + TypeScript)

**Structure:**

/src
/scrapers
/parsers
/services
/api
/utils


**Rules:**
- Scrapers only fetch raw HTML/data
- Parsers extract structured data
- Services handle business logic
- API layer exposes endpoints

### 3.2 Frontend (React)

**Structure:**

/src
/components
/pages
/hooks
/services
/types


**Rules:**
- Components must be reusable and small
- Keep logic in hooks, not UI components
- Centralize API calls in `/services`

---

## 4. Scraping Standards

### 4.1 Rate Limiting
- Default: **1 request per 2–5 seconds per domain**
- Use queues or throttling libraries

### 4.2 Fault Tolerance
- Scrapers must:
  - Handle missing fields gracefully
  - Retry failed requests (max 3 times)
  - Log failures clearly

### 4.3 Idempotency
- Running the scraper multiple times should not duplicate data

### 4.4 Source Isolation
- Each site must have its own scraper module:

/scrapers
linkedin.scraper.ts
indeed.scraper.ts


---

## 5. Data Standards

### 5.1 Job Listing Schema

All jobs must conform to a shared interface:

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
5.2 Normalization Rules
Trim whitespace
Normalize dates to ISO format
Standardize location strings
Deduplicate by url or id
6. API Design
RESTful conventions only

Version endpoints:

/api/v1/jobs

Always return:

{
  "data": [],
  "error": null
}
7. Frontend Principles
7.1 UX First
Fast load times
Clear job filtering and search
Mobile-friendly design
7.2 State Management
Prefer simple solutions (React hooks) before adding heavy libraries
7.3 Error Handling
Always show user-friendly error messages
Never expose raw backend errors
8. Testing Requirements
Backend:
Unit tests for parsers and services
Mock external HTTP requests
Frontend:
Component tests for critical UI
Hook tests for logic-heavy hooks
9. Logging & Monitoring
Use structured logging (JSON preferred)
Log:
Scraping start/end
Errors
Number of jobs collected
10. Contribution Rules
10.1 Pull Requests Must:
Pass all tests
Include clear description
Be scoped to a single concern
10.2 Code Style
Use ESLint + Prettier
No commented-out code
No console logs in production
11. Security Considerations
Sanitize all external data
Prevent XSS in frontend rendering
Do not store sensitive data from scraped sources
12. Performance Guidelines
Avoid unnecessary re-renders in React
Cache repeated scraping results where appropriate
Use pagination for large datasets
13. Future-Proofing
Design scrapers to be easily replaceable (sites change often)
Abstract scraping logic to allow switching to APIs if available
14. Non-Goals

This project is NOT:

A bot for applying to jobs automatically
A tool for bypassing site protections
A data resale platform
15. Decision Making

When in doubt:

Choose the simplest solution
Choose the most maintainable option
Choose the most ethical approa