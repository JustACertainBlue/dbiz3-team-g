# Technical Research & Architecture Decisions: Admin Dashboard (ADM)

**Feature**: `003-adm-core` | **Spec**: [specs/003-adm-core/spec.md](spec.md)

This document records the technical choices, architectural evaluations, and resolution of all design considerations for the Admin Dashboard (`ADM`) module, screen `ADM079`.

---

## 1. Dashboard Architecture & State Management (Screen ADM079)

- **Decision**: Implement screen `ADM079` as a Next.js 14 App Router client page (`src/app/admin/page.tsx`) backed by an aggregated REST endpoint (`GET /api/adm/dashboard`). The client page manages filter state (`preset`, `customDateRange`, `villageId`, `agencyId`, `providerId`, `sortBy`) in URL query parameters and local React state, fetching the scoped dashboard payload whenever filters change.
- **Rationale**: 
  - Centralizing metrics calculation into an API route ensures that role and village scoping (`BR-001` to `BR-005`, `BR-010`) are strictly evaluated on the server side before any data is emitted to the client.
  - URL query state enables direct linking, browser history navigation, and deterministic refresh behavior without stale metrics.
  - Client-side interactivity provides instant visual feedback when switching time presets (e.g. Last 7 days, Last 30 days) and toggling collaboration sorting (Frequency vs Recency).
- **Alternatives Considered**:
  - *Full Server Actions with Page Reloads*: Causes full page re-renders on every filter change, leading to jarring UI flickers and slow filter interactions.
  - *Client-Side Raw Data Fetching*: Loading all raw bookings, agencies, and providers to the browser and aggregating in JavaScript. Rejected because it exposes raw platform-wide records to UBND browsers, directly violating `BR-002`, `BR-010`, and `SC-007`.

---

## 2. Server-Side Administrative Scope Enforcement (HDT vs UBND)

- **Decision**: Enforce administrative scoping in a dedicated server guard (`src/lib/adm/scope-guard.ts`). For every request to `/api/adm/*`:
  1. Inspect the session role and admin subtype. If role is not `ADMIN`, reject immediately with HTTP `403 Forbidden`.
  2. If `admin_type === 'UBND'`:
     - Retrieve `assigned_village_id` from the session / `ubnd_village_assignments`.
     - Force `effective_village_id = assigned_village_id`, ignoring any `village_id` provided in the query parameters.
     - Reject or restrict queries so that Local Providers outside `assigned_village_id`, Bookings outside `assigned_village_id`, and collaborations outside `assigned_village_id` are strictly excluded from all counts and tables (`BR-002`, `BR-008`, `BR-009`, `BR-010`).
  3. If `admin_type === 'HDT'`:
     - Allow `effective_village_id` to be either `null` (All Villages) or a specific valid `village_id` (`BR-001`, `BR-004`).
- **Rationale**: 
  - Prevents authorization bypass. Acceptance criteria `AC-ADM-SCOPE` and `SC-001`, `SC-002`, `SC-007` mandate that an UBND Admin can never observe data from another village, even by manually crafting HTTP requests.
- **Alternatives Considered**:
  - *UI-Only Filter Disabling*: Disabling the dropdown in HTML/CSS without server validation. Rejected because any user can send a direct fetch request or edit DOM properties, which would leak sensitive cross-village data.

---

## 3. Session Integration and Browser Role Switching

- **Decision**: Reuse the existing session definitions in `src/lib/auth/session.ts` and the visual `RoleSwitcher` component in `src/app/components/RoleSwitcher.tsx`. 
  - The client session helper (`src/lib/prf/client-session.ts` and `tests/prf/helpers/mockSession.ts`) is extended to include both `HDT` (`role: 'ADMIN', adminType: 'HDT'`) and `UBND` (`role: 'ADMIN', adminType: 'UBND', villageId: '20896522-6235-5699-aeaf-f48b8150d895'`).
  - Requests from the browser pass the `x-mock-session` HTTP header, which is parsed by API routes.
  - In `RoleSwitcher.tsx`, an "🏛️ HDT Admin" button and an "🏛️ UBND Admin" button allow one-click toggling between the two personas in any browser.
- **Rationale**:
  - The user explicitly requested: *"Reuse the existing session mechanism (src/lib/auth/session.ts) and the role switcher (src/app/components/RoleSwitcher.tsx) and the seed loader (src/lib/db/seed-loader.ts); do not create a second session mechanism."*
  - Production auth and login flows are deferred to Session 11. Mock session propagation allows complete end-to-end testing of `ADM079` without an external authentication server.
- **Alternatives Considered**:
  - *Custom Cookie-Based Admin Authentication*: Requires implementing separate login screens, password hashing, and cookie management, violating the project scope and session boundary.

---

## 4. Metric Aggregation & Read-Only Strategy

- **Decision**: Implement a unified `AdminMetricsService` (`src/lib/adm/metrics-service.ts`) that reads data through the established `seed-loader.ts` / database client. The service contains pure, deterministic aggregation functions for:
  - Agency counts by status (`Pending Approval`, `Approved`, `Rejected`, `Disabled`)
  - Provider counts by village and status (`Active`, `Disabled`, and verification statuses)
  - Booking status breakdown (`On hold`, `Booked`, `Completed`, `Cancelled`)
  - Time-series trend aggregation
  - Booking list table filtering (combining Agency and Provider filters with `AND` per `BR-014`)
  - Top 10 collaboration ranking
