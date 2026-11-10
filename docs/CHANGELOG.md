# Changelog

All notable changes to the TreFood prototype will be documented in this file.

## [Unreleased]

### Added - Public Landing Page (/), Legal Routes, SEO & Lighthouse Hardening
- **Public Landing Experience (`/`)**:
  - Updated sticky landing navbar with logo, section anchors (`How it works`, `For vendors`, `Safety`, `FAQ`), `Browse menus`, `Install App` (`beforeinstallprompt` hook + iOS Safari/Android fallback modal), `ThemeToggle`, `Sign in` OTP/Demo modal, and collapsible mobile menu fitting cleanly down to `320px`.
  - Built guest-ready hero with gate selector, debounced dish/vendor autocomplete (`GET /api/search/suggest`), live packet card with itemised bill and `showVibrate` activation guard, and live API stat strip (`GET /api/campuses/nitp`) explicitly badged as demo data.
  - Added 8 campus category tiles linking to `/browse?category=...`, interactive 4-step How It Works spotlight, interactive **Curfew & Night Safety Mini-Demo** powered directly by `@shared/curfew`, For Vendors earnings calculator + D1-backed onboarding form (`POST /api/vendor-applications` + `migrations/0003_aspiring_hardball.sql`), trust policies, sample testimonials (`Sample Testimonials (Demo Data)`), 11-item accessible FAQ accordion, final CTA, and complete legal/contact footer.
- **SEO & Draft Legal Routes**:
  - Added `SeoHead` / `useSeoHead` manager for per-route `<title>`, `<meta name="description">`, Open Graph, Twitter cards, canonical links, and route JSON-LD (`Organization` & `LocalBusiness` on `/`).
  - Added lazy-loaded draft legal/info pages (`/about`, `/terms`, `/privacy`, `/refunds`), generated PWA/OG PNG assets (`icon-192.png`, `icon-512.png`, `og-image.png`), and updated `/sitemap.xml` & `/robots.txt`.
  - Verified production build Lighthouse Mobile scores on `/`: **Performance 98, Accessibility 100, Best Practices 100, SEO 100, CLS 0** and **16 / 16 Playwright E2E tests** passing across `320px`, `390px`, `1280px`, and `1440px`.

### Added - Design System (/dev/ui) & Expanded Data/API Layer
- **Design System & Token Architecture**:
  - Updated `src/client/index.css` with semantic tokens supporting warm-cream light surfaces (`#FBF8F3` / `#FFFFFF` / `#F3EFE6`) and deep maroon-black dark surfaces (`#0E0608` / `#180B0F` / `#241117`).
  - Added persisted light/dark/system theme preference (`ThemeContext`, `ThemeToggle`), custom `/public/images/*.svg` category/wordmark graphics, `DesktopNavRail` left sidebar at `>= 1024px`, and compact responsive `TopBar` + `BottomNav`.
  - Added `/dev/ui` (and `/dev/kit` alias) component showcase covering `Button`, `Badge`/`Chip`, `VendorCard`, `MenuItemRow`, `HandoverTicket`, `StatusTimeline`, `CodeDisplay`, `QuantityStepper`, `EmptyState`, `ErrorBanner`, and skeleton states.
  - Verified light and dark WCAG AA contrast with `@axe-core/playwright` (0 serious/critical violations) and clean responsive behavior at `390x844` and `1440x900`.
- **Schema, Seed & Shared Domain Logic**:
  - Extended schema to 20 tables (`migrations/0002_cold_hellcat.sql`) adding `gates.is_24x7`, `vendors.night_safe`/`prep_max_minutes`/`min_order_paise`, `menu_items.packing_charge_paise`/`variants_json`/`addons_json`, `orders.code_attempts`/`packing_total_paise`/`discount_paise`/`coupon_code`, plus `coupons` and `push_subscriptions` tables.
  - Expanded seed (`scripts/seed.sql`) to 1 campus (`NIT Patna`), 3 gates (`Main Gate / Academic Blocks` 24x7, `Boys Hostel Gate` 19:30 IST, `Girls Hostel Gate` 19:30 IST), **12 vendors** across categories (8+ items each), **6 coupons**, 3 demo users, and 20 historical orders.
  - Added pure unit-tested shared logic in `src/shared/curfew.ts`, `src/shared/cartRules.ts`, and `src/shared/handover.ts` (`computeEta`, `evaluateCanDeliver`, `isNightSafetyActive`, single-vendor/min-order/packing/coupon calculations, and 5-attempt handover lock).
