# TreFood Redesign Reset Audit (R1–R4)

**Target URL (Workers.dev):** `https://trefood-prototype.technicaltriveniyt.workers.dev`  
**Audit Date:** 2026-11-11  
**Baseline Reference:** Live `trefood.in` captures archived in `docs/reference/` (`landing-390.png`, `home-1440.png`)

---

## 1. Executive Summary

The **TreFood Redesign Reset (R1–R4)** replaced invented vendor stubs, placeholder gradients/SVG illustrations, and dark SaaS template chrome with real NIT Patna campus catalog data, self-hosted assets, a tactile warm-paper visual system (`#FBF6EE` paper, `#1C1210` espresso ink, `#830020` maroon, `#FFB400` primary CTA), real app step captures, and full end-to-end verification on Cloudflare Workers + D1.

---

## 2. R1–R4 Execution Summary

| Phase | Scope | Key Deliverables Verified |
| :--- | :--- | :--- |
| **R1 — Real Content & Seed** | Replaced fictional canteens with NIT Patna vendor catalog & real imagery | `db/real-seed.json` (**8** vendors, **112** categories, **766** menu items), **789** self-hosted assets in `public/images/`, schema migration `0006_flaky_ultragirl.sql`, regenerated `scripts/seed.sql` |
| **R2 — Design System ("Gate board and packet chit")** | Replaced generic cards & blurs with campus departure board, ledger rows, paper bills, and 4-digit chits | Semantic tokens in `src/client/index.css` (light warm paper + `.dark` espresso), 5 signature components (`GateBoard`, `VendorCounterRow`, `MenuLineRow`, `PaperBill`, `PacketChit`) showcased at `/dev/ui` |
| **R3 — Landing Page Rebuild (`/`)** | Removed SaaS counters, earnings slider calculators, and generic dome badges | Rebuilt `LandingPage.tsx` (10 focused sections), `VendorOnboardingSection.tsx`, `TopBar.tsx`, and `SplashScreen.tsx`; deleted `CurfewMiniDemo.tsx` and `PromotionCarousel.tsx`; generated cropped `1x` DPR step screenshots `/images/steps/step-{1..4}.png` (`19–31 KB` each) |
| **R4 — App Screens & Polish** | Unified `/app`, `/vendor/:slug`, `/search`, `/favourites`, cart drawer/sidebar, and `/orders/:id` | Removed all `backdrop-blur*` utility classes; integrated `<GateBoard compact />`, `<VendorCounterRow />`, `<MenuLineRow />`, `<PaperBill />`, and `<PacketChit />`; fixed `App.tsx` `/vendor/:slug` vs `/vendor` routing collision, drawer close on navigation, and `push.ts` ULID notification tie-breaking |

---

## 3. Side-by-Side UX Comparison vs. `docs/reference/` (`trefood.in`)

Inspecting `docs/reference/landing-390.png` and `docs/reference/home-1440.png` alongside live verification captures (`390x844`, `1440x900`) highlights key structural improvements:

1. **Desktop Viewport Utilisation (`/app`):**  
   `home-1440.png` constrained content inside a centered `~450px` mobile column leaving wide empty side margins. The rebuilt `/app` uses a true multi-column desktop layout: persistent left navigation rail (`DesktopNavRail`), central campus menu workspace, and sticky right packet ledger (`DesktopPacketSidebar` rendering `<PaperBill />`).
2. **Guest Browsing & Gate-First Discovery (`/` & `/app`):**  
   `landing-390.png` opened with sign-in friction (`"Sign in to order"`). Our landing page presents curfew-aware gate selection (`#hero-gate-select`), instant search (`#hero-search-input`), live `<GateBoard />`, open vs. slim closed campus counters, verbatim Campus Night Safety policy, and guest-first menu access.
