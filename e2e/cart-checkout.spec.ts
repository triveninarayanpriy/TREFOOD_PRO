import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Cart & Checkout (Zustand Persisted, Coupons, Min Order, Curfew & UPI Sim)', () => {
  test('supports offline cart persistence, single-vendor conflict dialog, min-order add-ons, coupons, itemized bill, curfew switch, schedule & UPI failure/recovery', async ({
    page,
    context,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Set mock time to 14:00 IST (08:30 UTC) first so all gates & open vendors are active
    const dayMockTs = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString();
    await page.setExtraHTTPHeaders({ 'x-mock-time': dayMockTs });

    // 1. Add low-price item from Sone Valley Biryani (min order ₹79; Boondi Raita ₹25 -> short by ₹54)
    await page.goto('/vendor/sone-valley-biryani');
    await expect(page.getByRole('heading', { name: 'Sone Valley Thali & Biryani' })).toBeVisible({
      timeout: 15000,
    });

    const boondiRow = page.locator('[data-menu-item="Boondi Raita Cup"]');
    await expect(boondiRow).toBeVisible();
    await boondiRow.getByRole('button', { name: '+ Add' }).click();

    await expect(page.getByRole('button', { name: /View Packet/i })).toBeVisible();

    // 2. Offline persistence: go offline -> confirm persisted state stays intact -> return online -> reload recovers cart
    await context.setOffline(true);
    const storedBefore = await page.evaluate(() => localStorage.getItem('trefood_cart_v1'));
    expect(storedBefore).toContain('Boondi Raita Cup');
    await context.setOffline(false);

    await page.reload();
    await expect(page.getByRole('button', { name: /View Packet/i })).toBeVisible({ timeout: 10000 });

    // 3. Single-vendor conflict dialog ("Start a new cart with Ganga Dhaba & Kitchen?")
    await page.goto('/vendor/ganga-dhaba');
    await expect(page.getByRole('heading', { name: 'Ganga Dhaba & Kitchen' })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: '+ Add' }).first().click();
    await expect(
      page.getByRole('heading', { name: /Start a new cart with Ganga Dhaba & Kitchen\?/i })
    ).toBeVisible();
    // Keep existing Sone Valley cart to test min-order progress bar
    await page.getByRole('button', { name: /Keep existing items/i }).click();

    // 4. Open CartDrawer -> check min-order progress bar + click suggested add-on -> check coupons & itemized bill
    await page.getByRole('button', { name: /View Packet/i }).click();
    const cartDialog = page.getByRole('dialog', { name: 'Your Cart' });
    await expect(cartDialog).toBeVisible();
    await expect(cartDialog.getByRole('progressbar', { name: 'Minimum order progress' })).toBeVisible();
    await expect(cartDialog.getByText(/Add ₹54 more to reach min ₹79/i)).toBeVisible();

    // Checkout button disabled while below min order
    await expect(cartDialog.getByRole('button', { name: /Add ₹54 more to checkout/i })).toBeDisabled();

    // Click suggested quick add-on from Sone Valley
    const quickAddonBtn = cartDialog
      .getByRole('group', { name: 'Suggested add-ons' })
      .getByRole('button')
      .first();
    await expect(quickAddonBtn).toBeVisible();
    await quickAddonBtn.click();

    // Wait for Checkout button to become active once subtotal meets ₹79+
    const checkoutBtn = cartDialog.getByRole('button', { name: /Proceed to Checkout/i });
    await expect(checkoutBtn).toBeVisible({ timeout: 10000 });
    await expect(checkoutBtn).toBeEnabled({ timeout: 10000 });

    // Verify coupon list & apply an eligible coupon
    await expect(cartDialog.getByText('Available Campus Coupons')).toBeVisible();
    const applyBtn = cartDialog.getByRole('button', { name: 'Apply', exact: true }).first();
    if (await applyBtn.isEnabled()) {
      await applyBtn.click();
    }

    // Verify itemized bill lines (Items subtotal, Packing charges, Delivery Fee, Total)
    await expect(cartDialog.getByText(/Items subtotal/i)).toBeVisible();
    await expect(cartDialog.getByText('Packing charges')).toBeVisible();
    await expect(cartDialog.getByText('FREE')).toBeVisible();

    // 5. Switch mock header to 19:20 IST (13:50 UTC) & choose Boys Hostel gate via URL param -> curfew warning + alternative gate switch inside Cart
    const ts1920Ist = Math.floor(new Date().setUTCHours(13, 50, 0, 0) / 1000).toString();
    await page.setExtraHTTPHeaders({ 'x-mock-time': ts1920Ist });
    await page.goto('/vendor/sone-valley-biryani?gate=gate_h5');
    await page.getByRole('button', { name: /View Packet/i }).click();

    // Curfew alert offers 1-tap Main Gate switch
    await expect(cartDialog.getByText(/Gate delivery alert/i)).toBeVisible({ timeout: 10000 });
    const switchMainBtn = cartDialog.getByRole('button', { name: /Main Gate/i });
    await switchMainBtn.click();
    await expect(cartDialog.getByText(/Gate delivery alert/i)).toBeHidden({ timeout: 10000 });

    // 6. Checkout: sign in via Demo Student, test Schedule Later, contact phone, delivery instruction, UPI simulated failure -> recovery -> order confirmation
    await cartDialog.getByRole('button', { name: /Proceed to Checkout/i }).click();
    const signInBtn = page.getByRole('button', { name: /Continue as Demo Student/i });
    await expect(signInBtn).toBeVisible({ timeout: 10000 });
    await signInBtn.click();

    await expect(page.locator('#checkout-phone')).toBeVisible({ timeout: 10000 });
    await page.locator('#checkout-phone').fill('9876543210');
    await page.locator('#checkout-instruction').fill('Call near Main Gate security cabin');

    // Toggle Schedule later -> inspect slots -> back to ASAP
    await page.getByRole('button', { name: 'Schedule later' }).click();
    await expect(page.locator('#checkout-schedule-slot')).toBeVisible();
    await page.getByRole('button', { name: 'ASAP' }).click();

    // Select UPI Simulated + test decline first -> clean alert + uncheck failure -> place order
    await page.getByLabel(/Pay now with UPI/i).check();
    await page.getByLabel(/Simulate UPI bank decline/i).check();
    await page.getByRole('button', { name: /Authorize UPI & Confirm Order/i }).click();

    await expect(page.getByText(/UPI collect request|declined/i)).toBeVisible({ timeout: 10000 });

    // Recover cleanly: uncheck failure simulation and submit
    await page.getByLabel(/Simulate UPI bank decline/i).uncheck();

    // Axe check on checkout modal before final submit
    const axeCheckout = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      axeCheckout.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    ).toEqual([]);

    await page.getByRole('button', { name: /Retry Placing Order|Authorize UPI/i }).click();

    // Navigates to /orders/:id with 4-digit handover ticket & itemized receipt
    await page.waitForURL(/\/orders\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    await expect(page.getByText('Handover Ticket').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Paid via UPI (Simulated)')).toBeVisible();
    await expect(page.getByText('Call near Main Gate security cabin')).toBeVisible();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
