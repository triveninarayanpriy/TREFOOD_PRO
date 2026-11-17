# Changelog

All notable changes to the TreFood prototype will be documented in this file.

## [Unreleased]

### Added - Design System v2 & Dual-Shell Code-Splitting (<MobileShell> & <DesktopShell>) (Prompt P2)
- **Dual-Shell Architecture & Strict Shell-Level Code-Splitting (`src/client/shells/`, `src/client/App.tsx`)**:
  - Built `<MobileShell>` (<768px) and `<DesktopShell>` (>=768px) as two completely distinct layout trees with separate page compositions.
  - Phones never download desktop top navigation rails or slide-over panels; desktop never downloads mobile bottom navigation or drawer trees.
  - Route components (`CustomerHomePage`, `VendorPage`) refactored into thin adapters delegating to `<MobileXxxPage>` or `<DesktopXxxPage>` via `useViewport()` with server-safe UA snapshot and zero layout flash.
  - Production build outputs distinct chunks: `MobileShell-*.js` (4.93 kB), `DesktopShell-*.js` (5.43 kB), `MobileHomePage-*.js` (3.21 kB), `DesktopHomePage-*.js` (4.22 kB), `MobileVendorPage-*.js` (7.34 kB), `DesktopVendorPage-*.js` (8.23 kB).
- **Design System v2 Tokens (`src/client/tokens/index.ts`, `src/client/index.css`)**:
  - Strict 9-step Spacing tokens: 4, 8, 12, 16, 24, 32, 48, 72, 96px (`--space-1` to `--space-9`).
  - Radius tokens: 8, 12, 20, pill (`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`).
  - Max content width 1280px on desktop with 12-column grid and 32px gutters (`.tf-desktop-container`, `.tf-desktop-grid`).
  - Strict Type scale: Display 64/40, H1 44/30, H2 32/24, H3 22/18, Body 17/16, Small 14/13 (minimum 13px anywhere; zero tiny monospace labels). Display face Fraunces, body DM Sans, Devanagari fallback Noto Sans Devanagari, handwriting Caveat strictly for the 4-digit code.
  - Color palette: Warm paper `#FBF6EE`, surface `#FFFFFF`, ink `#1C1210`, muted `#6B5B54`, TreFood maroon `#830020`, checkout amber `#FFB400` reserved exclusively for checkout action.
  - Motion tokens: 150ms hovers/presses, 250ms sheets/panels, 400ms page transitions with ease-out curves and `prefers-reduced-motion` compliance.
- **10 Design System v2 Components with Mobile & Desktop Variations (`src/client/components/v2/`)**:
  1. `VendorCard`: `MobileVendorCard` (compact list card with 4:3 photo, night-safe shield) and `DesktopVendorCard` (spacious 4:3 card with generous photo, details, minimum 13px type).
  2. `MenuItem`: `MobileMenuItem` and `DesktopMenuItem` (1:1 square photo >=120x120, veg badge, stepper).
  3. `CategoryNav`: `MobileCategoryNav` (horizontal scroll snap pills with 24x24 photo) and `DesktopCategoryNav` (category tiles with 32x32 photo).
  4. `CartSummary`: `MobileCartSummary` (sticky floating bottom bar) and `DesktopCartSummary` (slide-over right panel with 250ms ease-out).
  5. `GateStatus`: `MobileGateStatus` (pill with live curfew countdown) and `DesktopGateStatus` (popover gate picker with curfew badge).
  6. `OrderStatus`: `MobileOrderStatus` and `DesktopOrderStatus` (handover card with Caveat handwriting 4-digit code, 15m window countdown).
  7. `Sheet` (`SheetV2` mobile bottom sheet) & `Dialog` (`DialogV2` desktop centered modal).
  8. `Toast` (`ToastV2` status notification with responsive placement).
  9. `EmptyState` (`EmptyStateV2` with Lucide icons, descriptive help copy, and call-to-action).
  10. `Skeleton` (`MobileCardSkeleton` and `DesktopCardSkeleton` matching final layout exactly).
- **Interactive Component Lab (`/dev/ui`, `src/client/pages/DevKitPage.tsx`)**:
  - Side-by-side shell switcher (Mobile 390px, Desktop 1280px, Side-by-Side).
  - All 10 V2 components interactive in both shells and both themes (Light paper and Dark ink).