3. **Closed Counter Clarity & Zero Dimmed Posters:**  
   Instead of promotional banner carousels (`PromotionCarousel`) and dimmed full-bleed closed restaurant posters, `/app` leads directly with compact curfew status (`<GateBoard compact />`), 5 real category tiles (`/images/categories/*-cat.png`), structured open `<VendorCounterRow />` entries, and slim closed rows (`Closed · Opens at {opensAt} IST` + Notify me / Heart save).
4. **Menu & Handover Trust (`/vendor/:slug` & `/orders/:id`):**  
   Vendor pages show `16:9` vendor cover imagery, live hours, prep time, FSSAI details, verbatim Campus Night Safety guidance, and crisp `<MenuLineRow />` items with veg/non-veg indicators and customisation sheets. Order tracking centers verification around `<PacketChit />` for unambiguous 4-digit packet handover at the gate.

---

## 4. Quality, Accessibility, Performance & Security Checks

### Accessibility (`@axe-core/playwright` + Keyboard Flow)
- **Automated Audit (`e2e/a11y-audit.spec.ts` & `e2e/landing.spec.ts`):** `0` serious or critical Axe violations across landing (`/`), student app (`/app`), search, vendor menus, cart, orders, sign-in, vendor console, and admin console in both light warm-paper and `.dark` espresso themes.
- **Fixes Applied During Audit:** Added `tabIndex={0}` and `role="region"` (`aria-label="Available Campus Coupons"`) to the scrollable coupons drawer container (`CartDrawer.tsx`) to satisfy `scrollable-region-focusable`; added `role="alert"` and explicit `type="button"` controls in `CheckoutModal.tsx`; verified zero horizontal overflow down to `320px` width.

### Performance & Bundle Budget
- **Initial JS Bundle (`npm run build`):** `dist/client/assets/index-BSzZv00d.js` = **385.59 kB** raw / **117.46 kB gzip** (under the **150 KB gzip** budget).
- **Lighthouse Mobile Audit (`https://trefood-prototype.technicaltriveniyt.workers.dev`, Version `8516884e-530e-4a0f-9109-3d84b43eecf7`):**
  - **Landing (`/`):** Performance **97**, Accessibility **100**, Best Practices **100**, SEO **100** (`FCP: 1.0 s`, `LCP: 2.1 s`, `CLS: 0.016`, `TBT: 90 ms`).
  - **Student App (`/app`):** Performance **96**, Accessibility **100**, Best Practices **100**, SEO **100** (`FCP: 0.9 s`, `LCP: 2.6 s`, `CLS: 0`, `TBT: 70 ms`).

### Code Hygiene & Content Integrity
- Targeted scans across `src/`, `public/`, `tests/`, `e2e/`, and `scripts/` verified zero remaining fictional vendor names (`Ganga Canteen`, `Sone Valley`, `Maurya`), zero UI chrome emojis, and zero `backdrop-blur*` classes.

### Dependency Security (`npm audit --omit=dev`)
- Reports `1` known upstream high-severity advisory on `zod <4.6.6` (`GHSA-mrhx-c7xc-m3w5`), whose fix requires a breaking upgrade to `zod@4.x` (`npm audit fix --force`). Pinned `zod@3.25.7` is retained intentionally in this milestone to avoid schema runtime regressions; production mitigation relies on bounded Zod string/array limits enforced across `src/shared/schemas.ts`.

---

## 5. Known Limitations (Prototype Scope)

1. **Simulated Auth & Payment Gateways (`DEMO_MODE`):** Mock Google account chooser, dev-toast email OTP fallback, and simulated UPI checkout adapter (`src/client/services/paymentAdapter.ts`) are active until Google OAuth client secrets and Razorpay/Cashfree keys are provisioned via `wrangler secret`.
2. **Sample Metrics & Curated Reviews:** Seeded vendor rating counts and review averages reflect baseline NIT Patna sample records (`scripts/seed.sql`) until live student order volume accrues.
3. **Vegetables Category ("Opening soon"):** The Vegetables category tile on `/app` maps cleanly to catalog search while dedicated produce vendors remain in onboarding.
4. **Upstream `zod@3` Advisory:** Tracked for scheduled `zod@4` migration post-deadline.
