# TreFood Prototype

> Hyperlocal campus delivery for NIT Patna. Students order food, fruits, groceries and raw chicken from campus vendors and collect at a hostel gate by matching a 4-digit code on the packet. Zero delivery fee, pay at the gate, curfew-aware.

**Live Edge Deployment**: [https://trefood-prototype.technicaltriveniyt.workers.dev](https://trefood-prototype.technicaltriveniyt.workers.dev)

> [!IMPORTANT]
> **SAMPLE DATA DISCLAIMER**: All seeded campus data, vendor profiles, menu items, prices, telephone numbers, and user records contained in this repository and deployment are purely synthetic **SAMPLE DATA** created exclusively for prototype demonstration, evaluation, and automated testing.

---

## Documentation Index

- [Interactive Demo & Evaluator Walkthrough](docs/DEMO.md)
- [System Architecture & State Machine Specification](docs/ARCHITECTURE.md)
- [Quality, Performance & Hardening Report](docs/QUALITY.md)
- [Security Threat Model & Cryptographic Verification](docs/SECURITY.md)
- [API Reference & OpenAPI Specifications](docs/API.md)
- [Engineering Decisions Record (ADR)](docs/DECISIONS.md)
- [Post-Prototype Product Roadmap](docs/ROADMAP.md)
- [Project Changelog](docs/CHANGELOG.md)

---

## Tech Stack

- **Edge Runtime & Hosting:** Cloudflare Workers + Cloudflare Static Assets (`wrangler.jsonc`)
- **API Framework:** [Hono](https://hono.dev/) with strict Zod validation
- **Frontend:** React 19, Vite, TypeScript strict, Tailwind CSS v4, React Router 7, TanStack Query
- **Database:** Cloudflare D1 (Serverless SQLite at the Edge) with Drizzle ORM
- **Icons & Fonts:** Lucide React, Self-hosted Inter & Plus Jakarta Sans via `@fontsource-variable`
- **Testing:** Vitest with `@cloudflare/vitest-pool-workers`, Playwright E2E, axe-core

---

## 1-Tap Demo Accounts (DEMO_MODE)

In `DEMO_MODE=true`, each interface provides a one-tap login button for instant reviewer access:

| Role | Demo Email | Access URL | Features |
| :--- | :--- | :--- | :--- |
| **Student** | `student@demo.trefood.test` | `/` and `/browse` | Browse menus, gate selection, cart quote, live `HandoverTicket`, order confirmation |
| **Vendor** | `vendor@demo.trefood.test` | `/v` | 4-column kitchen tablet board, 56px touch targets, sound chimes, POS receipt printing, stock toggles |
| **Admin** | `admin@demo.trefood.test` | `/admin` | Metrics overview, SVG orders chart, gate curfews, festival emergency overrides, force cancellation |

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
