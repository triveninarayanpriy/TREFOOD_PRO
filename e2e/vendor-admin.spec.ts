import { test, expect } from '@playwright/test';

test.describe('Vendor and Admin Console Verification', () => {
  test('vendor console (/v) allows vendor login, views 4 board columns, and toggles tabs', async ({ page }) => {
    const testNowUtc = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000);
    await page.setExtraHTTPHeaders({
      'x-mock-time': testNowUtc.toString(),
    });

    await page.goto('/v');

    // 1. Should show vendor login prompt
    const loginVendorBtn = page.getByRole('button', { name: /Login as Vendor/i });
    await expect(loginVendorBtn).toBeVisible({ timeout: 15000 });
    await loginVendorBtn.click();

    // 2. Verify 4 counter tablet columns
    await expect(page.getByText('TreFood Counter')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('New Orders')).toBeVisible();
    await expect(page.getByText('Preparing')).toBeVisible();
    await expect(page.getByText('On Route')).toBeVisible();
    await expect(page.getByText('At Gate (Handover)')).toBeVisible();

    // 3. Switch to Menu Stock tab
    const stockTab = page.getByRole('button', { name: /Menu Stock/i });
    await stockTab.click();
    await expect(page.getByText('1-Tap Menu Stock Management')).toBeVisible({ timeout: 10000 });

    // 4. Switch to Settlement tab
    const settlementTab = page.getByRole('button', { name: /Daily Settlement/i });
    await settlementTab.click();
    await expect(page.getByText('Daily Settlement & Sales')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();
  });

  test('admin console (/admin) allows admin login, displays metrics, SVG chart, and gate controls', async ({ page }) => {
    const testNowUtc = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000);
    await page.setExtraHTTPHeaders({
      'x-mock-time': testNowUtc.toString(),
    });

    await page.goto('/admin');

    // 1. Should show admin login prompt
    const loginAdminBtn = page.getByRole('button', { name: /Login as Admin/i });
    await expect(loginAdminBtn).toBeVisible({ timeout: 15000 });
    await loginAdminBtn.click();

    // 2. Verify admin header & metrics
    await expect(page.getByText('TreFood Campus Administration')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Total Orders')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('GMV (₹)')).toBeVisible({ timeout: 15000 });

    // 3. Verify SVG orders chart
    await expect(page.getByText('Hourly Orders Volume')).toBeVisible();

    // 4. Switch to Gates & Curfews tab
    const gatesTab = page.getByRole('button', { name: /Gates & Curfews/i });
    await gatesTab.click();
    await expect(page.getByText('Hostel Gates & Curfew Settings')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Main Gate').first()).toBeVisible();

    // 5. Switch to Vendors tab
    const vendorsTab = page.getByRole('button', { name: 'Vendors', exact: true });
    await vendorsTab.click();
    await expect(page.getByText('Campus Canteens & Vendors')).toBeVisible({ timeout: 10000 });
  });
});
