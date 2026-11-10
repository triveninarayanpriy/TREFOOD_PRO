import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Admin Console (/admin desktop-first operations)', () => {
  test('enforces role guard UI for students and runs full desktop admin workflows cleanly', async ({
    browser,
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const ts1400Ist = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString();

    // 1. Role guard check: Student cannot use /admin or call admin API
    const studentCtx = await browser.newContext();
    await studentCtx.setExtraHTTPHeaders({ 'x-mock-time': ts1400Ist });
    const sPage = await studentCtx.newPage();
    try {
      await sPage.goto('/signin');
      await sPage.getByRole('button', { name: /Continue as Student/i }).click();
      await expect(sPage).not.toHaveURL(/\/signin/, { timeout: 10000 });
      await sPage.goto('/admin');
      await expect(sPage.getByText('TreFood Admin Access Only')).toBeVisible({ timeout: 10000 });
      await expect(sPage.getByText(/Signed in as "student"/i)).toBeVisible({ timeout: 10000 });
      const studentApiStatus = await sPage.evaluate(async () => {
        const res = await fetch('/api/admin/metrics');
        return res.status;
      });
      expect(studentApiStatus).toBe(403);
    } finally {
      await studentCtx.close();
    }

    // 2. Desktop Admin view (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ 'x-mock-time': ts1400Ist });

    // Submit a sample onboarding application first so onboarding approval has a fresh item
    const uniqueVendorName = `Patliputra Juices ${Date.now().toString().slice(-4)}`;
    await page.goto('/');
    await page.evaluate(async (name) => {
      await fetch('/api/vendor-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorName: name, shopType: 'fruits', phone: '9876543219' }),
      });
    }, uniqueVendorName);

    await page.goto('/admin');
    await page.getByRole('button', { name: /Login as Admin/i }).click();
    await expect(page.getByText('TreFood Campus Administration')).toBeVisible({ timeout: 15000 });

    // 3. Overview cards
    await expect(page.getByText('Live Orders')).toBeVisible();
    await expect(page.getByText('Delivered Today')).toBeVisible();
    await expect(page.getByText('Avg Gate ETA')).toBeVisible();
    await expect(page.getByText('Complaints Open')).toBeVisible();
    await expect(page.getByText('Vendors Open')).toBeVisible();
    await expect(page.getByText('Hourly Orders Volume')).toBeVisible();

    // 4. Orders Monitor with filters
    await page.getByRole('button', { name: 'Orders Monitor' }).click();
    await expect(page.getByText(/Live Orders Monitor/i)).toBeVisible({ timeout: 10000 });
    await page.getByLabel('Status').selectOption('delivered');
    await page.getByLabel('Gate').selectOption('gate_main');
    await page.getByLabel('Status').selectOption('');

    // 5. Vendors tab: approve onboarding application + edit hours & gate reach
    await page.getByRole('button', { name: 'Vendors', exact: true }).click();
    await expect(page.getByText(uniqueVendorName)).toBeVisible({ timeout: 10000 });
    const appCard = page.locator(`[data-application-name="${uniqueVendorName}"]`).first();
    await appCard.getByRole('button', { name: /Approve & Onboard/i }).click();
    await expect(page.getByText(/approved and onboarded/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Edit Hours & Gates/i }).first().click();
    await expect(page.getByText(/Edit Hours & Gates •/i)).toBeVisible();
    await page.getByRole('button', { name: 'Save Vendor Config' }).click();
    await expect(page.getByText(/hours & gate reach/i).first()).toBeVisible({ timeout: 10000 });

    // 6. Gates & Curfews tab: Temp Close + Banner -> Reopen Gate
    await page.getByRole('button', { name: /Gates & Curfews/i }).click();
    const boysGateCard = page.locator('[data-admin-gate*="Boys Hostel"]').first();
    await expect(boysGateCard).toBeVisible({ timeout: 10000 });
    await boysGateCard.getByRole('button', { name: /Temp Close \+ Banner/i }).click();
    await page.getByRole('button', { name: /Close Gate & Broadcast/i }).click();
    await expect(boysGateCard.getByRole('button', { name: 'Reopen Gate' })).toBeVisible({
      timeout: 10000,
    });
    // Restore Boys Hostel gate open cleanly
    await boysGateCard.getByRole('button', { name: 'Reopen Gate' }).click();
    await page.getByRole('button', { name: /Reopen & Broadcast/i }).click();
    await expect(boysGateCard.getByRole('button', { name: /Temp Close \+ Banner/i })).toBeVisible({
      timeout: 10000,
    });

    // 7. Coupons Manager tab: create coupon + pause
    await page.getByRole('button', { name: 'Coupons' }).click();
    const promoCode = `NITP${Date.now().toString().slice(-4)}`;
    await page.getByRole('button', { name: 'Create Coupon' }).click();
    await page.getByLabel('Coupon Code').fill(promoCode);
    await page.getByLabel('Student-facing description').fill('Test campus flat discount');
    await page.getByRole('button', { name: 'Publish Coupon' }).click();
    await expect(page.getByRole('cell', { name: promoCode })).toBeVisible({ timeout: 10000 });

    // 8. Settlements tab: vendor & day report + Export CSV
    await page.getByRole('button', { name: 'Settlements' }).click();
    await expect(page.getByRole('heading', { name: /Vendor & Day Settlement Report/i })).toBeVisible({
      timeout: 10000,
    });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export Settlement CSV/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('trefood-admin-settlement-');

    // 9. Audit Log tab + Axe accessibility check
    await page.getByRole('button', { name: 'Audit Log' }).click();
    await expect(page.getByText('VENDOR_APPLICATION_UPDATED').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('COUPON_CREATED').first()).toBeVisible();

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(axeResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
