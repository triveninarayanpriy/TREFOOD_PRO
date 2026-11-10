import { Link } from 'react-router-dom';
import { SeoHead } from '../components/seo/SeoHead';
import { ShieldCheck, ArrowLeft, AlertCircle } from 'lucide-react';

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
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-[#830020] hover:bg-[var(--color-surface)] dark:text-[#FFB400]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Home</span>
        </Link>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-bold text-[#78350F] dark:bg-[#331F04] dark:text-[#FDE68A]">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          DRAFT — PROTOTYPE PLACEHOLDER TEXT
        </span>
      </div>

      <article className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8 shadow-xs space-y-6">
        <header className="border-b border-[var(--color-border)] pb-5 space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[var(--color-text)]">
            {title}
          </h1>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">
            Last updated: {updatedAt} • Status: Draft placeholder for NIT Patna TreFood Prototype
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
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Questions? Contact support@trefood.in
          </span>
          <div className="flex flex-wrap gap-3 font-semibold">
            <Link to="/about" className="hover:underline">About</Link>
            <Link to="/terms" className="hover:underline">Terms</Link>
            <Link to="/privacy" className="hover:underline">Privacy</Link>
            <Link to="/refunds" className="hover:underline">Refunds</Link>
          </div>
        </footer>
      </article>
    </div>
  );
}

export function AboutPage() {
  return (
    <LegalDocLayout
      title="About TreFood (NIT Patna Prototype)"
      seoTitle="About TreFood | NIT Patna Hyperlocal Campus Delivery"
      description="Learn how TreFood connects NIT Patna students with campus canteens, fruit stalls, groceries, and raw chicken counters via hostel gate verification."
      path="/about"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Built Exclusively for Campus Hostels',
          body: 'Draft overview: TreFood is a hyperlocal campus delivery prototype engineered for NIT Patna. Instead of external riders and surge pricing, verified campus canteens and shops batch orders directly to Main Gate / Academic Blocks (24x7) and Boys/Girls Hostel Gates (before 19:30 IST curfew).',
        },
        {
          heading: '2. Zero Delivery Fee & Pay-at-Gate Trust',
          body: 'Students never pay platform delivery markups. You browse freely without signing in, inspect your sealed packet at the gate, match the 4-digit handover code on your screen, and pay directly via cash or UPI at handover.',
        },
        {
          heading: '3. Campus Night Safety Standard',
          body: 'After 19:00 IST (7:00 PM), campus deliveries are handled personally by the shop owner, co-owner, or designated senior counter staff—not anonymous gig couriers.',
        },
        {
          heading: '4. Sample Data Notice',
          body: 'All vendor menus, historical order counts, testimonials, and demo accounts currently seeded in this prototype are synthetic sample data created strictly for evaluation and testing.',
        },
      ]}
    />
  );
}

export function TermsPage() {
  return (
    <LegalDocLayout
      title="Terms of Service (Draft)"
      seoTitle="Terms of Service (Draft) | TreFood NIT Patna"
      description="Draft prototype Terms of Service for TreFood hyperlocal campus delivery at NIT Patna."
      path="/terms"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Prototype & Sample Data Disclaimer',
          body: 'DRAFT PLACEHOLDER: These Terms of Service apply to evaluation usage of the TreFood NIT Patna prototype. Listed canteens, prices, and telephone numbers in seeded environments are sample records.',
        },
        {
          heading: '2. Eligibility & Campus Email Verification',
          body: 'Guest users may browse all vendor menus without registration. Placing an order requires verifying a valid campus email domain (@nitp.ac.in) or using an enabled evaluation demo profile.',
        },
        {
          heading: '3. Gate Curfew & Order Acceptance',
          body: 'Orders placed after an applicable hostel gate curfew window (e.g., 19:30 IST with 15-minute arrival buffer for Boys Hostel and Girls Hostel gates) are declined with an explanation and suggested open gates such as Main Gate / Academic Blocks (24x7). Unaccepted vendor orders expire automatically after 5 minutes.',
        },
        {
          heading: '4. 4-Digit Packet Handover Code',
          body: 'Students must verify the 4-digit code printed on the sealed packet before confirming delivery. Up to 5 verification attempts are allowed before counter assist is required.',
        },
      ]}
    />
  );
}

export function PrivacyPage() {
  return (
    <LegalDocLayout
      title="Privacy Policy (Draft)"
      seoTitle="Privacy Policy (Draft) | TreFood NIT Patna"
      description="Draft prototype Privacy Policy detailing minimal data collection, session cookies, and instant account deletion."
      path="/privacy"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Minimal Campus Data Collected',
          body: 'DRAFT PLACEHOLDER: TreFood stores only the minimum information required to coordinate gate deliveries: your verified campus email, display name, selected delivery gate, and order history.',
        },
        {
          heading: '2. Local Preferences & Session Security',
          body: 'Theme preferences, selected hostel gate, and offline cart items are kept locally in your browser. Authentication relies strictly on HttpOnly, SameSite=Lax, SHA-256 hashed session cookies—never third-party ad trackers.',
        },
        {
          heading: '3. Vendor Onboarding Submissions',
          body: 'Shop details submitted via the For Vendors onboarding form (shop name, category, and mobile number) are persisted securely in Cloudflare D1 solely for campus vendor review.',
        },
        {
          heading: '4. Instant Account Deletion',
          body: 'Authenticated students can permanently anonymize their account and purge active sessions anytime from the Account & Settings page (/account).',
        },
      ]}
    />
  );
}

export function RefundsPage() {
  return (
    <LegalDocLayout
      title="Refund & Issue Resolution Policy (Draft)"
      seoTitle="Refund Policy (Draft) | TreFood NIT Patna"
      description="Draft prototype Refund and Issue Resolution Policy for TreFood NIT Patna gate deliveries."
      path="/refunds"
      updatedAt="November 2026"
      sections={[
        {
          heading: '1. Pay-at-Gate Inspection Protection',
          body: 'DRAFT PLACEHOLDER: Because TreFood defaults to Pay at Gate (Cash or UPI on handover), you only pay once your sealed packet reaches the hostel gate and the 4-digit verification code matches your phone.',
        },
        {
          heading: '2. Reporting Missing, Wrong, or Quality Issues',
          body: 'If an item is missing, spilled, wrong, or delayed after delivery confirmation, open your order in /orders and submit an issue report with reason and details. Campus administrators review disputes in the Admin Reports queue.',
        },
        {
          heading: '3. Credits & Refunds',
          body: 'Approved claims receive either instant vendor replacement to the gate or a recorded credit/refund adjustment in the admin settlement ledger within 24 hours.',
        },
        {
          heading: '4. Cancellations Before Preparation',
          body: 'Students may cancel an order free of charge while its status remains "placed". Once accepted for kitchen preparation or auto-expired after curfew, no fee is owed.',
        },
      ]}
    />
  );
}