- **Rationale**:
  - `BR-006` and `BR-013` state that dashboard monitoring is strictly read-only and must never manipulate booking lifecycle or profile content.
  - Concentrating all aggregation logic into a pure service makes every business rule (`BR-001` through `BR-019`) unit-testable in isolation with millisecond execution speed.
- **Alternatives Considered**:
  - *SQL Materialized Views / Stored Procedures*: Requires running Postgres with administrative privileges; fails local SQLite zero-config testing.
  - *Direct in-route ad-hoc queries*: Duplicates query logic across multiple routes and complicates unit testing.

---

## 5. Cross-Platform Compatibility (macOS & Windows with Free Tools)

- **Decision**: Rely strictly on standard Node.js (>= 22.0.0), TypeScript, and Next.js built-ins. Use standard path utilities (`node:path`) with POSIX and Windows path resolution. Testing runs via standard `vitest` CLI (`npx vitest run`).
- **Rationale**:
  - Ensures any team member on macOS, Windows 11 (PowerShell/CMD), or Linux can clone the repository, run `npm install`, validate seed data, run tests, and launch `npm run dev` using 100% free tools without platform-specific dependencies.
- **Alternatives Considered**:
  - *Docker Compose Requirement*: Imposes high memory overhead and requires Docker Desktop, which is not always free or available on student workstations.
  - *Shell Script Wrappers (`.sh`)*: Break on Windows command prompt unless WSL/Git Bash is installed. Standard `npm` scripts and cross-platform Node commands ensure universal execution.

---

## 6. Trend Granularity and Comparison Period Rules

- **Decision**: 
  - **Granularity** (`BR-019`): Automatically derive trend bucket granularity from the date range length:
    - 1 to 31 days $\rightarrow$ Daily (`YYYY-MM-DD`)
    - 32 to 180 days $\rightarrow$ Weekly (`YYYY-Www`)
    - More than 180 days $\rightarrow$ Monthly (`YYYY-MM`)
  - **Comparable Previous Period** (`BR-003`, `BR-011`):
    - Compute the calendar day count $N$ of the selected period $[D_{\text{start}}, D_{\text{end}}]$.
    - The comparable previous period is $[D_{\text{start}} - N \text{ days}, D_{\text{start}} - 1 \text{ day}]$.
    - If no data exists in the previous period, `trend_pct` and `trend_direction` must be omitted (`null`) rather than displaying a fabricated `0%` (`BR-011`, `SC-009`).
- **Rationale**:
  - Directly matches spec Question 9, Question 17, `BR-003`, `BR-011`, and `BR-019`. Prevents misleading trend metrics when examining historical or fresh periods.
- **Alternatives Considered**:
  - *User-selected Granularity Dropdown*: Rejected because spec Question 9 explicitly closed this decision as derived automatically.

---

## 7. Collaboration Metrics: Active Collaborations vs Collaboration Ranking

- **Decision**:
  - **Active Collaborations Card** (`FR-003`, `BR-017`): Count the number of distinct (unique) `agency_id` + `provider_id` pairs that have at least one booking currently in `On hold` or `Booked` status within the reporting window.
  - **Top 10 Collaboration List** (`FR-010`, `BR-018`): Count only `Booked` and `Completed` bookings. Exclude `On hold` and `Cancelled` bookings. Rank descending by booking count (Frequency) or latest booking date (Recency), capped at 10 pairs.
  - For `UBND` Admins, only pairs involving Local Providers situated in the assigned village are included (`BR-010`, `SC-010`).
- **Rationale**:
  - Resolves spec Questions 10, 11, 12, 18 and Consistency Contract §ADM079. Active Collaborations measures current operational pipeline, whereas Collaboration Frequency measures proven historical commercial partnerships.
- **Alternatives Considered**:
  - *Counting Quotes or Chat Messages as Collaboration*: Rejected because spec Question 11 explicitly rules that only actual bookings constitute a collaboration.

---

## 8. Agency and Provider Activity Dimensions

- **Decision**:
  - **Active Agency** (`BR-015`, Question 1): An Agency is active during the selected period if it performs $\ge 1$ Quote Request, $\ge 1$ Chat action, OR participates in $\ge 1$ Booking.
  - **Active Provider** (`BR-016`, Question 16, 19): A Provider is active during the selected period if it receives $\ge 1$ Quote Request, participates in $\ge 1$ Chat interaction, OR has $\ge 1$ Booking.
  - **Activity Distribution** (`FR-008`): Reported across two dimensions: `craft_type` (from provider profile version) and `activity_type` (`Quote Request`, `Chat`, `Booking`).
- **Rationale**:
  - Separates account registration status (static state) from operational engagement (dynamic activity), fulfilling `FR-007` and `FR-008`.
- **Alternatives Considered**:
  - *Defining Activity by Logins*: Out of scope because login event auditing is not captured in seed data; quote/chat/booking activity is deterministic and fully verifiable against existing seed tables.
