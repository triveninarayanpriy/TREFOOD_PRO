import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Orders Tracking, 4-Digit Handover, Notifications & PWA Flow', () => {
  test('place order -> vendor accepts -> status changes -> at gate -> wrong code -> correct code -> delivered + report & reorder', async ({
    browser,
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    let allowExpected400 = false;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        if (allowExpected400 && msg.text().includes('status of 400')) return;
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const ts1400Ist = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString();
    await page.setExtraHTTPHeaders({ 'x-mock-time': ts1400Ist });

    // 1. Student browses Ganga Dhaba & places an order cleanly
    await page.goto('/vendor/ganga-dhaba');
    await expect(page.getByRole('heading', { name: 'Ganga Dhaba & Kitchen' })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: '+ Add' }).first().click();

    await page.getByRole('button', { name: /View Packet/i }).click();
    const cartDialog = page.getByRole('dialog', { name: 'Your Cart' });
    await expect(cartDialog).toBeVisible();
    const proceedBtn = cartDialog.getByRole('button', { name: /Proceed to Checkout/i });
    await expect(proceedBtn).toBeEnabled({ timeout: 10000 });
    await proceedBtn.click();

    await page.getByRole('button', { name: /Continue as Demo Student/i }).click();

    const phoneInput = page.getByLabel(/Phone Number/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('9876543210');
    }
    const confirmOrderBtn = page.getByRole('button', { name: /Confirm Order/i });
    await expect(confirmOrderBtn).toBeEnabled({ timeout: 10000 });
    await confirmOrderBtn.click();

    await page.waitForURL(/\/orders\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
    const orderUrl = page.url();
    const orderId = orderUrl.split('/orders/')[1]?.split('?')[0] || '';
    expect(orderId.length).toBeGreaterThan(5);

    // Verify 6-step StatusTimeline, freshness indicator, manual refresh, and push status card
    await expect(page.getByText('Handover Ticket').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Live Order Progress')).toBeVisible();
    await expect(page.getByText('Placed').first()).toBeVisible();
    await expect(page.getByText('Accepted').first()).toBeVisible();
    await expect(page.getByText('Preparing').first()).toBeVisible();
    await expect(page.getByText('Out for delivery').first()).toBeVisible();
    await expect(page.getByText('At your gate').first()).toBeVisible();
    await expect(page.getByText('Delivered').first()).toBeVisible();
    await expect(page.getByText(/Updated/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh/i })).toBeVisible();
    await expect(page.getByText(/Get gate arrival alerts|Gate arrival alerts active/i)).toBeVisible();

    // Read packet 4-digit handover code from the order API / ticket
    const detailJson = (await page.evaluate(async (id) => {
      const res = await fetch(`/api/orders/${id}`);
      return res.json();
    }, orderId)) as { order: { handoverCode: string; publicNo: string } };
    const actualCode: string = detailJson.order.handoverCode;
    const publicNo: string = detailJson.order.publicNo;
    expect(actualCode).toMatch(/^\d{4}$/);

    // 2. Separate Vendor browser context signs in at /v and advances order:
    //    placed -> accepted (15m) -> out_for_delivery -> at_gate
    const vendorContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await vendorContext.setExtraHTTPHeaders({ 'x-mock-time': ts1400Ist });
    const vendorPage = await vendorContext.newPage();

    try {
      await vendorPage.goto('/v');
      await vendorPage.getByRole('button', { name: /Login as Vendor/i }).click();
      await expect(vendorPage.getByText('TreFood Counter')).toBeVisible({ timeout: 15000 });

      const orderCard = vendorPage.locator(`[data-order-no="${publicNo}"]`).first();
      await expect(orderCard).toBeVisible({ timeout: 10000 });
      await orderCard.getByRole('button', { name: '15m' }).click();

      const sendToGateBtn = orderCard.getByRole('button', { name: /Ready • Send to Gate/i });
      await expect(sendToGateBtn).toBeVisible({ timeout: 10000 });
      await sendToGateBtn.click();

      const arrivedBtn = orderCard.getByRole('button', { name: /Arrived at Gate/i });
      await expect(arrivedBtn).toBeVisible({ timeout: 10000 });
      await arrivedBtn.click();

      await expect(orderCard.getByText(`#${publicNo}`)).toBeVisible({ timeout: 10000 });
      await expect(
        vendorPage.getByText('At Gate (Handover)').first()
      ).toBeVisible({ timeout: 10000 });
    } finally {
      await vendorContext.close();
    }

    // 3. Student manually refreshes -> observes at_gate state, 15m countdown & server code verification
    await page.getByRole('button', { name: /Refresh/i }).click();
    await expect(page.getByText(/Gate window:\s*\d{2}:\d{2}/)).toBeVisible({ timeout: 10000 });

    const codeInput = page.getByLabel(/Enter 4-digit code from packet/i);
    await expect(codeInput).toBeVisible();

    // 4. Enter WRONG 4-digit code -> server rejects with 400 and shows attempts remaining
    const wrongCode = actualCode === '0000' ? '9999' : '0000';
    allowExpected400 = true;
    await codeInput.fill(wrongCode);
    await page.getByRole('button', { name: 'Confirm received' }).click();
    await expect(page.getByRole('alert')).toContainText(/does not match packet/i, {
      timeout: 10000,
    });
    allowExpected400 = false;
    await expect(page.getByText(/4 attempts left/i)).toBeVisible({ timeout: 10000 });

    // 5. Enter CORRECT 4-digit code -> confirmed delivered!
    await codeInput.fill(actualCode);
    await page.getByRole('button', { name: 'Confirm received' }).click();
    await expect(page.getByText('How was your order?')).toBeVisible({ timeout: 10000 });

    // 6. Rate via Rate & Review sheet
    await page.getByRole('button', { name: /Rate & Review/i }).click();
    await expect(page.getByRole('dialog', { name: /Rate Ganga Dhaba/i })).toBeVisible();
    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Review saved/i)).toBeVisible({ timeout: 10000 });

    // 7. Report a problem feeding Admin Reports queue
    await page.getByRole('button', { name: /Report a problem/i }).click();
    const reportDialog = page.getByRole('dialog', { name: 'Report a Problem' });
    await expect(reportDialog).toBeVisible();
    await reportDialog.getByLabel(/What went wrong/i).selectOption('missing_item');
    await reportDialog.getByLabel(/Details/i).fill('Chutney packet was missing inside sealed bag.');
    await reportDialog.getByRole('button', { name: /Submit Report/i }).click();
    await expect(
      page.getByText('Problem reported to TreFood campus support (missing_item).')
    ).toBeVisible({
      timeout: 10000,
    });

    // Verify Admin context receives the report cleanly in Admin Console Reports tab
    const adminContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await adminContext.setExtraHTTPHeaders({ 'x-mock-time': ts1400Ist });
    const adminPage = await adminContext.newPage();
    try {
      await adminPage.goto('/admin');
      await adminPage.getByRole('button', { name: /Login as Admin/i }).click();
      await adminPage.getByRole('button', { name: /^Reports/i }).click();
      await expect(adminPage.getByText(`#${publicNo}`).first()).toBeVisible({ timeout: 10000 });
      await expect(adminPage.getByText('missing_item').first()).toBeVisible();
    } finally {
      await adminContext.close();
    }

    // 8. Notification Centre Drawer status cards fallback + Orders list Active/Past tabs + Reorder
    await page.getByRole('button', { name: 'Open order notifications' }).click();
    const notifDrawer = page.getByRole('dialog', { name: 'Order notifications centre' });
    await expect(notifDrawer).toBeVisible();
    await expect(notifDrawer.getByText(`#${publicNo}`).first()).toBeVisible({ timeout: 10000 });
    await notifDrawer.getByRole('button', { name: 'Close notifications' }).click();

    await page.goto('/orders');
    await expect(page.getByRole('tab', { name: /Past/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /Past/i }).click();
    await expect(page.getByText(`#${publicNo}`).first()).toBeVisible({ timeout: 10000 });

    // Reorder restores items & opens vendor menu
    await page.getByRole('button', { name: 'Reorder' }).first().click();
    await expect(page).toHaveURL(/\/vendor\/ganga-dhaba/);
    await expect(page.getByRole('button', { name: /View Packet/i })).toBeVisible({ timeout: 10000 });

    // Verify Service Worker registration, manifest.json, and offline fallback page
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await navigator.serviceWorker.getRegistration('/');
      return Boolean(reg);
    });
    expect(swRegistered).toBe(true);

    const manifestRes = await page.request.get('/manifest.json');
    expect(manifestRes.status()).toBe(200);

    await page.goto('/offline.html');
    await expect(page.getByText('You are currently offline')).toBeVisible();

    // Axe accessibility audit on /orders page at current viewport (mobile or desktop)
    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible({ timeout: 10000 });
    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(axeResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
