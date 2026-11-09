import { test, expect } from '@playwright/test';

test.describe('TreFood App Shell Smoke Test', () => {
  test('loads home page and displays TreFood branding and health status', async ({ page }) => {
    await page.goto('/');

    // Check title and branding
    await expect(page).toHaveTitle(/TreFood/);
    await expect(page.getByText('TreFood', { exact: true })).toBeVisible();
    await expect(page.getByText('NIT Patna', { exact: true })).toBeVisible();

    // Check heading
    await expect(
      page.getByRole('heading', { name: /Hyperlocal Campus Delivery/i })
    ).toBeVisible();

    // Check health card
    await expect(page.getByText('Worker API Status')).toBeVisible();
  });
});
