# TreFood prototype: Antigravity build kit
Prepared 8 Nov 2026 for the TreFood developer hiring assignment. Submission deadline: 14 Nov 2026. Target stack: Cloudflare Workers + React, built with Antigravity.

## How to use this kit
Create an empty folder trefood, save this whole document inside it as docs/BUILD_KIT.md, and open the folder in Antigravity.
Paste the bootstrap prompt below once. It creates AGENTS.md, which Antigravity loads every session (keep any rules file under about 12,000 characters).
Run PROMPT 1 to PROMPT 8 in order. For each: approve the agent’s plan first, let it build, check its Done list, then git commit and npm run deploy. Never start the next prompt on a broken build.
If the agent fails twice on the same error, tell it: stop, explain the root cause, propose two fixes, wait for my choice. If a plan adds a library outside the stack, reject it.
Make it verify the UI with the browser agent and save screenshots, not only run unit tests.

### Bootstrap prompt (paste once):
```
Read docs/BUILD_KIT.md completely. Create AGENTS.md in the project root containing exactly the text inside the code block under the heading ‘4. AGENTS.md’. Then execute PROMPT 1. Plan first.
```

### Prompt for every later step (replace N):
```
Execute PROMPT N from docs/BUILD_KIT.md. Plan first, then build, then run every check in its Done list and report the results.
```

## 1. Decisions and why
Platform: Cloudflare Workers with Static Assets. One Worker serves the React app and the API: one deploy, one URL, nothing to keep in sync. The free plan is enough for a prototype; Workers Paid ($5 a month) is cheap insurance if you want no daily caps during the review week.
Frontend: React 19, Vite, TypeScript strict, Tailwind v4, React Router, TanStack Query, Zod.
API: Hono on the same Worker, every request validated with Zod schemas shared with the client.
Database: D1 (SQLite) with Drizzle ORM and SQL migrations. Money is stored as integer paise. D1’s free tier is capped per day (5 million row reads, 100,000 row writes) and Cloudflare began enforcing it on 1 Sep 2026, so every query must use an index.
Live order updates: ETag polling every 5 seconds. It survives two bars of hostel wifi and needs no socket babysitting. Durable Objects with WebSockets go in the roadmap.
Auth: guests browse everything; sign-in happens only at checkout. Email OTP restricted to the campus domain, session cookie, role-based access. Cloudflare Email Sending is still beta and needs Workers Paid, so the prototype runs in DEMO_MODE (OTP shown on screen plus one-tap demo accounts so reviewers never get stuck) and ships a mailer adapter you can switch on later.
Why not Next.js (the live site uses it): fewer moving parts and a much smaller bundle on Workers; Next.js there needs an adapter and adds deploy risk in a 6-day window. The data model, API and UX are identical either way. If the TreFood team prefers Next.js, ask me to rewrite PROMPT 1 and 2 only.

## 2. What is missing and what to improve
Scope note: this audit comes from the public landing page only, because the app sits behind sign-in. Sign in once with your campus email and check the items marked (verify). Run Lighthouse and axe on trefood.in today and keep the screenshots: before and after numbers are the strongest evidence in your PDF.

### Product gaps
P0 = must be in the prototype. P1 = build if time allows. P2 = roadmap in the PDF only.
- P0 Guest browsing. Every category card, the search box and every call to action on the live page leads to sign-in, so visitors cannot see a vendor, a menu, a price or an opening hour. Show everything first; ask for sign-in only at checkout.
- P0 Gate-first logic you can demonstrate. Choose the gate once and remember it. Show only vendors that can reach it. When an order cannot make curfew, say why and offer a gate that works.
- P0 Handover code as the hero screen. A ticket with status steps, ETA and the 4-digit code.
- P0 Vendor console. Live order board, accept, ready, reached gate, stock toggles, prep time, new-order sound, daily settlement.
- P0 Reliable ordering on weak networks. Idempotent order placement, retry without double-ordering, offline shell, reconnect banner.
- P0 Server-side truth. Prices, stock, curfew and status changes are decided on the server.
- P0 Admin lite. Vendors, gates and curfews, order monitor, announcement banner.
- P1 Order history and one-tap reorder; favourites; ratings and an issue report (missing or wrong item); scheduled orders (order now for 1:30 PM); Hindi and English toggle with a Hindi-first vendor console; Web Push when the packet reaches the gate; auto-expire orders a vendor never accepts; busy mode; filters (veg only, open now, under ₹100, fastest).
- P2 (PDF roadmap) Group orders per hostel floor; dynamic UPI QR at the gate with reconciliation; coupons, referrals and campus ambassadors; vendor analytics (peak hours, repeat rate) and demand forecasting to batch deliveries; WhatsApp updates; Durable Object realtime; multi-campus (the schema already carries campus_id); optional typed-digit verification at handover.

