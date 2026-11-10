import { test, expect } from '@playwright/test';

test.describe('Customer End-to-End Journey', () => {
  test('guest browse -> add to cart -> demo login -> place order -> live ticket', async ({ page }) => {
    // Set mock time in DEMO_MODE to 14:00 IST (08:30 UTC) so all vendors & gates are open regardless of when tests run
    const testNowUtc = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000);
    await page.setExtraHTTPHeaders({
      'x-mock-time': testNowUtc.toString(),
    });

    // 1. Guest lands on homepage
    await page.goto('/');
    await expect(page).toHaveTitle(/TreFood/);

    // 2. Click Browse Campus Canteens
    const browseBtn = page.getByRole('button', { name: /Browse Campus Canteens/i });
    await browseBtn.click();
    await expect(page).toHaveURL(/\/browse/);

    // 3. Verify vendors list is visible
    await expect(page.getByText('All Canteens')).toBeVisible();

    // 4. Click into Ganga Dhaba & Kitchen
    const vendorLink = page.getByText('Ganga Dhaba & Kitchen').first();
    await expect(vendorLink).toBeVisible({ timeout: 10000 });
    await vendorLink.click();

    // 5. Land on vendor menu page
    await expect(page).toHaveURL(/\/vendor\//);
    await expect(page.getByText('Hours:').first()).toBeVisible({ timeout: 10000 });

    // 6. Click + Add on an item
    const addBtn = page.getByRole('button', { name: '+ Add' }).first();
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 7. Verify bottom cart summary bar appears and open it
    const viewPacketBtn = page.getByRole('button', { name: /View Packet/i });
    await expect(viewPacketBtn).toBeVisible({ timeout: 10000 });
    await viewPacketBtn.click();

    // 8. In Cart Drawer, click Proceed to Checkout (wait for debounced server quote)
    const checkoutBtn = page.getByRole('button', { name: /Proceed to Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
    await expect(checkoutBtn).toBeEnabled({ timeout: 10000 });
    await checkoutBtn.click();

    // 9. Sign in with 1-Tap Demo Student
    const demoStudentBtn = page.getByRole('button', { name: /Continue as Demo Student/i });
    await expect(demoStudentBtn).toBeVisible({ timeout: 10000 });
    await demoStudentBtn.click();

    // 10. Confirm & Place Order (Pay at Gate)
    const placeOrderBtn = page.getByRole('button', { name: /Confirm Order/i });
    await expect(placeOrderBtn).toBeVisible({ timeout: 10000 });
    await expect(placeOrderBtn).toBeEnabled({ timeout: 10000 });
    await placeOrderBtn.click();

    // 11. Successfully redirected to /orders/:id with live ticket
    await page.waitForURL(/\/orders\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    await expect(page.getByText('Handover Ticket').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Match 4-Digit Code at Gate').first()).toBeVisible();
  });
});