- **Expanded Hono REST API & Tests**:
  - Added `GET /api/campuses/:slug`, `GET /api/search/suggest?q=`, `GET /api/coupons`, `:id`/`:slug` lookup on `GET /api/vendors/:id`, `POST /api/orders/:id/confirm-handover` (`423 Locked` after 5 wrong attempts), `POST /api/orders/:id/report`, vendor `/accept`, `/reject`, `/ready`, `/handover-assist`, `PATCH /api/vendor/prep-time`, and admin `/stats`, `/coupons`, `/reports`.
  - Added optional `RATE_LIMIT_KV` fast-path alongside strongly-consistent D1 `rate_limits`.
  - Expanded automated verification to **28 Vitest tests (6 files)** and **12 Playwright E2E tests** across desktop and mobile viewports.

### Added - Hardening, Quality, E2E & Production Verification
- **Playwright Full Regression Suite**: 8/8 end-to-end tests passing at both Mobile (390x844) and Desktop (1280x800) viewports:
  - App shell smoke test (branding, header, signature HandoverTicket demo, zero-friction browse navigation).
  - Complete customer journey: guest browse → add to cart → 1-tap demo student sign-in → pay-at-gate checkout → live HandoverTicket.
  - Vendor Counter Tablet console: role login, 4-column kanban board, real-time stock toggle, daily settlement CSV export.
  - Admin Operations portal: role login, key metrics overview, SVG orders volume chart, gate curfew controls, vendor management.
- **Strict Performance & Bundle Budgeting**:
  - Main student bundle: **146.04 kB gzip** (strictly within the < 150 kB gzip budget).
  - Lazy-loaded `VendorConsolePage` (6.54 kB gzip) and `AdminConsolePage` (6.29 kB gzip) ensuring zero vendor/admin code leaks into the customer app.
  - Self-hosted Inter and Plus Jakarta Sans fonts with preconnect and immutable cache headers.
- **Enterprise Edge Security**:
  - Strict Content-Security-Policy (CSP) headers without unsafe-inline for scripts.
  - HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and anti-clickjacking frame protections.
  - Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`, and `__Host-` prefix in production.
  - Complete IDOR protection: students strictly prohibited from viewing or confirming another user's orders.
  - Role-based authorization middleware enforcing 403 Forbidden for unauthorized student/vendor access on `/admin` and `/v`.
- **Accessibility & UX**:
  - Full WCAG AA compliance with visible keyboard focus rings, semantic landmark structure, ARIA live regions for order status transitions, and dark mode support.
  - Standard 44px touch targets on student mobile interfaces, and 56px touch targets on vendor counter tablet interface.

### Added - Admin Management Console (/admin)
- **Campus Executive Dashboard**:
  - Live metric cards: Total Orders, Delivered Orders, GMV (₹), Active Vendors, Acceptance Rate (%), Median Delivery Time.
  - Lightweight, dependency-free hand-written SVG orders-per-hour histogram chart.
  - Live campus orders monitoring table with full event timeline inspection and admin force-cancellation modal.
- **Vendor Operations & Lifecycle**:
  - Vendor approval and suspension toggles with immediate effect on student visibility.
  - Vendor detail editing (FSSAI number, contact phone, operating hours, preparation time).
  - Reachability mapping: assign delivery gates and extra travel times per vendor.
  - One-tap vendor invite link generator in demo mode.
- **Campus Gates, Curfews & Festivals**:
  - Real-time gate curfew editing (`curfew_time`, `buffer_minutes`, `travel_minutes`).
  - Campus festival & emergency override system (e.g., closing gates or entire campus during Chhath Puja / holidays with student warning banners).
- **Campus Announcements & Audit Log**:
  - Campus announcement banner broadcaster with scheduled start and end timestamps.
  - Immutable audit logging tracking every administrative and vendor state mutation with actor IDs and IP addresses.

### Added - Vendor Counter Tablet Console (/v)
- **Landscape Counter Board**:
  - 4 kanban columns matching the delivery lifecycle: New Orders, Preparing, On Route, and At Gate.
  - 56px oversized touch targets designed for kitchen staff handling orders with wet or busy hands.
  - Synthesized Web Audio chime on incoming orders with visual ring animation.
  - Screen Wake Lock API integration to prevent kitchen counter tablets from dimming during rush hours.
- **Thermal Receipt Printing**:
  - Dedicated `#print-slip` template formatted for standard 58mm POS receipt and A6 thermal paper.
  - Prints public order number, delivery gate, 4-digit verification code, item breakdown, and special cooking instructions.
