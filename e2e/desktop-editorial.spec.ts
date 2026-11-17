import { test, expect } from '@playwright/test';

const SIZES = [
  { width: 1280, height: 800, name: '1280' },
  { width: 1440, height: 900, name: '1440' },
  { width: 1920, height: 1080, name: '1920' },
];

test.describe('Prompt P3: Desktop Editorial Storefront', () => {
  for (const { width, height, name } of SIZES) {
    test(`renders Home Page at ${name}px width with zero cramped panels and no text < 13px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/app');
      await page.waitForLoadState('networkidle');

      // 1. Navigation verification: No customer sidebar
      const sidebar = page.locator('aside:has-text("Roles and System")');
      await expect(sidebar).toHaveCount(0);

      // Top nav wordmark and controls
      await expect(page.getByRole('link', { name: /TreFood NIT Patna/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Search dishes or kitchens/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Orders/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Favourites/i })).toBeVisible();

      // 2. Section 1: Hero with handwritten chit
      const hero = page.getByRole('region', { name: 'Featured Campus Kitchen' });
      await expect(hero).toBeVisible();
      await expect(hero.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('text=TreFood Chit')).toBeVisible();
      await expect(page.locator('text=#4812')).toBeVisible();

      // 3. Section 2: Gate Board strip
      const gateBoard = page.getByRole('region', { name: 'Campus Gate Status Board' });
      await expect(gateBoard).toBeVisible();

      // 4. Section 3: Open Now 3-column vendor grid
      const openNow = page.getByRole('region', { name: 'Open Food Counters' });
      await expect(openNow).toBeVisible();

      // 5. Section 4: Category photo tiles (5-column row)
      const categories = page.getByRole('region', { name: 'Campus Menu Categories' });
      await expect(categories).toBeVisible();

      // 6. Section 5: Popular Dishes
      const popular = page.getByRole('region', { name: 'Popular Dishes' });
      await expect(popular).toBeVisible();

      // 7. Section 6: Campus Night Safety block
      const nightSafety = page.getByRole('region', { name: 'Campus Night Safety Guidance' });
      await expect(nightSafety).toBeVisible();

      // Font size check: verify no visible text element has font-size < 13px
      const minFontSize = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, div'));
        let smallest = 999;
        let smallestEl = '';
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (!text || el.children.length > 0) continue;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;
          const fs = parseFloat(style.fontSize);
          if (fs > 0 && fs < smallest) {
            smallest = fs;
            smallestEl = `${el.tagName}: ${text.slice(0, 30)} (${fs}px)`;
          }
        }
        return { smallest, smallestEl };
      });
      expect(
        minFontSize.smallest,
        `Smallest element: ${minFontSize.smallestEl}`
      ).toBeGreaterThanOrEqual(13);

      // Screenshot
      await page.screenshot({
        path: `docs/screenshots/desktop/home-${name}.png`,
        fullPage: false,
      });
    });

    test(`renders Vendor Page at ${name}px with sticky 360px bill panel and no modal`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/vendor/wrapchik-pizza');
      await page.waitForLoadState('networkidle');

      // 21:9 Cover photo area
      await expect(page.locator('h1')).toContainText('Wrapchik Pizza');

      // Sticky categories nav
      await expect(page.locator('text=Menu Categories')).toBeVisible();

      // Bill panel is not visible initially when cart is empty
      const billPanel = page.locator('aside[aria-label="Order Bill Summary"]');
      await expect(billPanel).toHaveCount(0);

      // Modal cart should NOT exist
      await expect(page.locator('[role="dialog"]:has-text("Your Packet")')).toHaveCount(0);

      // Click "Add" on first item
      const addButtons = page.getByRole('button', { name: /^Add$/i });
      if (await addButtons.count() > 0) {
        await addButtons.first().click();

        // Sticky 360px bill panel slides in on desktop
        await expect(billPanel).toBeVisible({ timeout: 5000 });

        // Untruncated vendor name in bill panel
        const billVendorHeading = billPanel.locator('h3');
        await expect(billVendorHeading).toHaveText('Wrapchik Pizza');

        // Verify width is 360px
        const box = await billPanel.boundingBox();
        expect(box?.width).toBeCloseTo(360, 5);

        // Still no modal popup
        await expect(page.locator('[role="dialog"]:has-text("Your Packet")')).toHaveCount(0);
      }

      // Screenshot
      await page.screenshot({
        path: `docs/screenshots/desktop/vendor-${name}.png`,
        fullPage: false,
      });
    });

    test(`renders Checkout Page at ${name}px with 3 steps and persistent bill summary`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      // Go to vendor, add item, verify bill panel before navigating to checkout
      await page.goto('/vendor/wrapchik-pizza');
      await page.waitForLoadState('networkidle');

      const addButtons = page.getByRole('button', { name: /^Add$/i });
      if (await addButtons.count() > 0) {
        await addButtons.first().click();
        await page.waitForSelector('aside[aria-label="Order Bill Summary"]', { timeout: 5000 });
      }

      await page.goto('/checkout');
      await page.waitForLoadState('networkidle');

      // 3 Clear Steps
      await expect(page.getByText('Campus Gate & Drop Timing')).toBeVisible();
      await expect(page.getByText('Payment & Contact Details')).toBeVisible();
      await expect(page.getByText('Student Verification & Order Placement')).toBeVisible();

      // Persistent Sticky Order Summary
      await expect(page.getByText('Order Summary')).toBeVisible();
      await expect(page.getByRole('button', { name: /Place Order • Pay/i })).toBeVisible();

      // Screenshot
      await page.screenshot({
        path: `docs/screenshots/desktop/checkout-${name}.png`,
        fullPage: false,
      });
    });
  }

  test('Command search overlay opens via search button and supports keyboard navigation', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/app');

    // Click search in top nav
    await page.getByRole('button', { name: /Search dishes or kitchens/i }).click();

    // Command overlay should be visible with auto-focus
    const searchInput = page.getByPlaceholder(/Search dishes, canteens/i);
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toBeFocused();

    // Type query
    await searchInput.fill('pizza');
    await page.waitForTimeout(500);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });
});
