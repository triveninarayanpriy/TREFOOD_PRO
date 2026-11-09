# TreFood Engineering & Product Roadmap

This document outlines the architectural roadmap for scaling TreFood from the current high-speed prototype to a multi-campus production deployment across Indian engineering institutes.

---

## Phase 1: Prototype Completion (Current Status - Delivered)
- [x] Single-worker Cloudflare Workers + Static Assets architecture.
- [x] React 19 + Tailwind v4 + TypeScript strict frontend under 150 kB gzip.
- [x] Cloudflare D1 SQLite database with full indexes and Drizzle migrations.
- [x] Pure domain services: curfew evaluation, server-side cart pricing, state machine, and handover code generation.
- [x] Zero-friction student customer app with live perforated `HandoverTicket` and ETag 304 polling.
- [x] Landscape vendor counter tablet console (`/v`) with 56px touch targets, Web Audio alerts, Wake Lock, and 58mm POS thermal printing.
- [x] Desktop campus administration portal (`/admin`) with SVG order analytics, curfew/festival controls, and mutation audit logs.
- [x] 100% test coverage: 21 Vitest integration tests + 8 Playwright E2E tests passing on desktop and mobile.

---

## Phase 2: Production Hardening (Q1 2027)
1. **Cloudflare Queues & WebSockets (Durable Objects)**:
   - Replace 4s client polling with Durable Object WebSockets for real-time order state broadcasts to vendor tablets and student phones.
   - Offload heavy notification workflows (SMS, WhatsApp, Email) to Cloudflare Queues with automatic exponential backoff retry.
2. **Payment Gateway Integration**:
   - Integrate Razorpay / Cashfree UPI Intent and Dynamic QR codes at the gate while preserving the default "Zero-fee Pay at Gate" model.
   - Implement automated daily vendor payout settlements via UPI AutoPay.
3. **Automated WhatsApp Bot Notifications**:
   - Send order confirmation and 4-digit verification code directly to student WhatsApp when status moves to `at_gate`.

---

## Phase 3: Multi-Campus Expansion (Q2 - Q3 2027)
1. **Multi-Tenant Campus Partitioning**:
   - Expand database schema with campus-level sharding or D1 multi-database routing.
   - Launch pilot instances for IIT Patna (Bihta), BIT Mesra, and NIT Jamshedpur.
2. **Dedicated Delivery Runner PWA (`/r`)**:
   - Dedicated lightweight mobile runner app for student delivery runners with turn-by-turn campus gate navigation and packet barcode scanning.
3. **Native Mobile Shells (Capacitor / React Native)**:
   - Package the ultra-lean React web app into iOS and Android binaries for the Google Play Store and Apple App Store with native push notifications.
