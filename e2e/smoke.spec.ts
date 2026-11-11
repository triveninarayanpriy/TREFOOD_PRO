import { test, expect } from '@playwright/test';

test.describe('TreFood App Shell Smoke Test', () => {
  test('loads landing page with TreFood branding, GateBoard, and PacketChit 4821', async ({ page }) => {
    await page.goto('/');

    // Check title and branding
    await expect(page).toHaveTitle(/TreFood/);
    await expect(page.getByText('TreFood').first()).toBeVisible();
    await expect(page.getByText('NIT Patna').first()).toBeVisible();

    // Check R3 editorial hero headline
    await expect(
      page.getByRole('heading', { name: /Midnight chai and hot food, at your hostel gate/i })
    ).toBeVisible();

    // Check signature PacketChit demo (#TF-4821) and GateBoard
    await expect(page.getByText('TF-4821').first()).toBeVisible();
    await expect(page.getByText('Match 4-Digit Code at Gate').first()).toBeVisible();
    await expect(page.getByRole('region', { name: /Campus gate departure board/i })).toBeVisible();

    // Check call to action leads to /app, never to sign-in
    const browseBtn = page.getByRole('button', { name: /Browse open menus/i });
    await expect(browseBtn).toBeVisible();
    await browseBtn.click();
    await expect(page).toHaveURL(/\/app/);
  });
});