- **Verification**:
  - `npm run verify:images` passed (780 canonical assets).
  - `npm run typecheck` passed (0 errors).
  - `npm run lint` passed (0 errors).
  - `npm test` passed (7 test files, 40 tests passed).
  - `npm run build` passed with separate mobile & desktop chunks under 150 kB gzip budget.

### Added - Production-Level Catalog Stabilization, Responsive Image Pipeline & Clean Navigation (Prompt P1)
- **Data Audit & Duplicate Vendor Elimination (`docs/DATA_AUDIT.md`)**:
  - Audited `db/real-seed.json` against live `https://www.trefood.in/c/nit-patna`.
  - Identified root cause of `Patliputra Juices 3713` and `0294` as dynamic E2E onboarding test fixtures persisting in local D1. Added pre- and post-test cleanup to `e2e/admin-console.spec.ts`.
  - Added server-side duplicate slug/name guard (`409 DUPLICATE_VENDOR`) and category cover fallback to `src/worker/routes/admin.ts`, plus `DELETE /api/admin/vendors/:id` with zero-order validation.
  - Verified `Kolkata Biryani Fast-Food Pizza House` is authentic and verbatim on live `trefood.in`.
  - Corrected Chai Sutta Bar (CSB) opening time to `10:30` IST and cleaned dish whitespace anomalies.
- **Responsive AVIF + WebP Image Pipeline (`scripts/build-images.mjs`, `scripts/verify-images.mjs`)**:
  - Implemented automated pipeline resizing all 780+ canonical seed assets to 320, 640, 960, and 1440px in AVIF (`effort: 1`) and WebP (`effort: 2`).
  - Extracted dominant hex placeholders for layout stability (`src/shared/image-manifest.ts`).
  - Added `<ResponsiveImage>` component with zero Cumulative Layout Shift (`CLS = 0`), `<picture>` srcset, and fallback cascade avoiding broken boxes or spilled alt text.
  - Added `verify:images` build gate enforcing canonical width >= 640px, 21:9 & 4:3 vendor covers, 1:1 menu items, and responsive variant availability.
- **Customer Navigation Decoupling**:
  - Removed developer and role links (`Vendor Console`, `Admin`, `UI Kit (/dev/ui)`) from customer sidebar (`DesktopNavRail.tsx`) and `AccountPage.tsx`.
  - Dedicated `/vendor/login` and `/admin/login` entry points, with a quiet `For vendors` link in the footer.
  - Restricted `/dev/*` routes to `import.meta.env.DEV` (rendered as 404 in production builds).
- **Verification**: `npm run verify:images` passed (780 canonical assets >=640px, 0 failures), `npm run typecheck` passed (0 errors), `npm run lint` passed (0 errors), `npm test` passed (7 test files, 40 tests passed), `npm run build` completed (117.93 kB gzip).

### Changed - TreFood Redesign Reset (R1–R4) & Cloudflare Production Verification
- **Real NIT Patna Catalog & Self-Hosted Assets (R1)**:
  - Replaced invented vendor fixtures with `db/real-seed.json` (**8** NIT Patna campus vendors, **112** menu categories, **766** items), **789** self-hosted media files in `public/images/`, D1 migration `0006_flaky_ultragirl.sql`, and regenerated `scripts/seed.sql`.
- **Gate Board & Packet Chit Design System (R2)**:
  - Established semantic warm-paper (`#FBF6EE`) and `.dark` espresso design tokens in `src/client/index.css` alongside reusable UI components (`GateBoard`, `VendorCounterRow`, `MenuLineRow`, `PaperBill`, `PacketChit`) showcased at `/dev/ui`.
- **Landing Page Rebuild (R3)**:
  - Rebuilt `/` (`src/client/pages/LandingPage.tsx`), `VendorOnboardingSection.tsx`, `TopBar.tsx`, and `SplashScreen.tsx`; removed SaaS calculators, badge chrome, `CurfewMiniDemo.tsx`, and `PromotionCarousel.tsx`; added real cropped `1x` DPR workflow captures (`public/images/steps/step-{1..4}.png`).
