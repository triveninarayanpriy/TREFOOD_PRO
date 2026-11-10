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

## Approved Technical & Budget Alignment (see `docs/DECISIONS.md`)
- Stack: React 19 + Vite + TypeScript (strict) + Tailwind CSS v4 + Lucide React + React Router + TanStack Query + Zod + Hono on Cloudflare Workers + Static Assets + D1 (Drizzle ORM).
- Performance & Hostel WiFi Budget: `< 150 KB` gzip initial JS bundle, skeleton loaders, offline-safe localStorage cart, short polling with ETags/backoff, zero heavy maps, lazy-loaded SVG/image food placeholders in `/public/images`.
- Layout: `src/client` (SPA), `src/worker` (API), `src/shared` (Zod schemas, types, pure curfew/ETA logic), `migrations` + `scripts/seed.sql`, `tests`, `e2e`, `docs`.
- Design Language: Brand maroon `#830020`, warm cream light surfaces, deep maroon-black dark surfaces, amber `#FFB400`/`#F2A900` CTAs, green veg/success, red non-veg/errors. Respects `prefers-color-scheme` with persisted manual toggle.
- Accessibility: WCAG AA contrast (>= 4.5:1), 44px minimum touch targets (56px vendor console), visible focus rings, `prefers-reduced-motion`, `aria-live` status updates.
