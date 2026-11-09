# TreFood API Documentation

The TreFood API runs on Cloudflare Workers using the Hono framework. All requests and responses are strictly validated using Zod schemas from `@shared/schemas`.

## Base URLs
- **Production Edge:** `https://trefood-prototype.technicaltriveniyt.workers.dev/api`
- **Local Dev:** `http://localhost:5173/api` or `http://127.0.0.1:8787/api`

## Security & Architecture Principles
- **Currency & Money:** Integer paise (e.g. `₹160.00` is represented as `16000`).
- **Zero Delivery Fee:** Delivery fee is always `0` paise.
- **Timezone:** Asia/Kolkata (`UTC+05:30`) for business and curfew rules; stored as UTC epoch seconds.
- **Idempotency:** Order creation strictly requires the `Idempotency-Key` HTTP header.
- **Authentication:** HttpOnly, Secure, SameSite=Lax session cookies (`__Host-session` in production, `session` locally).
- **Standard Error Format:**
  ```json
  {
    "error": {
      "code": "ERROR_CODE_STRING",
      "message": "Human readable explanation and guidance.",
      "details": {}
    }
  }
  ```

---

## 1. System & Health
### `GET /api/health`
Checks backend Worker availability and queries D1 database with `SELECT 1`.
- **Auth:** Public
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "version": "0.1.0",
    "commit": "0ba74a9",
    "db": true
  }
  ```

---

## 2. Authentication (`/api/auth`)
### `POST /api/auth/otp/request`
Requests a 6-digit one-time passcode for campus sign-in.
- **Rate Limit:** 3 per 10m per email, 10 per 10m per IP.
- **Body**:
  ```json
  { "email": "aarav.student@nitp.ac.in" }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "message": "OTP sent to aarav.student@nitp.ac.in",
    "expiresInSeconds": 600,
    "previewCode": "123456" // Returned ONLY when DEMO_MODE=true
  }
  ```

### `POST /api/auth/otp/verify`
Verifies the 6-digit OTP and establishes an authenticated 30-day sliding session cookie.
- **Body**:
  ```json
  { "email": "aarav.student@nitp.ac.in", "code": "123456" }
  ```
- **Response `200 OK`**:
  - Sets `Set-Cookie: __Host-session=...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  ```json
  {
    "ok": true,
    "user": {
      "id": "01M7...",
      "email": "aarav.student@nitp.ac.in",
      "name": "aarav student",
      "role": "student",
      "campusId": "campus_nitp"
    }
  }
  ```

### `POST /api/auth/demo/:role`
One-tap login for rapid evaluation in prototype environments.
- **Param:** `:role` (`student`, `vendor`, `admin`)
- **Note:** Exclusively available when `DEMO_MODE=true`. Returns `404` when disabled.

### `GET /api/auth/me`
Returns current session profile.
- **Auth:** Optional / Authenticated
- **Response `200 OK`**:
  ```json
  { "ok": true, "user": { "id": "...", "email": "...", "role": "student" } }
  ```

### `POST /api/auth/logout`
Destroys session in D1 and invalidates cookie.

---