- **App Redesign, Routing Fixes & Audit (R4)**:
  - Redesigned `/app`, `/vendor/:slug`, `/search`, `/favourites`, `CartDrawer.tsx`, `DesktopPacketSidebar.tsx`, `CheckoutModal.tsx`, and `/orders/:id` using the R2 component set without `backdrop-blur*` classes.
  - Fixed `/vendor/:slug` vs `/vendor` navigation chrome hiding in `src/client/App.tsx`, auto-closed drawers/modals on route transitions, and added ULID tie-breaking to `src/worker/routes/push.ts`.
  - Documented full visual, Lighthouse Mobile (`97` `/` / `96` `/app` Performance, `100` Accessibility/Best Practices/SEO), Axe (`0` serious/critical violations), bundle (`117.46 kB` gzip), and dependency security findings in `docs/REDESIGN_AUDIT.md`.

### Added - Desktop-First Admin Console (/admin) & Server-Side RBAC Verification
- **Overview Cards & Live Orders Monitor (`src/worker/routes/admin.ts`, `src/client/pages/admin/AdminConsolePage.tsx`)**:
  - Updated `/api/admin/metrics` & `/api/admin/stats` to compute **Live Orders**, **Delivered Today** (IST boundary), **Average Gate ETA**, **Complaints Open**, and **Vendors Open** alongside GMV and IST hourly volume histogram.
  - Added server-side and UI filters on **Orders Monitor** (`status`, `gateId`, `vendorId`, and `q` search by `#publicNo`/code/vendor), full timeline view, and force-cancellation with reason + audit trail.
- **Vendor Onboarding Approval, Gate Reach & Gate Closure Broadcasts**:
  - Added `GET /api/admin/vendor-applications` and `PATCH /api/admin/vendor-applications/:id` so onboarding inquiries from `/` can be approved directly into active `vendors` + default `vendor_gates` rows.
  - Added `PUT /api/admin/vendors/:id/gates` and a dedicated **Edit Hours & Gates** modal to adjust vendor opening/closing hours, prep time, and reachable hostel gates with extra travel minutes.
  - Upgraded `PATCH /api/admin/gates/:id` and **Gates & Curfews** cards with **Save Hours** controls (`curfewTime`, `bufferMinutes`, `travelMinutes`) and temporary gate closures (`Temp Close + Banner` / `Reopen Gate`) that broadcast active student announcements immediately.
- **Coupons Manager, Reports Queue, Vendor-by-Day Settlements & Audit Log (`src/client/components/admin/AdminOpsTabs.tsx`)**:
  - Added **Coupons** tab (`POST /api/admin/coupons`, active/pause toggle), upgraded **Reports** tab (`Resolve`, `Credit`, `Refund`, `Reject` with ₹ refund amounts & notes), added `GET /api/admin/settlements` **Settlements** report grouped by vendor & IST day with CSV download, announcement active/hide toggles (`GET` & `PATCH /api/admin/announcements`), and filterable sensitive **Audit Log** (`?action=`).
  - Removed all remaining `@typescript-eslint/no-explicit-any` warnings across `AdminConsolePage.tsx` (`0` ESLint errors, `0` warnings codebase-wide) and fixed WCAG `4.5:1` muted caption contrast.
- **Verification**: Kept initial student bundle at **145.26 kB gzip** (`< 150 KB` budget), **39 / 39 Vitest tests** passing (including exhaustive unauthenticated `401` and student/vendor `403` RBAC tests across all `/api/admin/*` endpoints), and **34 / 34 Playwright tests** passing (`e2e/admin-console.spec.ts` + `@axe-core/playwright`).

### Added - Tablet-First Vendor Console (/vendor, /v Alias, Board, Controls & Insights)
- **Order Board & Handover Assist (`src/client/pages/vendor/VendorConsolePage.tsx`)**:
  - Mounted `/vendor` (keeping `/v` working cleanly) with responsive tablet grids fitting **768px portrait** and **1024px landscape** without horizontal overflow and **`>= 56px` touch targets** across controls.
  - Updated board columns to **New Orders**, **Preparing**, **Ready** (`On Route` / `At Gate (Handover)`), and **Handed over** (sorted by most recent `deliveredAt`).
  - Added persisted **Sound + Vibration Mute** toggle, live **Gate Windows Countdown Strip** (`getGateCurfewStatus`), adjustable prep-time steppers before and after acceptance (`PATCH /api/vendor/orders/:id/prep-time`), structured **Reject** modal with required reason (`POST /api/vendor/orders/:id/reject`), **Mark Ready • Send to Gate**, **Arrived at Gate**, 15-minute packet window timer, and **Handover Assist** controls (`Unlock Retry` / `Assist & Hand Over`) when a student locks out (`5/5` failed tries).
