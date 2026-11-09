# TreFood Prototype

> Hyperlocal campus delivery for NIT Patna. Students order food, fruits, groceries and raw chicken from campus vendors and collect at a hostel gate by matching a 4-digit code on the packet. Zero delivery fee, pay at the gate, curfew-aware.

*Note: All seeded and mock data in this repository is sample data used strictly for prototyping and testing purposes.*

## Architecture

The project runs on a unified Cloudflare Workers architecture serving both the Single-Page Application (SPA) client and the edge API backend.

```mermaid
flowchart TD
    User["Student / Vendor Browser"]
    
    subgraph Cloudflare["Cloudflare Global Network (Edge)"]
        Worker["Cloudflare Worker (Hono API)"]
        Assets["Static Assets (React 19 SPA)"]
        D1[("Cloudflare D1 (SQLite DB)")]
    end
    
    User -->|Static Assets: HTML/CSS/JS| Assets
    User -->|API Requests: /api/*| Worker
    Worker -->|Type-safe queries (Drizzle ORM)| D1
```

## Tech Stack

- **Edge Runtime & Hosting:** Cloudflare Workers + Cloudflare Static Assets (`wrangler.jsonc`)
- **API Framework:** [Hono](https://hono.dev/) with Zod validation
- **Frontend:** React 19, Vite, TypeScript strict, Tailwind CSS v4, React Router 7, TanStack Query
- **Database:** Cloudflare D1 (Serverless SQLite) with Drizzle ORM
- **Icons & Fonts:** Lucide React, Self-hosted Inter & Plus Jakarta Sans via `@fontsource-variable`
- **Testing:** Vitest with Workers pool, Playwright E2E, ESLint, Prettier

## Project Structure

```
├── docs/                # Architecture decisions, build kit, changelog
├── e2e/                 # Playwright end-to-end smoke & flow tests
├── migrations/          # D1 SQL migrations
├── scripts/             # Seed scripts and utilities
├── src/
│   ├── client/          # React 19 SPA (components, routes, hooks)
│   ├── worker/          # Hono API backend, DB schema & services
│   └── shared/          # Shared Zod schemas, types, constants
├── tests/               # Unit and worker integration tests
├── wrangler.jsonc       # Cloudflare Workers configuration
└── vite.config.ts       # Vite + Tailwind + Cloudflare plugin configuration
```

## Getting Started

### Prerequisites
- Node.js 22 LTS
- Cloudflare Wrangler CLI authenticated (`npx wrangler login`)

### Setup & Run Locally
```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Run typecheck & lint
npm run typecheck
npm run lint

# 4. Run tests
npm test
npm run test:e2e
```

## Useful Commands
- `npm run dev`: Start local dev server with Vite and Cloudflare Workers runtime
- `npm run build`: Build production assets
- `npm run typecheck`: Run TypeScript compiler check
- `npm run lint`: Lint code with ESLint
- `npm test`: Run Vitest worker integration tests
- `npm run test:e2e`: Run Playwright tests
- `npm run db:migrate:local`: Apply migrations to local D1
- `npm run db:migrate:remote`: Apply migrations to remote Cloudflare D1
- `npm run deploy`: Deploy Worker and static assets to Cloudflare