## 3. Public Student Browsing (`/api`)
### `GET /api/gates`
Returns all active campus hostel and boundary gates.
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "gates": [
      {
        "id": "gate_main",
        "name": "Main Gate (Ashok Rajpath)",
        "curfewTime": "23:30",
        "bufferMinutes": 15,
        "travelMinutes": 10,
        "active": true
      }
    ]
  }
  ```

### `GET /api/vendors`
Lists campus vendors. When `?gate=` is provided, vendors unable to deliver to that gate are excluded.
- **Query Params:**
  - `gate`: Gate ID (enforces reachability and curfew calculation)
  - `category`: Filter by category (`meals`, `snacks`, `fruits`, `groceries`, `vegetables`, `raw_chicken`, `late_night`, `beverages`)
  - `q`: Search substring across vendor name or description
  - `veg`: `true` to filter vegetarian offerings
  - `open`: `true` to return only currently open vendors

### `GET /api/vendors/:slug`
Fetches vendor profile, operating hours, FSSAI licence number, and full menu grouped by category.

### `POST /api/cart/quote`
Recalculates cart totals from server truth, verifies item availability, and validates curfew arrival time.
- **Body**:
  ```json
  {
    "vendorId": "v_ganga",
    "gateId": "gate_main",
    "items": [
      { "itemId": "it_g1", "quantity": 2, "expectedPricePaise": 16000 }
    ]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "ok": true,
    "subtotalPaise": 32000,
    "deliveryFeePaise": 0,
    "totalPaise": 32000,
    "totalQuantity": 2,
    "canDeliver": true,
    "etaMinutes": 30,
    "etaAt": 1700059500,
    "estimatedArrivalIst": "20:45"
  }
  ```
- **Response `409 Conflict`**: Returned if an item went out of stock (`ITEM_OUT_OF_STOCK`) or its price changed (`PRICE_CHANGED`).

### `GET /api/announcements`
Returns active announcements for the campus.

---

## 4. Student Orders (`/api/orders`)
### `POST /api/orders`
Places a new order.
- **Auth:** Student or Admin
- **Header:** `Idempotency-Key` (Required)
- **Body**:
  ```json
  {
    "vendorId": "v_ganga",
    "gateId": "gate_main",
    "items": [
      { "itemId": "it_g1", "quantity": 1, "expectedPricePaise": 16000, "notes": "Medium spicy" }
    ]
  }
  ```
- **Response `201 Created`** (or `200 OK` on idempotent retry):
  ```json
  {
    "ok": true,
    "order": {
      "id": "01M7...",
      "publicNo": "TF-4821",
      "status": "placed",
      "subtotalPaise": 16000,
      "totalPaise": 16000,
      "paymentMethod": "pay_at_gate",
      "handoverCode": "4729"
    }
  }
  ```

### `GET /api/orders`
Retrieves past and active orders for the authenticated customer.

### `GET /api/orders/:id`
Order status tracker with HTTP 304 ETag support for efficient polling on 2 bars of network.
- **Headers:** `If-None-Match: "<etag>"`
- **Response `200 OK`** or `304 Not Modified`.

### `POST /api/orders/:id/cancel`
Cancels an order. Customer can cancel only while status is `placed`.

### `POST /api/orders/:id/confirm`
Confirms handover delivery at the gate upon matching the 4-digit code.
- **Rule:** Only the order owner can confirm delivery, and strictly when status is `at_gate`.

### `POST /api/orders/:id/review`
Submits a 1-5 star rating and optional feedback for a delivered order.

### `POST /api/orders/:id/issue`
Reports an issue (`wrong_item`, `missing_item`, `quality`, `late`, `other`).

---

## 5. Vendor Console (`/api/vendor`)
*All vendor endpoints require authentication and `vendor` or `admin` role.*

### `GET /api/vendor/orders?since=`
Polls the live order board. Cards update incrementally via `since` timestamp.

### `PATCH /api/vendor/orders/:id/status`
Advances order status (`accepted`, `out_for_delivery`, `at_gate`, `cancelled`).
- **Body**:
  ```json
  { "status": "accepted", "prepMinutes": 20 }
  ```

### `GET /api/vendor/menu`
Retrieves vendor's categories and items.

### `PATCH /api/vendor/menu/item/:id/stock`
One-tap in-stock / out-of-stock toggle.
- **Body**: `{ "inStock": false }`

### `PATCH /api/vendor/status`
Toggles vendor status (`isOpen`, `busyMinutes`).
- **Body**: `{ "isOpen": true, "busyMinutes": 15 }`

### `GET /api/vendor/settlement`
Calculates daily settlement summary, delivered order counts, and cash to collect at gates.

---

## 6. Admin Lite (`/api/admin`)
*All admin endpoints require `admin` role.*

- `GET /api/admin/vendors`
- `PATCH /api/admin/vendors/:id/status`
- `GET /api/admin/gates`
- `PATCH /api/admin/gates/:id` (adjust curfew times or emergency buffers)
- `GET /api/admin/orders` (global live order monitor)
- `GET /api/admin/metrics` (revenue, order counts, fulfillment rates)
- `POST /api/admin/announcements`
- `GET /api/admin/audit-log`