- **Controls, Stock Search & Price Editor (`src/client/components/vendor/VendorMenuTab.tsx`, `src/worker/routes/vendor.ts`)**:
  - Synced D1-backed **Store Open/Closed**, **Busy 30m / Clear**, **Night Safety Staff On Duty**, and **Stay Awake** toggles in the counter toolbar, plus batched `orderItems` hydration in `GET /api/vendor/orders`.
  - Added dish search + category filter pills, 1-tap `In Stock / Sold Out` toggles, inline rupee price editor (`PATCH /api/vendor/menu/item/:id` + audit logging), and Default Promised Prep Time stepper (`PATCH /api/vendor/prep-time`).
- **Insights & Daily Settlement (`src/client/components/vendor/VendorInsightsTab.tsx`, `GET /api/vendor/settlement`)**:
  - Added Today's Orders, Today's Revenue (Pay at Gate vs UPI split), Avg Prep vs Promised comparison, Top Selling Items leaderboard, hand-written IST Peak Hours SVG chart, and Daily Settlement packets log with **Export CSV** download.
- **Notifications Feed Refinement (`src/worker/routes/push.ts`)**:
  - Scoped `GET /api/notifications` to return the latest concise status card per order across up to 40 recent orders (`idx_orders_user_created`).
- **Verification**: Kept main student bundle at **145.23 kB gzip** (`< 150 KB` budget), **38 / 38 Vitest tests** passing, and **32 / 32 Playwright tests** passing (including portrait `768x1024` & landscape `1024x768` coverage + `@axe-core/playwright` audit in `e2e/vendor-console.spec.ts`).

### Added - Order Tracking (/orders, /orders/:id), Code Handover, Web Push & PWA Shell
- **Live Tracker & 4-Digit Handover (`src/client/pages/OrderDetailPage.tsx`, `src/client/components/ui/StatusTimeline.tsx`)**:
  - Upgraded `StatusTimeline` to display all 6 steps (`Placed`, `Accepted`, `Preparing`, `Out for delivery`, `At your gate`, `Delivered`) with IST step timestamps, ETA badge, `aria-live="polite"`, and Campus Night Safety notice.
  - Added visible freshness badge (`"Updated just now"` / relative seconds) + manual `Refresh` button, direct `tel:` vendor contact button, `Cancel Order` (`placed` only), ETag-backed 5s polling with exponential backoff up to 20s paused while hidden, and a live **15-minute gate window countdown** (`MM:SS`) on `at_gate` arrival.
  - Replaced checkbox confirmation with strict server-verified 4-digit handover code input submitting to `POST /api/orders/:id/confirm-handover` with attempts-remaining feedback and 5-attempt lockout handling (`HTTP 423`).
  - Fixed problem reporting payload (`{ reason, description }` to `POST /api/orders/:id/report`), adding `not_at_gate` alongside `wrong_item`, `missing_item`, `late`, `quality`, and `other`, plus a new **Reports** queue tab in `AdminConsolePage.tsx` wired to `GET /api/admin/reports` & `PATCH /api/admin/reports/:id`.
- **Orders Hub & Review Sheet (`src/client/pages/OrdersPage.tsx`, `src/client/components/orders/RateReviewSheet.tsx`)**:
  - Added **Active / Past tabs** with live counts backed by batch-hydrated `GET /api/orders` (including `items[]`, `vendorSlug`, `hasReview`, zero N+1), 1-tap **Reorder** repopulating `CartContext`, and accessible modal `RateReviewSheet` (`min-h-[44px]` star buttons).
