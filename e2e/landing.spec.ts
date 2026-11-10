import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Public Landing Page (/), Legal Routes & SEO', () => {
  test('supports guest exploration, curfew mini-demo, vendor onboarding D1 save, FAQ, and SEO', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/');

    // 1. SEO meta, Open Graph, Twitter cards, JSON-LD
    await expect(page).toHaveTitle(/TreFood \| NIT Patna/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /NIT Patna/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /TreFood/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    const jsonLdCount = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonLdCount).toBeGreaterThanOrEqual(1);
    const jsonLdText = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(jsonLdText).toContain('Organization');
    expect(jsonLdText).toContain('LocalBusiness');

    // 2. Hero guest gate picker & search box work with no sign-in
    const heroGateSelect = page.locator('#hero-gate-select');
    await expect(heroGateSelect).toBeVisible();
    await heroGateSelect.selectOption('gate_h5');
    await expect(page.locator('#hero-search-input')).toBeVisible();

    // 3. Live stat strip fed from API + demo label
    await expect(page.getByText('Live API • Demo Campus Data')).toBeVisible();
    await expect(page.getByText('Vendors Open Now')).toBeVisible();

    // 4. Interactive 4-step How it works
    await page.getByRole('button', { name: /04.*Match 4-digit packet code/i }).click();
    await expect(page.getByText('4 / 4')).toBeVisible();

    // 5. Interactive curfew mini-demo (pick Boys Hostel @ 19:20 -> refused too_late; switch to Main Gate -> orderable)
    const demoGate = page.locator('#demo-gate-select');
    await demoGate.selectOption('gate_h5');
    await page.getByRole('button', { name: '7:20 PM' }).click();
    await expect(page.getByText(/Refused for Boys Hostel Gate \(too_late\)/i)).toBeVisible();
    await page.getByRole('button', { name: /Switch to Main Gate/i }).click();
    await expect(page.getByText(/Orderable to Main Gate/i)).toBeVisible();

    // 6. Vendor onboarding form persists into D1 via POST /api/vendor-applications
    await page.locator('#onboard-vendor-name').fill('NITP Midnight Chai Stall');
    await page.locator('#onboard-shop-type').selectOption('snacks');
    await page.locator('#onboard-vendor-phone').fill('9876543210');
    await page.getByRole('button', { name: /Submit Onboarding Request/i }).click();
    await expect(page.getByText('Application saved to D1!')).toBeVisible();

    // 7. Sample testimonials label & 11+ FAQ items
    await expect(page.getByText('Sample Testimonials (Demo Data)')).toBeVisible();
    const faqButtons = page.locator('#faq h3 button');
    expect(await faqButtons.count()).toBeGreaterThanOrEqual(10);

    // 8. Install App modal fallback works cleanly
    const isDesktop = (page.viewportSize()?.width ?? 0) >= 1024;
    if (isDesktop) {
      await page.getByRole('button', { name: /Install App/i }).first().click();
      await expect(page.getByRole('heading', { name: 'Install TreFood App' })).toBeVisible();
      await page.getByRole('button', { name: 'Got It' }).click();
    }

    // 9. Axe-core accessibility scan on Light & Dark Landing Page
    const lightAxe = await new AxeBuilder({ page }).analyze();
    expect(
      lightAxe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    ).toEqual([]);

    await page.getByRole('button', { name: /Switch to dark theme/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    const darkAxe = await new AxeBuilder({ page }).analyze();
    expect(
      darkAxe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    ).toEqual([]);

    // Switch back to light cleanly
    await page.getByRole('button', { name: /Switch to light theme/i }).click();

    // 10. Legal route renders draft placeholder disclaimer + unique title
    await page.getByRole('link', { name: 'Terms', exact: true }).click();
    await expect(page).toHaveURL(/\/terms/);
    await expect(page).toHaveTitle(/Terms of Service \(Draft\)/i);
    await expect(page.getByText('DRAFT — PROTOTYPE PLACEHOLDER TEXT')).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('renders cleanly with zero horizontal overflow at 320px and 1440px and serves sitemap/robots', async ({
    page,
    request,
  }) => {
    for (const vp of [
      { width: 320, height: 640 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.innerWidth);
    }

    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('/refunds');

    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain('Sitemap:');
  });
});
