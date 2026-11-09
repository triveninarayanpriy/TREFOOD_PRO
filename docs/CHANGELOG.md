# Changelog

All notable changes to the TreFood prototype will be documented in this file.

## [Unreleased] - Day 1: Walking Skeleton & First Deploy

### Added
- Project scaffold with React 19, Vite, TypeScript strict, and Cloudflare Workers static assets integration.
- Edge API powered by Hono in `src/worker` with `/api/health` checking D1 database connectivity.
- Path aliases configured for `@client`, `@worker`, and `@shared`.
- Cloudflare D1 database `trefood-db` provisioned and bound to `wrangler.jsonc`.
- Tailwind CSS v4 and self-hosted variable fonts (`@fontsource-variable/inter`, `@fontsource-variable/plus-jakarta-sans`).
- Vitest worker integration test suite verifying health endpoint and D1 queries.
- Playwright end-to-end smoke test validating mobile (390x844) and desktop (1280x800) views.
- CI pipeline in `.github/workflows/ci.yml` and `.github/dependabot.yml`.
- Architectural decisions in `docs/DECISIONS.md`.