- **Web Push, Notification Centre & iOS-Only Install Guide (`src/worker/utils/webpush.ts`, `src/worker/routes/push.ts`, `src/client/components/notifications/NotificationCentre.tsx`, `src/client/components/ui/InstallAppModal.tsx`)**:
  - Implemented zero-dependency WebCrypto VAPID JWT push dispatch (`POST /api/push/subscribe`, `DELETE /api/push/subscribe`, `GET /api/push/vapid-public-key`) triggered on vendor order transitions (`src/worker/routes/vendor.ts`).
  - Added in-app `NotificationCentreDrawer` (`GET /api/notifications` status cards, triggered via lazy bell icon in `TopBar.tsx`), compact `OrderPushStatusCard`, and iOS-only Safari home-screen instructions (`src/client/utils/platform.ts`) in both `InstallAppModal` and push status cards.
- **PWA Offline Shell (`public/sw.js`, `public/offline.html`, `src/client/main.tsx`)**:
  - Registered `/sw.js` Service Worker caching core shell assets, push status alerts, and serving an informative standalone `/offline.html` fallback screen when campus connectivity drops.
- **Verification**: Kept initial first-load bundle at **145.16 kB gzip** (`< 150 KB` budget), **37 / 37 Vitest tests** passing, and **30 / 30 Playwright tests** passing (including new multi-context `e2e/orders-handover.spec.ts` + `@axe-core/playwright` contrast fix).

### Added - Zustand Cart & Checkout (Coupons, Min-Order Add-ons, Schedule, UPI Sim & Idempotency)
- **Zustand Persisted Cart (`src/client/store/cartStore.ts`) & Offline Mode**:
  - Installed `zustand` (`5.1.0`, documented in `docs/DECISIONS.md`) with `localStorage` persistence (`trefood_cart_v1`) so cart items, variants/add-ons, special instructions, coupons, contact phone, delivery instructions, and offline subtotal estimates work offline across reloads.
  - Standardized single-vendor conflict prompts to `"Start a new cart with <Vendor>?"`, and lazy-loaded `CartDrawer` (`App.tsx`) to keep the first-load client bundle at **144.53 kB gzip**.
- **Cart Drawer (`src/client/components/cart/CartDrawer.tsx`) & Quote API**:
  - Added coupon input field + visible list of campus coupons (`GET /api/coupons`) showing live eligibility and shortfall hints, full itemised bill (items subtotal, packing charges, coupon discount, FREE delivery, total), **Minimum-order progress bar** with 1-tap vendor `suggestedAddons[]` when short, and gate/ETA summary showing `latestOrderTime` + curfew alert banner with 1-tap `alternativeGates` switching.
- **Checkout Modal (`src/client/components/cart/CheckoutModal.tsx`) & Orders API (`src/worker/routes/orders.ts`)**:
  - Added gate confirmation, 10-digit `contactPhone` validation (`migrations/0004_flimsy_sasquatch.sql` -> `orders.contact_phone`), delivery instruction (`note`), **Schedule for later** slot picker constrained by both vendor operating hours and gate curfew (`getAvailableScheduleSlots` in `src/shared/curfew.ts`), and payment choice between **Pay at gate** and **Pay now with UPI (Simulated)** behind a pluggable gateway adapter (`src/client/services/paymentAdapter.ts`) supporting success & recoverable decline paths.
  - Enforced server re-validation of price, stock, coupon eligibility (`409 COUPON_NOT_ELIGIBLE`), minimum order (`409 MIN_ORDER_NOT_MET`), scheduled slot curfew (`400`), UPI failure (`402 PAYMENT_FAILED`), and `Idempotency-Key` double-submit prevention (`replayed: true`), rendering the full itemised breakdown and payment status on `/orders/:id` (`OrderDetailPage.tsx`).
  - Expanded tests in `tests/worker/curfew.test.ts`, `tests/worker/pricing.test.ts`, `tests/worker/api.test.ts` (`36 / 36` Vitest tests) and added Playwright E2E `e2e/cart-checkout.spec.ts` (`28 / 28` tests across mobile & desktop).

