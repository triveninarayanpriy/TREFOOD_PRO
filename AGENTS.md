# TreFood prototype: project rules

Product: hyperlocal campus delivery for NIT Patna. Students order food, fruits, groceries and raw chicken from campus vendors and collect at a hostel gate by matching a 4-digit code on the packet. Zero delivery fee, pay at the gate, curfew-aware. Goal: a deployable, reliable prototype that beats https://www.trefood.in on UX, speed and trust. Deadline 14 Nov 2026.

## Stack (do not change without asking)
- Cloudflare Workers + Static Assets; config in wrangler.jsonc; one Worker serves the SPA and /api/*
- React 19, Vite, TypeScript strict, Tailwind v4, React Router, TanStack Query, Zod
- Hono API in src/worker; D1 + Drizzle ORM; SQL migrations in /migrations
- Tests: Vitest, @cloudflare/vitest-pool-workers, Playwright, axe-core
- npm, Node 22
Before configuring any Cloudflare feature, read the current docs at developers.cloudflare.com. Never rely on memory for config syntax or limits.

## Layout
src/client (React), src/worker (routes, services, db), src/shared (Zod schemas, types, constants), migrations, e2e, docs, scripts.

## Engineering rules
1. Plan first: short plan, files to touch, then implement. Small commits with clear messages.
2. Never trust the client. Prices, totals, stock, curfew checks, permissions and status transitions are computed on the server. Money is integer paise.
3. Validate every request and response with Zod schemas from src/shared. Errors are typed: { error: { code, message } } with the right HTTP status.
4. Every D1 query must use an index. Daily free-tier limits are enforced: no full scans, no N+1; batch with db.batch.
5. The Workers free plan has a tiny CPU budget: no heavy dependencies or computation in the Worker; use WebCrypto for hashing.
6. No secrets in code or in the client bundle. .dev.vars locally, wrangler secrets in production, keep .dev.vars.example current.
7. Accessibility is required: semantic HTML, labels, visible focus, 44px touch targets (56px in the vendor console), 4.5:1 contrast, aria-live for status changes, prefers-reduced-motion respected.
8. Performance budget: under 150 KB gzip JavaScript on first load, lazy-loaded routes, self-hosted fonts, explicit image sizes, no layout shift.
9. Design tokens only: no hard-coded colors or spacing in components. Icons from lucide-react. No emoji in UI chrome.
10. UI copy: sentence case, plain verbs, errors say how to fix. English and Hindi strings live in src/client/i18n.
11. All business rules use Asia/Kolkata time; store UTC timestamps.
12. Every feature ships with tests: unit tests for logic, Worker tests for endpoints, one Playwright path for visible flows.
13. Every screen handles loading, empty, error and offline states.
14. New dependency = one line of reason in docs/DECISIONS.md. Pin versions. Run npm audit before release.

## Domain rules
- Order status: placed → accepted → out_for_delivery → at_gate → delivered. Exits: cancelled, expired. Only valid transitions; each writes an order_events row.
- Handover code: 4 digits from crypto.getRandomValues, unique among active orders at the same gate. Only the customer who owns the order can confirm delivery, and only when status is at_gate.
- Curfew & gates: Main Gate / Academic Blocks operate 24x7; Boys Hostel and Girls Hostel gates close at 19:30 IST. A vendor is listed only if it is open and can reach the chosen gate. Curfew rule: now + vendor prep time + gate travel minutes + buffer (15m window) must be before the gate curfew (unless gate is 24x7); otherwise return a reason code and alternative gates.
- Campus Night Safety: after 19:00 IST (7 PM), deliveries are handled personally by the vendor owner, co-owner, or senior staff. Surface this clearly on vendor cards and vendor pages.
- Guests browse everything; sign-in is required only to place an order.
- Order placement is idempotent via the Idempotency-Key header.
- Roles: student, vendor, admin. Enforce in middleware, never only in the UI.
- All seeded data is sample data and must be labelled as such in the README.

## Definition of done (every prompt)
Typecheck, lint and all tests pass; the app runs with wrangler dev; the Playwright path for the feature passes at 390x844 and 1280x800; no console errors; a short summary of what changed, what was tested and what is left; docs/CHANGELOG.md updated.
