# TreFood Security Specification & Threat Model

TreFood is designed with zero-trust engineering principles. Client input is never trusted, and all sensitive state transitions, pricing logic, curfew verifications, and role authorizations are verified on Cloudflare Workers edge nodes.

---

## 1. Threat Model & Mitigations

| Threat | Attack Vector | Mitigation Strategy |
| :--- | :--- | :--- |
| **Price Tampering** | Client modifies cart total or item price before POST | Server ignores client prices and re-prices all items from D1 directly via `priceCart`. Returns 409 Conflict if prices changed. |
| **Insecure Direct Object Reference (IDOR)** | Student manipulates `order_id` in URL to view or confirm another student's delivery | Server enforces `order.userId === currentUser.id`. Unauthorized access returns 403 Forbidden. |
| **Handover Code Brute-Force** | Unverified person attempts to guess 4-digit code at gate | Code is generated via `crypto.getRandomValues`, unique per active gate, and can only be confirmed by the authenticated account that placed the order. |
| **OTP Code Guessing & Flooding** | Attacker spams OTP requests or attempts code brute force | D1-backed sliding rate limiter (5 requests / 10m). Codes expire in 10m with a maximum of 5 attempts before invalidation. |
| **Session Hijacking & XSS Theft** | Malicious script steals authentication tokens | Stored only in `HttpOnly`, `Secure`, `SameSite=Lax` cookies (`__Host-session` in production). Inaccessible to client JavaScript. |
| **Cross-Site Request Forgery (CSRF)** | Malicious third-party website submits forged orders | Protected by `SameSite=Lax` cookies combined with strict Origin and Referer header verification on mutating HTTP methods. |
| **Duplicate Ordering / Race Conditions** | Rapid double-tapping of "Confirm Order" button | Mandatory `Idempotency-Key` header stored with unique database constraint. Replays return the existing order safely. |

---

## 2. Authentication & Session Architecture

### Email OTP Verification Flow
1. **Domain Restriction**: Only student emails ending with allowed campus domains (default: `nitp.ac.in`) are accepted. Vendor and admin accounts are pre-provisioned.
2. **Peppered Hashing**: The 6-digit OTP code is concatenated with a high-entropy secret pepper before SHA-256 hashing:
   $$\text{Code Hash} = \text{SHA-256}(\text{Code} \mathbin{\Vert} \text{Pepper})$$
   Plaintext codes are never stored in the database.
3. **Constant-Time Verification**: Comparison between the submitted code hash and the database hash is executed via `crypto.subtle.timingSafeEqual` to eliminate timing side-channel attacks.

### Session Management
- **Token Generation**: Upon successful OTP verification or demo sign-in, a 32-byte cryptographically secure random token is generated.
- **Token Hashing**: Only $\text{SHA-256}(\text{Token})$ is stored in the `sessions` table.
- **Sliding Expiration**: Sessions automatically slide forward up to 30 days on active API usage.
- **Cookie Specification**:
  - `__Host-session` (Production) / `session` (Local development)
  - `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`

---

## 3. Role-Based Access Control (RBAC)

Every route in `/api/*` is protected by `requireAuth` and role checking middleware:

```
/api/orders/*         -> Student (Order Owner) or Admin
/api/vendor/*         -> Vendor (Assigned Vendor ID) or Admin
/api/admin/*          -> Admin role ONLY (Strict 403 for Students & Vendors)
```

Non-admin access to any `/api/admin/*` route returns a typed error:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Administrator privileges required"
  }
}
```

---

## 4. Audit Logging & Non-Repudiation

All administrative and vendor mutations (status updates, stock toggles, curfew modifications, vendor suspensions, force cancellations) write an immutable row to the `audit_log` table containing:
- `actor_id`: User ID of the operator
- `actor_role`: Student, Vendor, or Admin
- `action`: Specific mutation name
- `target_type`: Order, Vendor, Gate, Menu, etc.
- `target_id`: ID of the target record
- `ip_address`: Cloudflare request client IP (`c.req.header('cf-connecting-ip')`)
- `created_at`: UTC epoch timestamp
