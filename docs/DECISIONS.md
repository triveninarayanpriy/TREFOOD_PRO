# Architecture & Dependency Decisions

This document records architectural choices and the rationale for every dependency added to the TreFood prototype.

## Core Stack Choices

- **Cloudflare Workers + Static Assets:** Unified single-deployment fullstack model without maintaining separate hosting or coordination between SPA and API.
- **Hono:** Ultra-lightweight web standards API framework designed for Cloudflare Workers with first-class TypeScript and Zod validation support.
- **React 19 & Vite:** Modern declarative UI library with fast bundling, native ESM support, and integration with `@cloudflare/vite-plugin`.
- **Tailwind CSS v4:** High-performance, zero-config CSS framework using modern browser primitives without legacy PostCSS build chains.
- **D1 + Drizzle ORM:** Native edge SQLite database with zero-latency worker bindings, typed queries, and lightweight migrations.
- **Zod:** Runtime schema validation shared between client and worker to guarantee end-to-end type safety.

## Incremental Prototype Upgrade Decisions (Nov 10, 2026)

- **Preserve Lean React 19 + CSS Transitions Stack (A1 & A2):** Rather than adding `framer-motion` or splitting existing `/src/client` and `/migrations` folders, we evolve the existing Cloudflare Worker + D1 + React 19 SPA incrementally. Using CSS variables and `prefers-reduced-motion` preserves our `< 150 KB` gzip initial JS budget (`~146 KB`) and instant hostel WiFi loads.
- **24x7 Gates, 19:30 Hostel Curfew & Night Safety (A3):** Added `is_24x7` boolean to `gates` (`Main Gate / Academic Blocks`) and `night_safe` boolean to `vendors` via D1 migration `0001_gate_24x7_night_safe.sql`, updating Boys Hostel & Girls Hostel gate curfews to `19:30` with a `15m` arrival buffer and surfacing Campus Night Safety after `19:00 IST`.
- **Warm Cream + Deep Maroon-Black Tokens (Legacy)** -> **Superseded by R2 Gate Board & Packet Chit Art Direction (Nov 11, 2026):** Default warm paper `#FBF6EE` + ink `#1C1210` with `#830020` maroon brand, `#B5651D` chai brown accents, and `#FFB400` single primary CTA; derived warm ink dark mode (`#140D0B` / `#1E1412`) opt-in only.
- **Self-Hosted R2 Typography (`Fraunces`, `DM Sans`, `Caveat`, `Noto Sans Devanagari` pinned `5.3.0`):** Switched from Inter / Plus Jakarta Sans to `Fraunces` (display), `DM Sans` (body), `Noto Sans Devanagari` (Hindi/Hinglish Unicode subset), and `Caveat` (strictly 4-digit handover codes and packet chit notes), using `.woff2` subset `@font-face` declarations to preserve `< 150 KB` gzip JS budget.

## Dependency Registry

| Package | Reason |
| :--- | :--- |
| `react` | Declarative UI framework for the client SPA. |
| `react-dom` | DOM renderer for React. |
| `react-router-dom` | Client-side routing for SPA views and deep linking. |
| `@tanstack/react-query` | Server-state caching, automatic refetching, and background polling. |
| `hono` | Edge-native, lightweight HTTP framework for Worker API endpoints. |
| `zod` | Shared runtime schema validation for request/response payloads. |
| `drizzle-orm` | TypeScript ORM for type-safe Cloudflare D1 SQL queries. |
| `lucide-react` | Unified, lightweight SVG icon system (no emoji in UI chrome). |
| `@fontsource-variable/fraunces` (`5.3.0`) | Self-hosted serif display variable font for Gate Board headings. |
| `@fontsource-variable/dm-sans` (`5.3.0`) | Self-hosted body & UI variable font paired with Fraunces. |
| `@fontsource-variable/caveat` (`5.3.0`) | Handwriting font strictly scoped to 4-digit packet chit codes & slip annotations. |
| `@fontsource/noto-sans-devanagari` (`5.3.0`) | Devanagari script support for Hinglish/Hindi campus labels & notices. |
| `@cloudflare/vite-plugin` | Vite integration for local Workers runtime emulation and static asset bundling. |
| `@cloudflare/workers-types` | TypeScript definitions for Cloudflare Workers runtime APIs. |
| `@cloudflare/vitest-pool-workers` | Runs Vitest tests inside the Miniflare / workerd runtime with real bindings. |
| `drizzle-kit` | Schema management and SQL migration generation tool for Drizzle ORM. |
| `vite` | Next-generation frontend tooling and development server. |
| `@vitejs/plugin-react` | Vite plugin for React JSX transforms and Fast Refresh. |
| `@tailwindcss/vite` | Official Vite plugin for Tailwind CSS v4. |
| `tailwindcss` | Utility-first CSS styling framework. |
| `typescript` | Static type checking for client, worker, and shared code. |
| `eslint` | Code quality and syntax checking. |
| `prettier` | Code formatting consistency across all project files. |
| `eslint-config-prettier` | Disables ESLint formatting rules that conflict with Prettier. |
| `typescript-eslint` | ESLint tooling and parser for TypeScript. |
| `@playwright/test` | End-to-end browser automation for mobile (390x844) and desktop (1280x800). |
| `wrangler` | Cloudflare developer platform CLI for local simulation, D1, and deployments. |
| `i18next` | Internationalization framework for multi-language support (English and Hindi). |
| `react-i18next` | React integration hooks and components for i18next. |
| `zustand` (`5.1.0`) | Tiny persisted client cart store (`~1.2 KB` gzip) for offline-safe cart, coupons, and checkout preferences. |
| `@axe-core/playwright` | Dev-only automated WCAG AA & contrast auditing inside Playwright E2E tests (0 bytes in client bundle). |
| `sharp` (`0.35.5`, devOnly) | Offline/pre-build responsive image processor generating 320/640/960/1440w AVIF & WebP derivatives, 21:9/4:3/1:1 crops, and dominant-color metadata (0 bytes in Worker/client bundles). |