### Trust, content and compliance
The page says 7+ vendors but shows no names, photos, ratings or hours, and the claims (about 20 minutes, zero fee) come with no proof. Add vendor profiles, live numbers such as orders delivered today, and real ratings.
No visible FAQ, support contact, privacy policy, terms or refund policy (verify the footer on a real phone). Add all five, plus a consent line at sign-in and a delete-my-data option.
Zero delivery fee needs a one-paragraph sustainability story in the PDF (for example a small vendor commission).
Show each vendor’s FSSAI licence number; food platforms are generally expected to.
Offer Hindi, especially for vendors.

### Design features to add
Replace emoji with real imagery or custom SVG spot illustrations and a single icon set (Lucide). Emoji render differently on every phone; my quick demo used them only as placeholders.
A real token system: brand maroon #830020, logo gold, warm neutrals, light and dark modes, 4/8 pt spacing, radius, elevation and motion scales that respect reduced motion.
One memorable moment: the Handover Ticket (perforated edge, oversized tabular digits, a gentle vibrate when the packet arrives).
Mobile-first with a bottom nav, bottom sheets for cart and gate, skeleton loaders, and empty and error states that tell people what to do next.
A vendor console made for a counter tablet: landscape, 56 px touch targets, high contrast, sound, screen wake lock.
Accessibility at WCAG 2.2 AA: contrast, focus rings, 44 px targets, live regions for status changes, full keyboard paths.
Performance budgets: under 150 KB gzip of JavaScript on first load, LCP under 2.5 s on Slow 4G, CLS under 0.1, Lighthouse 95 or more on mobile.
Crawlable vendor pages with unique titles, Open Graph images, JSON-LD and a sitemap. Guest browsing is also an SEO win.

### Engineering reliability
Strict TypeScript, Zod at every boundary, one shared schema folder.
Tests: unit (curfew, pricing, state machine), Worker integration tests against D1, Playwright on the money path, axe accessibility checks.
CI on every push, preview deploys, versioned migrations, one-command rollback.
Health endpoint, structured logs, Workers observability.
Secure headers and CSP, rate-limited OTP, role guards, idempotency keys, no secrets in the client, dependency audit.
Docs: README, architecture diagram, decision records, demo script, roadmap.

### Scope guard
Do not build in 6 days: real payments, SMS or WhatsApp, native apps, maps, a rider app, ML. Put them in the PDF roadmap with the reasoning. A smaller product that works end to end beats a larger one that breaks in front of the reviewer.

## 3. One-time setup (you do this, 15 minutes)
Create a free Cloudflare account. Install Node 22 LTS and Git. Create an empty GitHub repo named trefood, clone it, open it in Antigravity.
Run npx wrangler login in the terminal once. It opens your browser; the agent cannot do this for you.
In Antigravity settings, allow terminal commands for npm, git and wrangler, and enable the browser agent (Chrome) for UI checks.
Save this document as docs/BUILD_KIT.md, then paste the bootstrap prompt.

## 4. AGENTS.md
```markdown
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
- A vendor is listed only if it is open and can reach the chosen gate. Curfew rule: now + vendor prep time + gate travel minutes + buffer must be before the gate curfew; otherwise return a reason code and alternative gates.
- Guests browse everything; sign-in is required only to place an order.
- Order placement is idempotent via the Idempotency-Key header.
- Roles: student, vendor, admin. Enforce in middleware, never only in the UI.
- All seeded data is sample data and must be labelled as such in the README.

## Definition of done (every prompt)
Typecheck, lint and all tests pass; the app runs with wrangler dev; the Playwright path for the feature passes at 390x844 and 1280x800; no console errors; a short summary of what changed, what was tested and what is left; docs/CHANGELOG.md updated.
```

