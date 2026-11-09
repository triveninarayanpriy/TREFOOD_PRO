# Changelog

All notable changes to the TreFood prototype will be documented in this file.

## [Unreleased]

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
