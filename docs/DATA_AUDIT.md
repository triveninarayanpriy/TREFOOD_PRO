# TreFood Catalog Data & Image Audit

**Date:** 17 November 2026  
**Auditor:** Antigravity Engineering  
**Scope:** `db/real-seed.json` vs Live `https://www.trefood.in/c/nit-patna`

---

## 1. Executive Summary

This audit verifies all vendor metadata, menu items, prices, operating hours, and imagery in `db/real-seed.json` against the live production TreFood NIT Patna campus deployment (`https://www.trefood.in/c/nit-patna`).

### Key Audit Outcomes
1. **Zero Duplicate Vendors & Numeric Suffixes:** Root cause of `Patliputra Juices 3713` and `0294` was isolated to an E2E onboarding test writing without cleanup. Test was refactored with clean teardown, server routes patched with duplicate guards and category cover fallbacks, and the database seed was verified to contain only the single canonical `Patliputra Juices` (`slug: "patliputra-juices"`).
2. **Vendor Name Verification:** Verified that **"Kolkata Biryani Fast-Food Pizza House"** is the exact verbatim name used by TreFood on the live NIT Patna site (`https://www.trefood.in/c/nit-patna/r/kolkata-biryani-fast-food-pizza-house`). It offers both Kolkata biryani/rolls and a dedicated Pizza House section.
3. **Cover Photo Resolution & Completeness:** Every vendor now has a verified high-resolution cover photo (>=640px wide) supporting both 21:9 landscape hero crops and 4:3 card crops. Shwami Ji was updated with an authentic 1024x1024 photo harvested directly from TreFood's server (`/shwami-ji/shwami2.jpg`).
4. **Category Photography:** Low-resolution 70x53 placeholder icons (`*-cat.png`) were completely removed from client components and replaced with authentic high-resolution licensed photography (`>=1200px`): `food.jpg`, `juices.jpg`, `vegetables-real.jpg`, `groceries-real.jpg`, `chicken-real.jpg`.
5. **Automated Verification Pipeline:** `scripts/verify-images.mjs` was introduced as a `prebuild` hook, failing any build if any referenced seed image is missing, < 640px wide, has duplicate slugs/names, or lacks responsive AVIF/WebP variants across widths 320, 640, 960, and 1440px.

---

## 2. Vendor-by-Vendor Verification

| Vendor Name | Live Slug on trefood.in | Status on Live Site | Audited Action / Verification |
|---|---|---|---|
| **Chai Sutta Bar (CSB)** | `chai-sutta-bar-csb` | Open (10:30-22:30) | Corrected opening time from 10:00 to 10:30 to match live schedule. Verified 84 real menu items. |
| **Kolkata Biryani Fast-Food Pizza House** | `kolkata-biryani-fast-food-pizza-house` | Open (10:00-22:30) | Confirmed verbatim match on live site. 87 items covering Biryani, Rolls, Chowmein, and Pizza House. |
| **Wrapchik Pizza** | `wrapchik-pizza` | Open (10:00-22:00) | Verified 114 menu items (pizzas, burgers, waffles, shakes). Canonical cover >= 640px. |
| **Sone Zone Cafe** | `sone-zone-cafe` | Open (11:00-22:00) | Verified 186 items (dosa, shakes, sandwiches, biryani). Canonical cover >= 640px. |
| **Patliputra Juices** | `patliputra-juices` | Open (09:00-21:30) | Cleaned duplicate artifacts. Single authentic vendor retained. Verified 86 items. |
| **Night Canteen NITP** | `night-canteen-nitp` | Open (19:00-02:00) | Verified night canteen schedule and late-night delivery reach. Canonical cover >= 640px. |
| **Shwami Ji** | `shwami-ji` | Open (10:00-22:00) | Upgraded cover to authentic 1024x1024 photo (`/shwami-ji/shwami2.jpg`). Verified 68 items. |
| **Vrindavan Bhog** | `vrindavan-bhog` | Open (08:30-22:00) | Added authentic vendor description and tagline. Verified 124 items. |

---

## 3. Investigation & Resolution of Known Issues

