# ADR 0002 — Stay on Next.js 14 until after MVP RC; switch off the Image Optimizer now

- Status: Accepted (decided by linhkhanh-vu, 2026-11-08)
- Context: `npm audit` on `main` (2026-11-08), [ADR 0001](0001-hosting.md) (one Render web service behind
  Cloudflare, Linux), `package.json` (`next` ^14.2.0, installed 14.2.35)

## Context

`npm audit` reports 25 advisories against `next` 14.2.35: 3 critical, 9 high, 11 moderate, 2 low. Every one is
fixed only in **15.5.x or later**. The newest 14.x release is 14.2.35, which is the version installed, so no
14.x patch exists. Moving to 15.5.x is a major upgrade: React 19, async request APIs and caching defaults
change. The project plan fixes Next 14 / React 18 for the MVP.

How the app uses Next.js, checked in the code on `main`:
- It uses the **App Router** with React Server Components and route handlers.
- It has **no** middleware, no `rewrites`/`redirects` in `next.config`, no Server Actions (`'use server'`),
  no `next/image`, no `next/script` and no CSP nonce.
- It uses no edge runtime and no custom server (`next start`), has no Pages Router and no i18n routing,
  and has no `public/` folder.
- Images are plain `<img>` tags pointing at `/api/prf/media/<id>` or absolute URLs
  (`src/app/components/MediaImage.tsx`).
- Hosting is Linux on Render, with Cloudflare in front (`server: cloudflare` on the public site).
- Before this decision, `/_next/image` was live. On a local production build,
  `/_next/image?url=/api/prf/media/…&w=64` returned a resized 1.6 KB JPEG.

## Decision

1. **Switch off the built-in Image Optimizer now**: `images: { unoptimized: true }` in `next.config.mjs`.
   - The app never uses `next/image`, so nothing visible changes.
   - Checked on a local production build: `/_next/image?url=…&w=64` now returns 404, and the media URL still
     returns the original JPEG (200).
   - Explore (5/5 images), Experience detail (6/6) and the Provider page (3/3) all show their images, none
     through `/_next/image`.
2. **Accept the remaining Next 14 advisories temporarily** and upgrade to Next **15.5.x (latest patch) after
   MVP RC**, in its own PR, with the full suite, CI on Windows + macOS, and a hosted smoke check. The upgrade
   brings React 19 and its async request APIs (`cookies()`, `headers()`, `params`).
3. Re-run `npm audit` before MVP RC and before the upgrade, and update the table below.

## Advisories and whether they apply

| Advisory | Severity | Applies to this app? | Status after this ADR |
|---|---|---|---|
| GHSA-2xp9-vwfh-vxw4 RCE in Image Optimization API (AVIF) | critical | Did apply: `/_next/image` was live | **Closed** by `images.unoptimized` |
| GHSA-2464-fhr4-w9xw RCE in Image Optimization API (SVG) | critical | Did apply | **Closed** by `images.unoptimized` |
| GHSA-h64f-5h5j-jqjh DoS in Image Optimization API | moderate | Did apply | **Closed** |
| GHSA-3x4c-7xq6-9pq8 unbounded `next/image` disk cache | moderate | Did apply | **Closed** |
| GHSA-9g9p-9gw9-jx7f DoS via `remotePatterns` | moderate | No (no `remotePatterns`) | Not applicable |
| GHSA-p293-qw3h-jr36 RCE on Windows-hosted servers | critical | Not on Render (Linux). Applies only if someone serves the app from a Windows laptop to others | Accepted: development laptops run on localhost only |
| GHSA-h25m-26qc-wcjf, GHSA-q4gf-8mx6-v5v3, GHSA-8h8q-6873-q5fj DoS with Server Components | high | **Yes** (App Router with RSC) | **Accepted until 15.5.x**: test version with synthetic data only, one instance, no SLA; a DoS costs availability, not data |
| GHSA-wfc6-r584-vfw7, GHSA-vfv6-92ff-j949 RSC cache poisoning | moderate / low | **Possibly** (Cloudflare in front) | Accepted until 15.5.x; pages are dynamic (`force-dynamic` on data pages) |
| GHSA-68g3-v927-f742, GHSA-4633-3j49-mh5q response-body cache confusion | moderate | Unclear (route handlers with bodies) | Accepted until 15.5.x |
| GHSA-m99w-x7hq-7vfj, GHSA-p3m5-59mp-jv5r DoS with Server Actions | high | Probably not (no Server Actions) | Accepted until 15.5.x |
| GHSA-89xv-2m56-2m9x SSRF in Server Actions on custom servers | high | No (no Server Actions, no custom server) | Not applicable |
| GHSA-955p-x3mx-jcvp disclosure of Server Function endpoints | moderate | No (no Server Functions) | Not applicable |
| GHSA-4c39-4ccg-62r3 unbounded Server Action payload (edge) | moderate | No (no edge runtime) | Not applicable |
| GHSA-ggv3-7p47-pfv8, GHSA-p9j2-gv94-2wf4 rewrites (smuggling, SSRF) | moderate / high | No (no rewrites) | Not applicable |
| GHSA-3g8h-86w9-wvmq, GHSA-36qx-fr4f-26g5 middleware/proxy (cache poisoning, i18n bypass) | low / high | No (no middleware, no Pages Router) | Not applicable |
| GHSA-ffhc-5mcf-pf4q XSS with CSP nonces | moderate | No (no nonce) | Not applicable |
| GHSA-gx5p-jg67-6x7h XSS in `beforeInteractive` scripts | moderate | No (no `next/script`) | Not applicable |
| GHSA-c4j6-fc7j-m34r SSRF via WebSocket upgrades | high | No (no custom server) | Not applicable |

## Consequences

- **Closed now:** two of the three critical advisories (AVIF and SVG RCE) and two image DoS/disk issues.
  Images are served as uploaded, without resizing. Acceptable for the MVP: Provider uploads are limited to
  10 MB and checked (BR-008).
- **Still open until the upgrade:** the Server Components DoS group and the cache-poisoning or cache-confusion
  group, plus the Windows RCE for anyone serving from Windows. Mitigations: the hosted version holds synthetic
  data only (ADR 0001), and a DoS affects availability of a test version.
- Other packages flagged by `npm audit` (`zod`, `csv-parse`, and the vitest/vite toolchain) need major upgrades
  too. They are tracked separately; #105 and #108 removed the unused packages and applied the non-breaking fixes.

## Alternatives not chosen

- **Upgrade to 15.5.x now:** a major upgrade during the test week risks the Must flows. Planned after MVP RC.
- **Block `/_next/image` at Cloudflare:** that rule lives outside the repository and is easy to lose; the config
  switch is in code and reviewed.
