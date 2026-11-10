# TreFood Architecture Specification

TreFood is a hyperlocal campus food and essentials delivery platform tailored specifically for the National Institute of Technology Patna (NIT Patna). The system optimizes for extreme speed, transparent hostel gate handover verification, zero delivery fees, and strict curfew awareness.

---

## 1. System Overview

TreFood is built as a single Cloudflare Worker application utilizing Cloudflare Static Assets. A single worker serves both the React Single Page Application (SPA) and all `/api/*` endpoints with zero cold starts and sub-50ms latency across India.

```mermaid
graph TD
    Client["Student Mobile / Desktop Browser"]
    VendorTablet["Vendor Kitchen Tablet (/v)"]
    AdminDesktop["Admin Operations Console (/admin)"]

    subgraph CloudflareEdge ["Cloudflare Global Network (Edge)"]
        Worker["Cloudflare Worker (Hono REST API)"]
        StaticAssets["Cloudflare Static Assets (Vite React 19 SPA)"]
        D1["Cloudflare D1 Database (SQLite at the Edge)"]
        CronTrigger["Scheduled Worker (Order Expiration Cron)"]
    end

    Client -->|HTTPS / Static Chunks| StaticAssets
    Client -->|JSON API / Auth Cookie| Worker
    VendorTablet -->|4s Polling / Sound Chimes| Worker
    AdminDesktop -->|Operations / Curfews| Worker
    CronTrigger -->|Every 1 Minute| Worker
    Worker -->|Prepared SQL Queries| D1
```

---

## 2. Order Lifecycle State Machine

Orders progress strictly forward through verified state transitions. State transitions are computed exclusively on the server (`src/worker/services/order.ts`) and append an immutable event row in `order_events`.

```mermaid
stateDiagram-v2
    [*] --> placed: Student places order (Pay at Gate)
    placed --> accepted: Vendor accepts order on tablet
    placed --> expired: Auto-expired after 5 mins if unaccepted
    placed --> cancelled: Cancelled by student or admin

    accepted --> out_for_delivery: Vendor sends runner with packet
    accepted --> cancelled: Cancelled by vendor or admin

    out_for_delivery --> at_gate: Runner arrives at hostel gate
    out_for_delivery --> cancelled: Force-cancelled by admin

    at_gate --> delivered: Student confirms 4-digit handover code match
    at_gate --> cancelled: Force-cancelled by admin

    delivered --> [*]
    expired --> [*]
    cancelled --> [*]
```

### Transition Permissions Matrix

| Transition | Allowed Actors | Verification Requirement |
| :--- | :--- | :--- |
| `placed` → `accepted` | Vendor, Admin | Order in `placed` status |
| `accepted` → `out_for_delivery` | Vendor, Admin | Order in `accepted` status |
| `out_for_delivery` → `at_gate` | Vendor, Admin | Runner arrives at hostel gate |
| `at_gate` → `delivered` | Student (Customer) | **Customer ownership check**; order must be at gate |
| `placed` → `expired` | Cron System | Created > 5 minutes ago |
| Any active → `cancelled` | Admin, Student (`placed` only) | Valid cancellation reason required |

---

## 3. Core Database Entities (Cloudflare D1)

The database schema consists of **21 tables** defined with Drizzle ORM in `src/worker/db/schema.ts` (including `campuses`, `gates`, `vendors`, `vendor_gates`, `menu_categories`, `menu_items`, `users`, `sessions`, `otp_codes`, `orders`, `order_items`, `order_events`, `reviews`, `issues`, `announcements`, `favorites`, `coupons`, `push_subscriptions`, `vendor_applications`, `rate_limits`, and `audit_log`):

```mermaid
erDiagram
    campuses ||--o{ gates : contains
    campuses ||--o{ vendors : hosts
    campuses ||--o{ users : registers
    campuses ||--o{ coupons : offers

    vendors ||--o{ vendor_gates : serves
    gates ||--o{ vendor_gates : receives

    vendors ||--o{ menu_categories : organizes
    menu_categories ||--o{ menu_items : contains

    users ||--o{ orders : places
    vendors ||--o{ orders : fulfills
    gates ||--o{ orders : delivers_to

    orders ||--o{ order_items : includes
    orders ||--o{ order_events : records
    orders ||--o{ reviews : evaluates
    orders ||--o{ issues : reports
```

### Key Schema Design Decisions
1. **Integer Paise Currency**: All monetary fields (`price_paise`, `packing_charge_paise`, `subtotal_paise`, `packing_total_paise`, `discount_paise`, `total_paise`, `delivery_fee_paise`) are stored as integers. Float calculations are prohibited.
2. **Text ULID Identifiers**: Primary keys are Universally Unique Lexicographically Sortable Identifiers (ULIDs), ensuring chronological sortability and eliminating auto-increment enumeration leaks.
3. **UTC Timestamps**: Timestamps are stored as UTC Unix epoch seconds. All curfew (`19:30 IST` for Boys/Girls Hostel gates; `24x7` for Main Gate / Academic Blocks) and Campus Night Safety (`>= 19:00 IST`) rules are evaluated in `Asia/Kolkata` (`UTC+05:30`).
4. **Active Order Code Uniqueness & 5-Attempt Lock**: A partial unique index on `(gate_id, handover_code)` ensures no two active orders at the same hostel gate share the same 4-digit code; verifying `/confirm-handover` allows at most 5 wrong attempts before locking (`HTTP 423`) and requiring vendor assist.

---

## 4. Curfew & Delivery Feasibility Logic

Delivery availability is enforced by shared pure rules in `src/shared/curfew.ts` (`evaluateCanDeliver`, `computeEta`) and wrapped by `src/worker/services/delivery.ts`:

$$\text{Estimated Arrival} = \text{Current Time (IST)} + \text{Prep Time} + \text{Travel Time} + \text{Buffer Time}$$

Unless a gate is marked `is24x7`, if $\text{Estimated Arrival} > \text{Gate Curfew Time}$, delivery is rejected with reason code `too_late`, a `latestOrderTime` hint, and an alternate 24x7/open gate suggestion.

---

## 5. Security & Privacy Architecture

- **Stateless Zero-Trust Middleware**: Every request checks user roles (`student`, `vendor`, `admin`) in server middleware (`src/worker/middleware.ts`). Client state is never trusted.
- **Constant-Time Cryptography**: Passwords, OTP peppers, and secret hashes are evaluated using WebCrypto `crypto.subtle.timingSafeEqual` to eliminate side-channel timing leaks.
- **Session Security**: Session tokens are 256-bit cryptographically random strings; only their SHA-256 hash is stored in D1. Production uses `__Host-` prefixed cookies with `HttpOnly`, `Secure`, and `SameSite=Lax`.
- **Right to Erasure (GDPR)**: `DELETE /api/auth/delete-account` completely purges active sessions, clears student credentials, and anonymizes historical order references.