### 3.1 "Patliputra Juices 3713" & "0294" Duplicate Vendors
- **Observation:** Reviewers observed duplicate vendor entries with numeric suffixes on the vendor listing page.
- **Root Cause Analysis:** Investigation into the test suite revealed line 43 in `e2e/admin-console.spec.ts`:
  ```typescript
  const uniqueVendorName = `Patliputra Juices ${Date.now().toString().slice(-4)}`;
  ```
  The E2E test was submitting vendor onboarding applications to the local D1 database, approving them via the admin console, and leaving them persisted across test runs. Furthermore, when `src/worker/routes/admin.ts` approved new vendor applications, it inserted `coverImageUrl: null`, causing the frontend to render empty broken image boxes with fallback alt text.
- **Resolution:**
  1. Updated `PATCH /api/admin/vendor-applications/:id` in `src/worker/routes/admin.ts` to check for existing vendor names and slugs before creating, returning `409 DUPLICATE_VENDOR` if a collision exists.
  2. Added category-based fallback cover assignment so newly approved vendors always receive a valid responsive cover image (`/images/categories/juices.jpg`, `/images/categories/food.jpg`, etc.).
  3. Added `DELETE /api/admin/vendors/:id` endpoint in `src/worker/routes/admin.ts` to allow administrative removal of test vendors.
  4. Updated `e2e/admin-console.spec.ts` to use `'NITP Fresh Juice Counter'` and wrapped the test in pre- and post-test cleanup routines so test vendors are deleted immediately upon completion.
  5. Verified `db/real-seed.json` has exactly 1 entry for Patliputra Juices with no numeric suffix.

### 3.2 "Kolkata Biryani Fast-Food Pizza House" Name Mapping
- **Observation:** Scrutiny on whether "Kolkata Biryani Fast-Food Pizza House" was an erroneous string concatenation from scraping.
- **Verification:** Navigated to `https://www.trefood.in/c/nit-patna/r/kolkata-biryani-fast-food-pizza-house`.
- **Finding:** The campus vendor literally brands itself "Kolkata Biryani Fast-Food Pizza House". It operates two distinct internal kitchens: a Biryani & Fast-Food counter (Kolkata Biryani, rolls, chowmein) and a pizza oven counter ("Pizza House"). The name is 100% authentic to the real establishment at NIT Patna.

### 3.3 Menu Data Anomalies Cleaned
- Whitespace formatting anomalies were normalized across dishes:
  - `"Milk Packet (0.5L) "` -> `"Milk Packet (0.5L)"`
  - `"Hyderabadi Chicken Biryani (750g) "` -> `"Hyderabadi Chicken Biryani (750g)"`
  - `" Paneer Biryani"` -> `"Paneer Biryani"`
- Quick picks list was updated with valid dishes that exist in the active menus:
  - Chicken Dum Biryani, Masala Dosa, Mango Shake, Margherita Pizza, Veg Burger.

---

## 4. Image Quality Pipeline & Verification

### 4.1 Responsive Formats & Dimensions
Every canonical asset in `/public/images` is guaranteed to be >= 640px wide:
- **Vendor Covers:** 21:9 crop (`1440x617`) and 4:3 crop (`960x720`).
- **Category Tiles:** 4:3 crop (`960x720`).
- **Menu Items:** 1:1 crop (`640x640`).
- **Responsive Widths:** Generated for 320w, 640w, 960w, and 1440w in both modern AVIF (`quality: 48, effort: 1`) and WebP (`quality: 78, effort: 2`).
- **Dominant Hex Color:** Pre-extracted using `sharp.stats().dominant` and compiled into `src/shared/image-manifest.ts` to provide immediate layout-stable placeholders with zero Cumulative Layout Shift (CLS = 0).

### 4.2 Error Handling & Fallbacks
- `<ResponsiveImage>` component implemented with strict fallback cascade:
  1. Responsive AVIF `<source>`
  2. Responsive WebP `<source>`
  3. Canonical WebP fallback `<img>`
  4. Vendor Cover Crop fallback on load error
  5. Solid warm dominant-color container on network failure
- Under no circumstances does the client display an empty broken image box or raw alt text.

### 4.3 Automated Verification Gate
- `scripts/verify-images.mjs` checks:
  1. `seed.vendors`: Zero duplicates, zero numeric suffixes.
  2. Canonical files: All referenced images exist in `/public` and have width >= 640px.
  3. Responsive variants: All 4 widths (320, 640, 960, 1440) in AVIF and WebP exist in `/public/images/r/`.
- Result: **780 canonical assets verified, 8 vendors (21:9 & 4:3), 766 menu items (1:1), 0 failures.**