- **Stock Management & Daily Settlement**:
  - 1-tap live menu item stock toggling (in stock / out of stock).
  - Open/busy store mode controls with configurable busy duration (15m, 30m, 45m).
  - Daily settlement summary with one-click CSV export for vendor bookkeeping.

### Added - Customer Full App Experience
- **Signature UI Primitives**: Perforated `HandoverTicket` with oversized tabular 4-digit code, status `Stepper`, `GatePicker`, `QtyStepper`, `CurfewBanner`, `OfflineBanner`, and dark mode design tokens.
- **Product Discovery & Ordering**:
  - Campus canteen browsing by gate reachability and product categories (meals, snacks, fruits, groceries, raw chicken, etc.).
  - Real-time debounced cart quote with server-enforced pricing, stock verification, and curfew checking.
  - Idempotent order placement via unique `Idempotency-Key` headers.
  - Live order tracking page with 4-second ETag polling and 304 Not Modified optimization.
  - Gate code matching and student delivery confirmation.
  - Post-delivery rating & review submission, issue reporting, past order history, and account data deletion.

### Added - Day 1 & 2: Backend Foundation, Data Model, API, Auth & Services
- **Complete Drizzle Schema & Migrations**: Defined 18 tables in `src/worker/db/schema.ts` with ULID primary keys, integer paise currency, and UTC timestamps. Generated SQL migrations and added partial unique index on `(gate_id, handover_code)` for active orders.
- **Seeded NIT Patna Campus Data**: 3 gates with curfew rules (Main Gate, Hostel 5, Hostel 7), 8 campus vendors across all product categories (meals, snacks, fruits, groceries, veggies, raw chicken, late night, beverages) with 80+ realistic menu items, and 20 historical delivered orders for admin analytics.
- **Pure Domain Services**:
  - `canDeliver`: Curfew and gate travel time validator in Asia/Kolkata timezone with alternative gate recommendations.
  - `priceCart`: Recomputes cart totals from server truth; detects stock outages and price changes returning typed 409 conflicts.
  - `nextStatus`: Validates state machine status transitions and enforces strict role permissions.
  - `generateHandoverCode`: Generates 4-digit code using `crypto.getRandomValues`, unique among active orders at the delivery gate.
- **Authentication & Security**:
  - Rate-limited OTP request and verification with 6-digit codes and constant-time comparison.
  - Domain restrictions: only emails from `ALLOWED_EMAIL_DOMAINS` (`nitp.ac.in`) can register.
  - Sliding 30-day session cookies (`__Host-session` in production, `session` in local).
  - One-tap demo accounts (`POST /api/auth/demo/:role`) gated strictly behind `DEMO_MODE=true` (returns 404 when disabled).
- **Hono Edge API**:
  - Public endpoints: `/api/gates`, `/api/vendors`, `/api/vendors/:slug`, `/api/cart/quote`, `/api/announcements`.
  - Student order endpoints: `POST /api/orders` with mandatory `Idempotency-Key` header, `/api/orders` history, `/api/orders/:id` with ETag/304 support, cancel, confirm delivery, review, and issue report.
  - Vendor console endpoints: `/api/vendor/orders`, status update, menu & stock toggle, open/busy toggle, settlement summary.
  - Admin endpoints: `/api/admin/vendors`, `/api/admin/gates`, `/api/admin/orders`, `/api/admin/metrics`, `/api/admin/announcements`, `/api/admin/audit-log`.
  - Cron trigger: Background task automatically expiring stale unaccepted orders after 5 minutes.
- **Test Suite**: 20 Vitest worker integration tests covering pricing, curfew edge cases around midnight, state machine transitions, idempotent replays, role guards, OTP limits, and demo route gating.
- **Documentation**: Comprehensive `docs/API.md` documenting every endpoint, request/response schema, and error codes.

### Added - Day 1: Walking Skeleton & First Deploy
- Initial scaffold with React 19, Vite, TypeScript strict, and Cloudflare Workers static assets integration.
- Hono edge API skeleton with `/api/health` and Cloudflare D1 connection test.
- Local and remote Cloudflare D1 database `trefood-db` provisioned.
- CI pipeline in `.github/workflows/ci.yml` and `.github/dependabot.yml`.
