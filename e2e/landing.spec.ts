import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Public Landing Page (/), Legal Routes & SEO', () => {
  test('supports gate board selection, real NITP counters, onboarding D1 save, FAQ, and SEO', async ({ page }) => {
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

    // 2. Hero gate quick-pick & PacketChit 4821 visible
    const heroGateSelect = page.locator('#hero-gate-select');
    await expect(heroGateSelect).toBeVisible();
    await heroGateSelect.selectOption('gate_h5');
    await expect(page.locator('#hero-search-input')).toBeVisible();
    await expect(page.getByText('TF-4821')).toBeVisible();

    // 3. GateBoard & real NIT Patna counters (zero fictional vendors)
    await expect(page.getByRole('region', { name: /Campus gate departure board/i })).toBeVisible();
    await expect(page.getByText('Kolkata Biryani Fast-Food Pizza House').first()).toBeVisible();
    await expect(page.getByText('Chai Sutta Bar (CSB)').first()).toBeVisible();

    // 4. How an order actually goes (4 cropped real screenshots)
    const stepImgs = page.locator('#how-it-works img');
    expect(await stepImgs.count()).toBe(4);

    // 5. Night Safety verbatim quote visible
    await expect(page.getByText(/Campus Night Safety: After 7:00 PM, deliveries are handled personally/i)).toBeVisible();

    // 6. Vendor onboarding form persists into D1 via POST /api/vendor-applications
    await page.locator('#onboard-vendor-name').fill('NITP Midnight Chai Stall');
    await page.locator('#onboard-shop-type').selectOption('snacks');
    await page.locator('#onboard-vendor-phone').fill('9876543210');
    await page.getByRole('button', { name: /Submit onboarding request/i }).click();
    await expect(page.getByText('Application saved to D1!')).toBeVisible();

    // 7. Crisp 6-question hostel FAQ accordion
    const faqButtons = page.locator('#faq h3 button');
    expect(await faqButtons.count()).toBe(6);

    // 8. Install App modal fallback on desktop
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
    await page.evaluate(() =>
      Promise.allSettled(
        document
          .getAnimations()
          .filter((a) => a.effect?.getComputedTiming().iterations === 1)
          .map((a) => a.finished)
      )
    );
    const darkAxe = await new AxeBuilder({ page }).analyze();
    expect(
      darkAxe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    ).toEqual([]);

    // Switch back to light cleanly
    await page.getByRole('button', { name: /Switch to light theme/i }).click();

    // 10. Legal route renders verified policy badge + unique title
    await page.getByRole('link', { name: 'Terms', exact: true }).click();
    await expect(page).toHaveURL(/\/terms/);
    await expect(page).toHaveTitle(/Terms of Service \| TreFood NIT Patna/i);
    await expect(page.getByText('NIT PATNA CAMPUS POLICY')).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('renders cleanly with zero horizontal overflow at 320px, 768px, and 1440px and serves sitemap/robots', async ({
    page,
    request,
  }) => {
    for (const vp of [
      { width: 320, height: 640 },
      { width: 768, height: 1024 },
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
