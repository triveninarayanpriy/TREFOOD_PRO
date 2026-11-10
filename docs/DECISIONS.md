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
- **Warm Cream + Deep Maroon-Black Tokens:** Light theme uses warm cream surfaces (`#FAF7F2`) paired with `#830020` maroon and `#FFB400` primary CTA buttons; dark theme uses deep maroon-black surfaces (`#0F0608` / `#180B0E`) with WCAG AA >= 4.5:1 foreground contrast across all token pairs.

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
| `@fontsource-variable/inter` | Self-hosted clean UI variable font family for performance and privacy. |
| `@fontsource-variable/plus-jakarta-sans` | Self-hosted display variable font family for headers and branding. |
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
| `@axe-core/playwright` | Dev-only automated WCAG AA & contrast auditing inside Playwright E2E tests (0 bytes in client bundle). |