## 5. Prompts

### PROMPT 1: Walking skeleton and first deploy (day 1)
Goal: a deployed, empty-but-real skeleton on Cloudflare before any feature work.
1. Scaffold the project in the current folder using the current official Cloudflare React + Vite + Workers template (check developers.cloudflare.com for the exact create-cloudflare command and the @cloudflare/vite-plugin setup). Then add: Hono in src/worker, Tailwind v4, React Router, TanStack Query, Zod, Drizzle ORM + drizzle-kit, Vitest + @cloudflare/vitest-pool-workers, Playwright, ESLint, Prettier, lucide-react, and self-hosted variable fonts via @fontsource-variable.
2. wrangler.jsonc: name trefood-prototype, compatibility_date = today, static assets with single-page-application fallback, run_worker_first for /api/*, a D1 binding named DB, observability enabled, vars DEMO_MODE, ALLOWED_EMAIL_DOMAINS (nitp.ac.in) and TIMEZONE (Asia/Kolkata). The Hono app must be the default export.
3. Create the D1 database with wrangler, wire the binding, and add GET /api/health returning { ok, version, commit, db } where db comes from a SELECT 1.
4. Strict tsconfig, path aliases (@client, @worker, @shared), npm scripts: dev, build, typecheck, lint, test, test:e2e, db:generate, db:migrate:local, db:migrate:remote, db:seed:local, db:seed:remote, deploy.
5. GitHub Actions: on push and PR run typecheck, lint, unit tests and build; on main also run Playwright against a local preview. Add .github/dependabot.yml.
6. Add .gitignore, .dev.vars.example, a README with a Mermaid architecture diagram, docs/DECISIONS.md (stack choices) and docs/CHANGELOG.md.
7. If wrangler is not logged in, stop and tell me; I will run npx wrangler login myself. Then deploy with wrangler deploy and print the live workers.dev URL.

Done when: npm run dev works; /api/health returns ok locally and on the deployed URL; CI passes locally; one Vitest worker test and one Playwright smoke test pass.

### PROMPT 2: Design system, landing page and app shell
Build the design system and the public shell. No backend work.
Brand: TreFood, campus delivery for NIT Patna. Primary maroon #830020 (from the live site), accent gold #F2A900 (from the logo), warm neutral greys, success green, danger red. Create complete light and dark token sets in Tailwind v4 @theme (surface, surface-raised, text, text-muted, border, primary, primary-contrast, accent, success, warning, danger, focus). Verify every text and background pair meets WCAG AA and fix tokens that fail.
Type: one display family and one clean UI family, both self-hosted variable fonts; scale 12/14/16/18/22/28/36/48; tight tracking on display sizes; line length under 70ch; tabular numbers for prices and codes.
Tokens: 4/8 pt spacing; radius 8, 12, 20, full; 3 elevation levels; motion 150 and 250 ms with prefers-reduced-motion respected.
Avoid template tells: no all-caps eyebrow labels, no grids of identical rounded cards, no gradient washes, no single accented word in headlines.

Components in src/client/components/ui, shown on a hidden gallery route /dev/kit (development builds only): Button (primary, secondary, ghost, danger, loading), IconButton, Input, Select, Checkbox, Chip (toggle), Badge, ListRow, Card (use sparingly), Sheet (bottom sheet with focus trap), Dialog, Toast, Skeleton, EmptyState, ErrorState, OfflineBanner, Stepper (order status), QtyStepper, GatePicker, CurfewBanner, TopBar, BottomNav, and the signature HandoverTicket: perforated edges, oversized tabular 4-digit code, vendor name, gate, status pill, a subtle vibrate on arrival.
Icons: lucide-react only. Draw 6 simple SVG spot illustrations in the brand palette (meals, fruits, groceries, vegetables, raw chicken, late night). No emoji in the UI.

Landing page (/): not a template. Open with the product’s own signature moment, a live HandoverTicket demo that cycles through the four statuses. Then: a vendor strip (placeholder data for now), how an order goes (4 steps), why it works on a campus (curfew-aware, code handover, works on two bars of signal), a vendor section with a call to action, an FAQ of 8 questions, and a footer with privacy, terms, refund, contact and WhatsApp support links. Every call to action leads to browsing, never to sign-in.
App shell: routes /, /browse, /vendor/:slug, /orders, /account, /v (vendor console placeholder), /admin (placeholder), a 404 and an error boundary. Mobile-first at 360px; desktop uses a centered column with a persistent cart panel. English and Hindi switch with react-i18next (landing and shell strings translated).
SEO: per-route title and meta, Open Graph image, JSON-LD (Organization, FAQPage), sitemap.xml and robots.txt served by the Worker.

Done when: Lighthouse mobile is 95 or more for Performance, Accessibility, Best Practices and SEO on /; axe shows zero serious issues on /, /browse and /dev/kit; a keyboard-only walkthrough works; screenshots of / in light, dark and 360px are saved to docs/screenshots.

### PROMPT 3: Data model, API and auth
Build the backend foundation. Drizzle schema in src/worker/db/schema.ts; generate SQL migrations into /migrations (use raw SQL in the migration if Drizzle cannot express an index).
Tables (text ULID ids, UTC integer timestamps, money in paise): campuses; gates (campus_id, name, curfew_time HH:MM, buffer_minutes, travel_minutes, active); vendors (campus_id, slug, name, name_hi, category, description, fssai_no, phone, hours_json, prep_minutes, is_open, busy_until, status pending/active/suspended, rating_avg, rating_count); vendor_gates (vendor_id, gate_id, extra_minutes); menu_categories; menu_items (vendor_id, category_id, name, name_hi, description, price_paise, is_veg, tags, in_stock, sort); users (email unique, name, role student/vendor/admin, campus_id, vendor_id nullable); sessions (token_hash, user_id, expires_at); otp_codes (email, code_hash, expires_at, attempts); orders (public_no, campus_id, user_id, vendor_id, gate_id, status, subtotal_paise, total_paise, payment_method pay_at_gate, handover_code, idempotency_key unique, eta_at, a timestamp per status, cancel_reason); order_items (name and price snapshots); order_events (order_id, status, actor_id, at); reviews; issues; announcements; favorites; rate_limits; audit_log.
Indexes for every query path: vendors by campus+status, vendor_gates by gate, menu_items by vendor, orders by user+created, orders by vendor+status, orders by gate+status; plus a partial unique index on (gate_id, handover_code) for active orders.
Seed (scripts/seed.sql plus npm scripts): campus NIT Patna; gates Main Gate, Hostel 5 gate and Hostel 7 gate with curfews 23:30, 22:30 and 23:00; 8 vendors across meals, snacks, fruits, groceries, vegetables, raw chicken and late night, each with 8 to 15 realistic items and INR prices; demo users student@demo.trefood.test, vendor@demo.trefood.test and admin@demo.trefood.test; 20 historical delivered orders for admin metrics. State in docs that all data is sample data.
Services (src/worker/services, pure and unit-tested): canDeliver(gate, vendor, now) returns ok or reason codes (gate_closed, vendor_closed, vendor_busy, unreachable, too_late) plus alternative gates; priceCart(items) recomputes totals from D1 and rejects out-of-stock items or changed prices with 409 and the updated cart; nextStatus(order, actor) enforces the state machine and permissions; generateHandoverCode(gate).
API (Hono, under /api, Zod-validated, typed errors): GET /gates; GET /vendors?gate&category&q&veg&open; GET /vendors/:slug (menu); POST /cart/quote; POST /orders (Idempotency-Key required); GET /orders; GET /orders/:id (ETag and 304 support); POST /orders/:id/cancel; POST /orders/:id/confirm; POST /orders/:id/review; POST /orders/:id/issue; GET /announcements. Vendor routes under /vendor: orders list with ?since, PATCH status, menu CRUD, stock toggle, open and busy toggle, settlement summary. Admin routes under /admin: approve or suspend vendors, gates and curfews, festival overrides, orders monitor, metrics, announcements, audit log.
Auth: POST /auth/otp/request and /auth/otp/verify. 6-digit code, 10 minute expiry, 5 attempts, hashed with a secret pepper, constant-time compare, per-email and per-IP rate limits (use the Workers rate limiting binding if the current docs support it on the free plan, otherwise a D1 counter). Only emails ending in ALLOWED_EMAIL_DOMAINS can sign in as students; vendors and admins are pre-created. Session cookie: __Host-session in production (plain name on http://localhost), HttpOnly, Secure, SameSite=Lax, 30 days sliding, token stored only as a SHA-256 hash. A Mailer interface with DemoMailer (returns the code in the response only when DEMO_MODE is true) and a CloudflareEmailMailer stub behind a flag. In DEMO_MODE also expose POST /auth/demo/:role for one-tap demo accounts; it must return 404 when DEMO_MODE is false.
Middleware: request id, secure headers with a strict CSP, same-origin check on non-GET requests, JSON error handler, role guards, structured logs.
Cron trigger every minute: expire orders still in placed after 5 minutes (status expired, event row).
Done when: Worker tests (vitest-pool-workers with local D1) cover pricing, curfew edge cases around midnight, the full state machine, idempotent replays, role guards, OTP limits and the demo route with DEMO_MODE=false; migrations apply cleanly on local and remote D1; npm run db:seed:remote works; docs/API.md lists every endpoint.

### PROMPT 4: Customer app
Build the complete student journey on the real API. Use TanStack Query with sensible stale times, optimistic UI only where safe, and skeletons for every list.
1. Gate: the first visit shows a GatePicker sheet (remembered in localStorage and in the URL as ?gate=). Closed or unreachable gates show the reason and next opening time. The header always shows the current gate; changing it refetches vendors.
2. /browse: debounced search (250 ms), category chips, filters (veg only, open now, under ₹100), sort (fastest, rating). Vendor cards show prep time, open or busy state, rating and a warning when the gate closes soon. Vendors that cannot reach the gate are hidden, not greyed out.
3. /vendor/:slug: header with FSSAI number and hours, menu grouped by category with sticky category tabs, veg and non-veg marks, QtyStepper, item notes (max 80 characters), out-of-stock state. One vendor per cart; switching vendors asks for confirmation.
4. Cart: bottom sheet on mobile, side panel on desktop. A debounced live quote from POST /cart/quote on every change shows subtotal, delivery 0, total, pay at gate and ETA. A 409 shows what changed and lets the user accept it.
5. Checkout: sign-in only now. Email field restricted to the campus domain with clear errors; 6-digit OTP input (auto-advance, paste support, resend timer). In DEMO_MODE show the code in a clearly labelled demo box plus a one-tap Continue as demo student. After sign-in return to the cart; never lose it.
6. Place order: generate an Idempotency-Key when checkout opens; on network failure show Retry that reuses the key, so the user can never double-order. Success goes to the order screen.
7. /orders/:id: HandoverTicket plus Stepper. Poll with ETag every 5 s only while the tab is visible and the order is active, with exponential backoff and a Reconnecting banner. When status becomes at_gate: vibrate, highlight the 4-digit code, and show Confirm handover (enabled after the user ticks ‘The digits on my packet match’). Cancel is allowed until the vendor accepts. After delivery: rating 1 to 5, optional issue report (wrong item, missing item, quality, late) and Order again.
8. /orders: history with status chips and one-tap Order again (re-quotes at current prices). /account: email, language, theme, sign out, delete my data.
9. PWA: manifest, icons, theme color #830020, installable, offline shell and an offline screen that says what still works (last viewed vendors and menus cached stale-while-revalidate; ordering needs a connection). Use vite-plugin-pwa; if it conflicts with the Cloudflare Vite plugin, write the service worker by hand in public/. Show the install prompt after the first delivered order.
10. Hindi translations for every string in this journey.
Done when: a Playwright test runs guest browse, add to cart, demo sign-in, place order, vendor advances to at_gate through the API, customer confirms, rating, at 390x844 and 1280x800; a throttled Slow 4G run keeps LCP under 2.5 s on /browse; axe finds no serious issues on any screen; offline mode shows the offline screen without errors.
