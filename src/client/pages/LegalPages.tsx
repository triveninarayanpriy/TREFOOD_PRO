import { Link } from 'react-router-dom';
import { SeoHead } from '../components/seo/SeoHead';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

interface LegalDocLayoutProps {
  title: string;
  seoTitle: string;
  description: string;
  path: string;
  updatedAt: string;
  sections: Array<{ heading: string; body: string }>;
}

function LegalDocLayout({
  title,
  seoTitle,
  description,
  path,
  updatedAt,
  sections,
}: LegalDocLayoutProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12 space-y-6">
      <SeoHead title={seoTitle} description={description} path={path} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#830020] hover:bg-[var(--color-surface)] dark:text-[#FFB400] focus:outline-none focus:ring-2 focus:ring-[#FFB400]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#78350F] dark:bg-[#331F04] dark:text-[#FDE68A]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          NIT PATNA CAMPUS POLICY
        </span>
      </div>

      <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-[var(--shadow-card)] space-y-6">
        <header className="border-b border-[var(--color-border)] pb-5 space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            {title}
          </h1>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">
            Effective: {updatedAt} • TreFood NIT Patna Hyperlocal Delivery Operating Rules
          </p>
        </header>

        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.heading} className="space-y-1.5">
              <h2 className="text-base font-bold text-[var(--color-text)]">{section.heading}</h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{section.body}</p>
            </section>
          ))}
        </div>

        <footer className="border-t border-[var(--color-border)] pt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            Questions? Contact support@trefood.in
          </span>
          <div className="flex flex-wrap gap-3 font-semibold">
            <Link to="/about" className="inline-flex min-h-[44px] items-center hover:underline">About</Link>
            <Link to="/terms" className="inline-flex min-h-[44px] items-center hover:underline">Terms</Link>
            <Link to="/privacy" className="inline-flex min-h-[44px] items-center hover:underline">Privacy</Link>
            <Link to="/refunds" className="inline-flex min-h-[44px] items-center hover:underline">Refunds</Link>
          </div>
        </footer>
      </article>
    </div>
  );
}

export function AboutPage() {
  return (
    <LegalDocLayout
      title="About TreFood (NIT Patna)"
      seoTitle="About TreFood | NIT Patna Hyperlocal Campus Delivery"
      description="Learn how TreFood connects NIT Patna students with campus canteens, fruit stalls, groceries, and raw chicken counters via hostel gate verification."
      path="/about"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Built Exclusively for Campus Hostels',
          body: 'TreFood is a hyperlocal campus delivery platform built for NIT Patna. Instead of external riders and surge pricing, verified campus canteens and shops batch orders directly to Main Gate / Academic Blocks (24x7) and Boys or Girls Hostel Gates (before the 19:30 IST curfew).',
        },
        {
          heading: '2. Zero Delivery Fee & Pay-at-Gate Trust',
          body: 'Students never pay platform delivery fees. You can browse all campus menus freely without signing in, inspect your sealed packet at the gate, match the 4-digit handover code on your phone, and pay directly via cash or UPI at handover.',
        },
        {
          heading: '3. Campus Night Safety Standard',
          body: 'After 19:00 IST (7:00 PM), campus deliveries are handled personally by the shop owner, co-owner, or designated senior counter staff—not anonymous third-party couriers.',
        },
        {
          heading: '4. Prototype Seed Data Transparency',
          body: 'All pre-seeded campus vendor listings, telephone numbers, order metrics, and evaluation accounts in this deployment are clearly labelled sample data for demonstration and testing.',
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalDocLayout
      title="Terms of Service"
      seoTitle="Terms of Service | TreFood NIT Patna"
      description="Operating terms and gate handover rules for TreFood hyperlocal campus delivery at NIT Patna."
      path="/terms"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Scope & Campus Service Availability',
          body: 'TreFood facilitates zero-fee food, fruit, vegetable, grocery, and sealed poultry orders between NIT Patna campus counters and designated campus gates. Pre-seeded catalog records in this environment are sample demonstration data.',
        },
        {
          heading: '2. Eligibility & Campus Email Verification',
          body: 'Guests may browse all vendor menus, filter by gate, and inspect prices without registration. Placing an order or saving favourites requires signing in with an @nitp.ac.in email or an active evaluation account.',
        },
        {
          heading: '3. Gate Curfew & Order Acceptance Window',
          body: 'Orders scheduled after a hostel gate curfew (19:30 IST minus prep time, walk time, and a 15-minute gate handover buffer for Boys Hostel and Girls Hostel gates) are declined with the exact cutoff time and suggested 24x7 gates such as Main Gate / Academic Blocks. Orders unaccepted by the vendor counter within 5 minutes expire automatically.',
        },
        {
          heading: '4. 4-Digit Packet Handover Code',
          body: 'Every accepted order carries a unique 4-digit handover code written on the sealed packet. Students match the packet digits in the tracker before confirming delivery. Five consecutive mismatched entries lock self-confirmation and route the order to vendor counter handover assist.',
        },
      ]}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalDocLayout
      title="Privacy Policy"
      seoTitle="Privacy Policy | TreFood NIT Patna"
      description="Privacy standards for TreFood NIT Patna covering minimal session storage, zero-PII funnel telemetry, and instant account deletion."
      path="/privacy"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Minimal Campus Data Collected',
          body: 'TreFood stores only the information needed to fulfill gate deliveries: your verified campus email, display name, preferred delivery gate, and order history.',
        },
        {
          heading: '2. Privacy-Friendly Funnel Observability',
          body: 'Core ordering funnel metrics (menu viewed, item added to cart, checkout started, order placed, handover confirmed) record only event type, route path, gate ID, and vendor ID—never names, email addresses, phone numbers, or IP identifiers—and honor browser Do Not Track and Global Privacy Control signals.',
        },
        {
          heading: '3. Local Storage & Session Security',
          body: 'Theme preference, Hinglish/Hindi language selection, chosen hostel gate, and offline cart backups live locally in your browser. Authentication relies exclusively on HttpOnly, SameSite=Lax, SHA-256 hashed session cookies backed by Cloudflare Workers KV.',
        },
        {
          heading: '4. Instant Account Deletion',
          body: 'Authenticated students can permanently anonymize their profile, revoke active sessions, and clear personal identifiers anytime from Account & Settings (/account).',
        },
      ]}
    />
  );
}

export function RefundsPage() {
  return (
    <LegalDocLayout
      title="Refund & Issue Resolution Policy"
      seoTitle="Refund Policy | TreFood NIT Patna"
      description="Pay-at-gate inspection protection, cancellations, and admin dispute credit rules for TreFood NIT Patna."
      path="/refunds"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Pay-at-Gate Inspection Protection',
          body: 'Because TreFood defaults to Pay at Gate via Cash or UPI upon handover, you pay only after your sealed packet reaches the hostel gate and the 4-digit verification code matches your order tracker.',
        },
        {
          heading: '2. Reporting Missing, Wrong, or Quality Issues',
          body: 'If an item is missing, spilled, wrong, or significantly delayed after handover, submit an issue report from the order detail screen (/orders/:id). Campus administrators review every ticket in the Admin Reports queue.',
        },
        {
          heading: '3. Credits & Settlements',
          body: 'Verified claims receive either an immediate replacement dispatched to the gate or a recorded refund/credit entry in the vendor settlement ledger within 24 hours.',
        },
        {
          heading: '4. Free Cancellation Before Preparation',
          body: 'Students can cancel any order with zero penalty while status remains placed. If an order is cancelled or auto-expired after the 5-minute acceptance timeout, no payment is collected.',
        },
      ]}
    />
  );
}