### Added - Customer Experience (/app, /app/search, /vendor/:slug)
- **Customer Home (`/app`, `/browse` alias, mobile-first & two-column desktop)**:
  - Built mobile-first / two-column desktop storefront (`src/client/pages/CustomerHomePage.tsx`) featuring a persistent right-column `DesktopPacketSidebar` (`lg:col-span-4 lg:sticky`), `AppSearchBar` with live vendor/dish suggestions and `localStorage` recent searches, `PromotionCarousel` fed by live `/api/coupons` and `/api/announcements` with 1-tap coupon application, **Quick picks** shelf, **Popular vendors**, **Open Now** sorted first, and a slim **Closed** list displaying `Opens at` time, `Notify me` reminder toggle, and `Pre-order` action (no large dimmed photos).
  - Implemented `src/shared/catalogFilters.ts` with category chips showing live counts, automatic zero-result combination prevention (disabling 0-count chips and auto-resetting incompatible categories), **Veg only** toggle, and sorting by **ETA**, **Rating**, and **Price**.
  - Enriched `VendorCard` (`src/client/components/ui/VendorCard.tsx`) with gate-aware ETA, rating + count, minimum order badge, starting item price, Night Safe badge, offer tags, and keyboard-accessible controls.
- **Vendor Page (`/vendor/:slug`, `/app/vendor/:slug`) & Variant/Add-on Customization**:
  - Added header `Call` (`tel:`) button, `Save` favourite button, prep/hours/Night Safety/out-of-stock status notices, pre-order opening slot banner, sticky category tabs with Veg-only filter, **Reviews** tab with 5-star breakdown summary and sample verified reviews, and `ItemOptionsSheet` supporting variants (`Half`/`Full`), add-ons (`Extra Boondi Raita`), and cooking notes.
  - Updated `src/worker/services/cart.ts`, `CartContext`, `CartDrawer`, and `CheckoutModal` to price variants/add-ons on server truth cleanly and support coupon & scheduled pre-order payloads.
- **Unified Search Page (`/app/search`, `/search`)**:
  - Added batch-indexed `GET /api/search` in `src/worker/routes/public.ts` and `src/client/pages/SearchResultsPage.tsx` searching matching vendors and dishes together with type tabs, live-count category chips, Veg-only, Open-now, and Sort (`Relevance`, `ETA`, `Rating`, `Price`).
  - Added sample student reviews to `scripts/seed.sql` and unit/worker/E2E test coverage (`tests/worker/catalog-filters.test.ts`, `tests/worker/api.test.ts`, `e2e/customer-app.spec.ts`).

### Added - Authentication (/signin), KV Sessions, Turnstile Flag, Gate Picker & Splash
- **Authentication & Role Switcher (`/signin`)**:
  - Built `/signin` (`src/client/pages/SignInPage.tsx`) featuring **Sign in with Google** (mock NIT Patna Google Account Chooser by default; real Google OAuth 2.0 Authorization Code flow when `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are configured), **Email OTP fallback** displaying dev codes cleanly in toast notifications, and **Prominent Demo Mode** buttons (`Continue as Student`, `Continue as Vendor`, `Continue as Admin`).
  - Migrated session storage to Cloudflare Workers KV (`SESSION_KV`, SHA-256 hashed 30-day `httpOnly` cookies) with D1 fallback and full logout/erasure cleanup.
  - Added Cloudflare Turnstile server verification (`src/worker/auth/turnstile.ts`) and client explicit widget (`src/client/components/auth/TurnstileWidget.tsx`) gated cleanly behind `TURNSTILE_ENABLED`.
  - Added protected Favourites endpoints (`/api/favorites`), `/favorites` page, and heart toggles on vendor cards/pages; guests browse freely everywhere while Checkout, Favourites, and Orders prompt sign-in and redirect cleanly via `returnTo`.
- **Header, Responsive Gate Picker & First-Visit Splash**:
  - Updated `TopBar` to always show `Deliver to: <gate>` with a live status line (`Open 24x7`, `Open until 19:30`, `Closed`, and countdown e.g. `closes in 45 min`).
  - Built responsive `GatePicker` rendering as a **bottom sheet on mobile** and an **anchored popover on desktop**; selecting a closed gate explains why and offers a 1-tap switch to the nearest open gate while persisting choices in `localStorage`.
  - Added first-visit `SplashScreen` shown once per device on `/` with 1.5s auto-advance and a `>= 44px` Skip button, suppressed for returning visitors and deep links.
  - Added gate logic unit tests for **18:45, 19:15, and 19:45 IST** (`tests/worker/curfew.test.ts`), KV/Google mock/favorites/Turnstile worker tests (`tests/worker/api.test.ts`), and Playwright E2E tests (`e2e/auth-gates.spec.ts`).

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
