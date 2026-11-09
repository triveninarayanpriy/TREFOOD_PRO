import { test, expect } from '@playwright/test';

test.describe('TreFood App Shell Smoke Test', () => {
  test('loads home page and displays TreFood branding and signature HandoverTicket', async ({ page }) => {
    await page.goto('/');

    // Check title and branding
    await expect(page).toHaveTitle(/TreFood/);
    await expect(page.getByText('TreFood').first()).toBeVisible();
    await expect(page.getByText('NIT Patna').first()).toBeVisible();

    // Check hero headline
    await expect(
      page.getByRole('heading', { name: /NIT Patna food & essentials/i })
    ).toBeVisible();

    // Check signature HandoverTicket demo
    await expect(page.getByText('Handover Ticket').first()).toBeVisible();
    await expect(page.getByText('Match 4-Digit Code at Gate').first()).toBeVisible();

    // Check call to action leads to browse, never to sign-in
    const browseBtn = page.getByRole('button', { name: /Browse Campus Canteens/i });
    await expect(browseBtn).toBeVisible();
    await browseBtn.click();
    await expect(page).toHaveURL(/\/browse/);
  });
});
