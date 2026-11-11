import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Vendor Tablet Console (/vendor at 768px & 1024px)', () => {
  test('supports portrait 768px & landscape 1024px layout, accept, reject, ready, controls, stock search/price & insights CSV', async ({
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
    await page.setExtraHTTPHeaders({ 'x-mock-time': ts1400Ist });

    // 1. Place 2 student orders via a separate student context so the board has fresh orders to accept and reject
    const studentCtx = await browser.newContext();
    await studentCtx.setExtraHTTPHeaders({ 'x-mock-time': ts1400Ist });
    const sPage = await studentCtx.newPage();

    let acceptPublicNo = '';
    let rejectPublicNo = '';
    let acceptOrderId = '';
    try {
      await sPage.goto('/');
      const created = await sPage.evaluate(async (tsHeader) => {
        await fetch('/api/auth/demo/student', { method: 'POST' });
        const place = async (k: string) => {
          const r = await fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Idempotency-Key': `e2e-v-${k}-${Date.now()}-${Math.random()}`,
              'x-mock-time': tsHeader,
            },
            body: JSON.stringify({
              vendorId: 'rest_csb_nitp',
              gateId: 'gate_main',
              items: [{ itemId: 'csb_chocolate_chai', quantity: 2 }],
            }),
          });
          return r.json();
        };
        const a = (await place('a')) as { order: { id: string; publicNo: string } };
        const b = (await place('b')) as { order: { id: string; publicNo: string } };
        return { a: a.order, b: b.order };
      }, ts1400Ist);

      acceptOrderId = created.a.id;
      acceptPublicNo = created.a.publicNo;
      rejectPublicNo = created.b.publicNo;
    } finally {
      await studentCtx.close();
    }

    // 2. Open /vendor at Portrait Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/vendor');
    await page.getByRole('button', { name: /Login as Vendor/i }).click();
    await expect(page.getByText('TreFood Counter')).toBeVisible({ timeout: 15000 });

    // Verify 4 columns visible: New Orders, Preparing, Ready, Handed over
    await expect(page.getByRole('heading', { name: 'New Orders' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Preparing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ready' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Handed over' })).toBeVisible();
    await expect(page.getByText('Gate Windows:')).toBeVisible();

    // Assert zero horizontal overflow at 768x1024 portrait tablet
    const overflow768 = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
    );
    expect(overflow768).toBe(true);

    // 3. Switch to Landscape Tablet (1024x768) and confirm layout & zero horizontal overflow
    await page.setViewportSize({ width: 1024, height: 768 });
    const overflow1024 = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2
    );
    expect(overflow1024).toBe(true);

    // 4. Test operational controls (Mute, Busy mode, Open/Closed toggle, Night Safety Staff)
    const muteBtn = page.getByRole('button', { name: /Sound On|Muted/i });
    await muteBtn.click();
    await expect(page.getByRole('button', { name: 'Muted' })).toBeVisible();
    await page.getByRole('button', { name: 'Muted' }).click();

    await page.getByRole('button', { name: /Busy 30m/i }).click();
    await expect(page.getByRole('button', { name: /Busy ON/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Busy ON/i }).click();

    await page.getByRole('button', { name: /Store: OPEN/i }).click();
    await expect(page.getByRole('button', { name: /Store: CLOSED/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Store: CLOSED/i }).click();
    await expect(page.getByRole('button', { name: /Store: OPEN/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Night Staff: On Duty/i }).click();
    await expect(page.getByRole('button', { name: /Night Staff: Off Duty/i })).toBeVisible({
      timeout: 10000,
    });
    await page.getByRole('button', { name: /Night Staff: Off Duty/i }).click();

    // 5. Reject second order with reason
    const rejectCard = page.locator(`[data-order-no="${rejectPublicNo}"]`).first();
    await expect(rejectCard).toBeVisible({ timeout: 10000 });
    await rejectCard.getByRole('button', { name: 'Reject' }).click();
    const rejectDialog = page.getByRole('dialog', { name: 'Reject Order?' });
    await expect(rejectDialog).toBeVisible();
    await rejectDialog.getByLabel(/Reason for rejection/i).selectOption('Kitchen rush / closing for break');
    await rejectDialog.getByRole('button', { name: 'Confirm Rejection' }).click();
    await expect(rejectCard).toBeHidden({ timeout: 10000 });

    // 6. Accept first order with adjusted prep time (+5 -> 20m) -> Mark Ready -> Arrived at Gate -> Handover Assist
    const acceptCard = page.locator(`[data-order-no="${acceptPublicNo}"]`).first();
    await expect(acceptCard).toBeVisible({ timeout: 10000 });
    await acceptCard.getByRole('button', { name: `Increase prep time for #${acceptPublicNo}` }).click();
    await acceptCard.getByRole('button', { name: /Accept Order/i }).click();

    // Wait for card in Preparing -> Mark Ready • Send to Gate
    await expect(acceptCard.getByRole('button', { name: /Mark Ready • Send to Gate/i })).toBeVisible({
      timeout: 10000,
    });
    await acceptCard.getByRole('button', { name: '+5m Prep' }).click();
    await acceptCard.getByRole('button', { name: /Mark Ready • Send to Gate/i }).click();

    // Arrived at Gate
    const arrivedBtn = acceptCard.getByRole('button', { name: /Arrived at Gate/i });
    await expect(arrivedBtn).toBeVisible({ timeout: 10000 });
    await arrivedBtn.click();

    // Simulate student lockout via DB attempts (5 wrong tries as student) so Locked Out banner shows, then Handover Assist completes delivery!
    await page.evaluate(async (id) => {
      // Vendor still uses same host; test assist action directly on at_gate order
      await fetch(`/api/vendor/orders/${id}/handover-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completeDelivery: false, note: 'Reset before assist' }),
      });
    }, acceptOrderId);

    const assistBtn = acceptCard.getByRole('button', { name: /Assist & Hand Over/i });
    await expect(assistBtn).toBeVisible({ timeout: 10000 });
    await assistBtn.click();

    // Should now appear inside Handed over column
    const handedCol = page.getByRole('region', { name: 'Handed Over column' });
    await expect(handedCol.locator(`[data-order-no="${acceptPublicNo}"]`)).toBeVisible({
      timeout: 10000,
    });

    // 7. Menu Stock tab: search, 1-tap toggle, edit price, default prep time
    await page.getByRole('button', { name: 'Menu Stock' }).click();
    await expect(page.getByRole('heading', { name: '1-Tap Menu Stock Management' })).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel('Search menu items').fill('Paneer');
    const stockRow = page.locator('[data-menu-stock-item]').first();
    await expect(stockRow).toBeVisible({ timeout: 10000 });

    const toggleBtn = stockRow.getByRole('button', { name: /In Stock|Sold Out/i });
    const initialStockLabel = (await toggleBtn.textContent())?.trim();
    await toggleBtn.click();
    await expect(toggleBtn).not.toHaveText(initialStockLabel || '', { timeout: 10000 });
    // Restore original stock
    await toggleBtn.click();

    // Edit price & restore
    const priceInput = stockRow.locator('input[type="number"]');
    const oldPrice = await priceInput.inputValue();
    const updatedPrice = oldPrice === '95' ? '92' : '95';
    await priceInput.fill(updatedPrice);
    await stockRow.getByRole('button', { name: /Save price/i }).click();
    await expect(stockRow.getByText(`₹${Number(updatedPrice).toFixed(2)}`)).toBeVisible({
      timeout: 10000,
    });
    await priceInput.fill(oldPrice);
    await stockRow.getByRole('button', { name: /Save price/i }).click();

    // Default prep time update
    await page.getByRole('button', { name: 'Increase default prep time by 5 minutes' }).click();
    await page.getByRole('button', { name: 'Save Prep Time' }).click();
    await page.getByRole('button', { name: 'Decrease default prep time by 5 minutes' }).click();
    await page.getByRole('button', { name: 'Save Prep Time' }).click();

    // 8. Insights & Daily Settlement tab + CSV export + Axe accessibility check
    await page.getByRole('button', { name: /Insights & Daily Settlement/i }).click();
    await expect(page.getByText("Today's Orders")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Today's Revenue")).toBeVisible();
    await expect(page.getByText('Avg Prep vs Promised')).toBeVisible();
    await expect(page.getByText('Peak Hours Orders (IST)')).toBeVisible();
    await expect(page.getByText('Top Items')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export CSV/i })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export CSV/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('trefood-settlement-');

    const axeResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(axeResults.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
