import { test, expect } from '@playwright/test';

test.describe('Customer End-to-End Journey', () => {
  test('guest browse -> add to cart -> demo login -> place order -> live packet chit', async ({ page }) => {
    // Set mock time in DEMO_MODE to 14:00 IST (08:30 UTC) so open NIT Patna counters & gates are active
    const testNowUtc = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000);
    await page.setExtraHTTPHeaders({
      'x-mock-time': testNowUtc.toString(),
    });

    // 1. Guest lands on homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/TreFood/);

    // 2. Click Browse open menus
    const browseBtn = page.getByRole('button', { name: /Browse open menus/i });
    await browseBtn.click();
    await expect(page).toHaveURL(/\/app/);

    // 3. Verify open counters & gate board are visible
    await expect(page.getByRole('region', { name: /Campus gate departure board/i })).toBeVisible();

    // 4. Click into Chai Sutta Bar (CSB)
    const vendorLink = page.getByRole('button', { name: 'Chai Sutta Bar (CSB)' }).first();
    await expect(vendorLink).toBeVisible({ timeout: 10000 });
    await vendorLink.click();

    // 5. Land on vendor menu page
    await expect(page).toHaveURL(/\/vendor\/chai-sutta-bar-csb/);
    await expect(page.getByText('Hours:').first()).toBeVisible({ timeout: 10000 });

    // 6. Add Plain Milk (₹40 >= ₹39 min order)
    const milkRow = page.locator('[data-menu-item="Plain Milk"]').first();
    await milkRow.getByRole('button', { name: 'Add', exact: true }).click();

    // 7. Verify bottom / sidebar packet control appears and open Checkout
    const checkoutCollectBtn = page.getByRole('button', { name: /Checkout & Collect/i });
    if (await checkoutCollectBtn.isVisible()) {
      await expect(checkoutCollectBtn).toBeEnabled({ timeout: 10000 });
      await checkoutCollectBtn.click();
    } else {
      const viewPacketBtn = page.getByRole('button', { name: /View Packet/i });
      await expect(viewPacketBtn).toBeVisible({ timeout: 10000 });
      await viewPacketBtn.click();
      const proceedBtn = page.getByRole('button', { name: /Proceed to Checkout/i });
      await expect(proceedBtn).toBeVisible({ timeout: 10000 });
      await expect(proceedBtn).toBeEnabled({ timeout: 10000 });
      await proceedBtn.click();
    }

    // 9. Sign in with 1-Tap Demo Student
    const demoStudentBtn = page.getByRole('button', { name: /Continue as Demo Student/i });
    await expect(demoStudentBtn).toBeVisible({ timeout: 10000 });
    await demoStudentBtn.click();

    // 10. Confirm & Place Order (Pay at Gate)
    const placeOrderBtn = page.getByRole('button', { name: /Confirm Order/i });
    await expect(placeOrderBtn).toBeVisible({ timeout: 10000 });
    await expect(placeOrderBtn).toBeEnabled({ timeout: 10000 });
    await placeOrderBtn.click();

    // 11. Successfully redirected to /orders/:id with live PacketChit
    await page.waitForURL(/\/orders\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    await expect(page.getByTestId('packet-chit')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Match 4-Digit Code at Gate').first()).toBeVisible();
  });
});
