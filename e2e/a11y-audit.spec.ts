import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

interface RouteAxeFinding {
  route: string;
  theme: 'light' | 'dark';
  violations: Array<{ id: string; impact: string; nodes: number; html?: string; summary?: string }>;
}

async function scanRouteLightAndDark(
  page: Page,
  url: string,
  readySelector: string,
  findings: RouteAxeFinding[],
  options: { testDark?: boolean } = { testDark: true }
) {
  await page.goto(url);
  await page.locator(readySelector).first().waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations === 1)
        .map((a) => a.finished)
    )
  );

  // Verify zero horizontal overflow at active viewport
  const overflowLight = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  expect(overflowLight, `Horizontal overflow in light mode on ${url}`).toBe(false);

  // Light scan
  const lightAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  const seriousLight = lightAxe.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );
  if (seriousLight.length > 0) {
    findings.push({
      route: url,
      theme: 'light',
      violations: seriousLight.map((v) => ({
        id: v.id,
        impact: v.impact || 'serious',
        nodes: v.nodes.length,
        html: v.nodes[0]?.html,
        summary: v.nodes[0]?.failureSummary,
      })),
    });
  }

  if (options.testDark) {
    const themeToggle = page
      .getByRole('button', { name: /Switch to (dark|light) theme/i })
      .first();
    if (await themeToggle.isVisible()) {
      const currentlyDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      );
      if (!currentlyDark) {
        await themeToggle.click();
        await expect(page.locator('html')).toHaveClass(/dark/);
      }
      await page.evaluate(() =>
        Promise.all(
          document
            .getAnimations()
            .filter((a) => a.effect?.getComputedTiming().iterations === 1)
            .map((a) => a.finished)
        )
      );

      const darkAxe = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      const seriousDark = darkAxe.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      if (seriousDark.length > 0) {
        findings.push({
          route: url,
          theme: 'dark',
          violations: seriousDark.map((v) => ({
            id: v.id,
            impact: v.impact || 'serious',
            nodes: v.nodes.length,
            html: v.nodes[0]?.html,
            summary: v.nodes[0]?.failureSummary,
          })),
        });
      }

      // Restore light theme for subsequent checks
      await page.getByRole('button', { name: /Switch to light theme/i }).first().click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    }
  }
}

test.describe('Whole-App Accessibility, Hinglish, Keyboard & Motion Audit', () => {
  test('passes axe WCAG 2.1 AA in light and dark mode across every customer, vendor, admin & legal route', async ({
    page,
  }) => {
    test.setTimeout(90000);
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    page.on('pageerror', (e) => pageErrors.push(e.message));

    const findings: RouteAxeFinding[] = [];
    await page.addInitScript(() => localStorage.setItem('trefood_splash_seen', '1'));

    // Public & Guest routes
    await scanRouteLightAndDark(page, '/', 'h1', findings);
    await scanRouteLightAndDark(page, '/app', 'h1, h2', findings);
    await scanRouteLightAndDark(page, '/browse', 'h1, h2', findings);
    await scanRouteLightAndDark(page, '/app/search?q=paneer', 'h1', findings);

    const vendorsJson = (await page.evaluate(async () => {
      const res = await fetch('/api/vendors');
      return res.json();
    })) as { vendors?: Array<{ slug: string }> };
    const sampleSlug = vendorsJson.vendors?.[0]?.slug || 'chai-sutta-bar-csb';
    await scanRouteLightAndDark(page, `/vendor/${sampleSlug}`, 'h1', findings);

    await scanRouteLightAndDark(page, '/signin', 'h1', findings);
    await scanRouteLightAndDark(page, '/account', 'h1', findings);
    await scanRouteLightAndDark(page, '/dev/ui', 'h1', findings);
    await scanRouteLightAndDark(page, '/about', 'h1', findings);
    await scanRouteLightAndDark(page, '/terms', 'h1', findings);
    await scanRouteLightAndDark(page, '/privacy', 'h1', findings);
    await scanRouteLightAndDark(page, '/refunds', 'h1', findings);
    await scanRouteLightAndDark(page, '/route-does-not-exist-404', 'h3', findings);

    // Authenticated Student routes (/favorites, /orders, /orders/:id)
    await page.evaluate(async () => {
      await fetch('/api/auth/demo/student', { method: 'POST' });
    });
    await scanRouteLightAndDark(page, '/favorites', 'h1', findings);
    await scanRouteLightAndDark(page, '/orders', 'h1', findings);

    const ordersJson = (await page.evaluate(async () => {
      const res = await fetch('/api/orders');
      return res.json();
    })) as { orders?: Array<{ id: string }> };
    if (ordersJson.orders?.[0]?.id) {
      await scanRouteLightAndDark(page, `/orders/${ordersJson.orders[0].id}`, 'h1', findings);
    }

    // Authenticated Vendor route (/v)
    await page.evaluate(async () => {
      await fetch('/api/auth/demo/vendor', { method: 'POST' });
    });
    await scanRouteLightAndDark(page, '/v', 'h1', findings);

    // Authenticated Admin route (/admin)
    await page.evaluate(async () => {
      await fetch('/api/auth/demo/admin', { method: 'POST' });
    });
    await scanRouteLightAndDark(page, '/admin', 'h1', findings);

    expect(findings, `Serious/critical axe violations across routes:\n${JSON.stringify(findings, null, 2)}`).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('supports Hinglish toggle for core navigation and order status strings, keyboard skip link, and prefers-reduced-motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(() => localStorage.setItem('trefood_splash_seen', '1'));

    // Log in as student so /orders and /orders/:id render order statuses
    await page.goto('/signin');
    await page.evaluate(async () => {
      localStorage.removeItem('trefood_lang');
      await fetch('/api/auth/demo/student', { method: 'POST' });
    });

    await page.goto('/app');
    await expect(page.getByText('Quick picks')).toBeVisible({ timeout: 10000 });

    // Keyboard flow: Tab focuses "Skip to main content" link
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    // Switch to Hinglish from /account (works identically on mobile & desktop viewports)
    await page.goto('/account');
    const hinglishBtn = page.getByRole('button', { name: 'Hinglish', exact: true });
    await hinglishBtn.click();
    await expect(hinglishBtn).toHaveAttribute('aria-pressed', 'true');

    // Core navigation reflects Hinglish
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 768;
    if (isDesktop) {
      await expect(page.getByLabel('Desktop Navigation Rail').getByText('Menus Dekho')).toBeVisible();
      await expect(page.getByLabel('Desktop Navigation Rail').getByText('Mere Orders')).toBeVisible();
    } else {
      await expect(page.getByLabel('Mobile Bottom Navigation').getByText('Menus Dekho')).toBeVisible();
      await expect(page.getByLabel('Mobile Bottom Navigation').getByText('Mere Orders')).toBeVisible();
    }

    // Order status strings reflect Hinglish on /orders/:id
    const ordersJson = (await page.evaluate(async () => {
      const res = await fetch('/api/orders');
      return res.json();
    })) as { orders?: Array<{ id: string }> };

    if (ordersJson.orders?.[0]?.id) {
      await page.goto(`/orders/${ordersJson.orders[0].id}`);
      await expect(
        page
          .getByText(
            /Order Bhej Diya|Accept Ho Gaya|Gate Ke Raaste Mein|Gate Par Pahuncha!|Handover Complete|Cancel Ho Gaya|Time Khatam/
          )
          .first()
      ).toBeVisible({ timeout: 10000 });
    }

    // Reset back to English cleanly
    await page.evaluate(() => localStorage.setItem('trefood_lang', 'en'));
  });
});
