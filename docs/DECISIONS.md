# Architecture & Dependency Decisions

This document records architectural choices and the rationale for every dependency added to the TreFood prototype.

## Core Stack Choices

- **Cloudflare Workers + Static Assets:** Unified single-deployment fullstack model without maintaining separate hosting or coordination between SPA and API.
- **Hono:** Ultra-lightweight web standards API framework designed for Cloudflare Workers with first-class TypeScript and Zod validation support.
- **React 19 & Vite:** Modern declarative UI library with fast bundling, native ESM support, and integration with `@cloudflare/vite-plugin`.
- **Tailwind CSS v4:** High-performance, zero-config CSS framework using modern browser primitives without legacy PostCSS build chains.
- **D1 + Drizzle ORM:** Native edge SQLite database with zero-latency worker bindings, typed queries, and lightweight migrations.
- **Zod:** Runtime schema validation shared between client and worker to guarantee end-to-end type safety.

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
