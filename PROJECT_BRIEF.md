# TreFood Recruitment Prototype — Master Brief

Hyperlocal campus delivery platform for Indian college campuses (live at NIT Patna). Built to feel like a real, shippable product rather than a mockup.

## Product Rules
- Students order hot meals, fruits and juices, groceries, vegetables, and raw chicken from campus vendors and collect at their hostel gate. No rider app, no live map, zero delivery fee.
- **4-Digit Handover Code**: Every order receives a cryptographic 4-digit handover code written on the packet. The student matches it at the gate and confirms delivery; an order cannot be closed without verification.
- **Curfew-Aware Gates**:
  - Main Gate / Academic Blocks: Open **24x7**.
  - Boys Hostel Gate & Girls Hostel Gate: Close at **19:30 IST** with a **15-minute gate window** (`buffer_minutes = 15`).
  - Vendors that cannot reach the chosen gate are hidden. Orders that cannot arrive before curfew (including prep, travel, and 15-min gate window) are refused with a clear explanation and a one-tap alternative gate suggestion.
- **Campus Night Safety**: After **19:00 IST (7 PM)**, deliveries are handled personally by the vendor owner, co-owner, or senior staff. Shown clearly via `Night Safe` badges and notices on vendor pages.
- **Three Roles**: Student (`student`), Vendor (`vendor`, counter tablet UI), and Campus Admin (`admin`).

## Real Content & Asset Rules
Use TreFood's real NIT Patna vendors, menus, prices and photos. Never use fictional vendors, AI-generated images or gradient placeholders.

## Approved Technical & Budget Alignment (see `docs/DECISIONS.md`)
- Stack: React 19 + Vite + TypeScript (strict) + Tailwind CSS v4 + Lucide React + React Router + TanStack Query + Zod + Hono on Cloudflare Workers + Static Assets + D1 (Drizzle ORM).
- Performance & Hostel WiFi Budget: `< 150 KB` gzip initial JS bundle, skeleton loaders, offline-safe localStorage cart, short polling with ETags/backoff, zero heavy maps, lazy-loaded real vendor/dish photos in `/public/images`.
- Layout: `src/client` (SPA), `src/worker` (API), `src/shared` (Zod schemas, types, pure curfew/ETA logic), `migrations` + `scripts/seed.sql`, `tests`, `e2e`, `docs`.
- DESIGN LANGUAGE ("Gate board and packet chit"):
  - Concept: A campus notice board and a printed menu ("Gate board and packet chit"), never a generic dark SaaS template or Zomato/Swiggy card clone.
  - Colour: Warm paper `#FBF6EE` default surface, ink `#1C1210` text, TreFood maroon `#830020` primary brand colour, chai brown `#B5651D` sparingly for craft/paper warmth, amber `#FFB400` reserved strictly for the single primary action. Dark mode (`#140D0B` / `#1E1412`) derives from the same warm ink/paper tokens and is opt-in via toggle or system preference, never the default look.
  - Typography: `Fraunces` display headings, `DM Sans` UI body, `Noto Sans Devanagari` for Hindi/Hinglish text, and `Caveat` handwriting used ONLY for the 4-digit code and packet chit annotations.
  - Photography: Real campus food & vendor photos only (`4:3` vendor covers, `1:1` item tiles, warm editorial grade). No generated art, no gradient placeholders, and no emoji anywhere in the UI.
  - Signature Components: (1) `GateBoard` departure-board strip with live status dot & countdown; (2) `VendorCounterRow` with `4:3` photo on left and dense printed metadata on right; (3) `MenuLineRow` with square veg/non-veg mark, dotted leader, and right-aligned price; (4) `PaperBill` receipt cart with serrated paper edge; (5) `PacketChit` with digit-by-digit flipping `Caveat` handover code.
  - Icons & Motion: Unified `lucide-react` stroke icons; only short staggered load-in and code flip animations (`prefers-reduced-motion` honoured); zero glassmorphism, parallax, blobs, or glow; zero fake statistics, calculators, or "demo data" badges.
- Accessibility: WCAG AA contrast (>= 4.5:1), 44px minimum touch targets (56px vendor console), visible focus rings, `prefers-reduced-motion`, `aria-live` status updates.
