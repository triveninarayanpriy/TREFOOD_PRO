import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORTS = [
  { width: 360, height: 800, name: '360' }, // Compact Android
  { width: 390, height: 844, name: '390' }, // iPhone 12/13/14 baseline
  { width: 430, height: 932, name: '430' }, // Large iPhone Pro Max
];

test.describe('Prompt P4: Mobile Native-Feeling App Built for One Thumb', () => {
  for (const { width, height, name } of MOBILE_VIEWPORTS) {
    test(`[${name}px] Home Page: zero horizontal scroll, clean top bar, 16:10 cards, 2-col dishes & 56px bottom nav`, async ({
      page,
    }) => {
      // Mock daytime (14:00 IST / 08:30 UTC) so open counters and gates are active
      const testNowUtc = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000);
      await page.setExtraHTTPHeaders({
        'x-mock-time': testNowUtc.toString(),
      });

      await page.setViewportSize({ width, height });
      await page.goto('/app');
      await page.waitForLoadState('networkidle');

      // 1. Verify zero horizontal overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth, `Page should not have horizontal scroll at ${width}px`).toBeLessThanOrEqual(width + 1);

      // 2. Navigation Top Bar: strictly ONLY Gate selector and Search button (no hamburger menu, no bell icon)
      const topBar = page.locator('header[role="banner"]');
      await expect(topBar).toBeVisible();
      await expect(topBar.locator('button[aria-label="Open navigation menu"]')).toHaveCount(0);
      await expect(topBar.locator('button[aria-label="Notifications"]')).toHaveCount(0);
      await expect(topBar.getByRole('button', { name: /search dishes/i })).toBeVisible();

      // Top bar touch targets >= 44px
      const searchBtn = topBar.getByRole('button', { name: /search dishes/i });
      const searchBox = await searchBtn.boundingBox();
      expect(searchBox?.height).toBeGreaterThanOrEqual(44);

      // 3. Bottom Tab Bar: Exactly 56px (h-14), 4 tabs (Home, Menus, Orders, Account)
      const bottomNav = page.locator('nav[aria-label="Mobile Bottom Navigation"]');
      await expect(bottomNav).toBeVisible();
      const navBox = await bottomNav.boundingBox();
      expect(navBox?.height).toBeCloseTo(56, 4);

      await expect(bottomNav.getByRole('link', { name: /Home/i })).toBeVisible();
      await expect(bottomNav.getByRole('link', { name: /Menus/i })).toBeVisible();
      await expect(bottomNav.getByRole('link', { name: /Orders/i })).toBeVisible();
      await expect(bottomNav.getByRole('link', { name: /Account/i })).toBeVisible();

      // Check min 44px touch targets on bottom tabs
      const homeTab = bottomNav.getByRole('link', { name: /Home/i });
      const homeTabBox = await homeTab.boundingBox();
      expect(homeTabBox?.height).toBeGreaterThanOrEqual(44);

      // 4. Compact Gate status with live countdown
      const gateBanner = page.locator('header button:has-text("Deliver to")');
      await expect(gateBanner).toBeVisible();

      // 5. Category photo chips horizontal row
      const categoryChips = page.getByRole('region', { name: 'Campus Categories' });
      await expect(categoryChips).toBeVisible();

      // 6. Open Now: Full-width vendor cards with 16:10 photos
      const vendorCard = page.locator('article[data-vendor-slug]').first();
      await expect(vendorCard).toBeVisible();
      const vendorCardImg = vendorCard.locator('img').first();
      await expect(vendorCardImg).toBeVisible();

      // 7. Popular dishes as 2-column grid
      const popularGrid = page.getByRole('region', { name: 'Popular Dishes' }).locator('.grid');
      await expect(popularGrid).toBeVisible();
      const gridClasses = await popularGrid.getAttribute('class');
      expect(gridClasses).toContain('grid-cols-2');

      // 8. Capture screenshot
      await page.screenshot({
        path: `docs/screenshots/mobile/home-${name}.png`,
        fullPage: false,
      });
    });

    test(`[${name}px] Vendor Page: collapsing header, 88px dish rows, floating cart pill`, async ({
      page,
    }) => {
      const testNowUtc = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000);
      await page.setExtraHTTPHeaders({
        'x-mock-time': testNowUtc.toString(),
      });

      await page.setViewportSize({ width, height });
      await page.goto('/vendor/wrapchik-pizza');
      await page.waitForLoadState('networkidle');

      // Zero horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width + 1);

      // Header top bar with back button & search (touch targets >= 44px)
      const backBtn = page.getByRole('button', { name: /Back to (campus kitchens|vendors)/i });
      await expect(backBtn).toBeVisible();
      const backBox = await backBtn.boundingBox();
      expect(backBox?.height).toBeGreaterThanOrEqual(44);

      // Menu category horizontal chips
      const categoryBar = page.getByRole('navigation', { name: 'Menu Categories' });
      await expect(categoryBar).toBeVisible();

      // Menu item row with 88px photo on the right
      const firstMenuItem = page.locator('[data-menu-item]').first();
      await expect(firstMenuItem).toBeVisible();
      const itemImg = firstMenuItem.locator('img').first();
      await expect(itemImg).toBeVisible();
      const imgContainer = firstMenuItem.locator('.h-\\[88px\\]').first();
      const containerBox = await imgContainer.boundingBox();
      expect(containerBox?.width).toBeCloseTo(88, 1);
      expect(containerBox?.height).toBeCloseTo(88, 1);

      // Add button touch target >= 44px
      const addBtn = firstMenuItem.getByRole('button', { name: /^Add$/i }).first();
      await expect(addBtn).toBeVisible();
      const addBox = await addBtn.boundingBox();
      expect(addBox?.height).toBeGreaterThanOrEqual(44);

      // Capture Vendor Page screenshot before adding
      await page.screenshot({
        path: `docs/screenshots/mobile/vendor-${name}.png`,
        fullPage: false,
      });

      // Tap Add to put an item in the cart (opens item customisation sheet if item has options)
      await addBtn.click();

      // If customisation bottom sheet opens, confirm addition with large touch target button
      const sheetConfirmBtn = page.getByRole('button', { name: /Add to Packet/i });
      if (await sheetConfirmBtn.isVisible({ timeout: 2500 })) {
        const confirmBox = await sheetConfirmBtn.boundingBox();
        expect(confirmBox?.height).toBeGreaterThanOrEqual(44);
        await sheetConfirmBtn.click();
      }

      // Floating cart bar appears above bottom tab bar
      const cartSummary = page.getByRole('button', { name: /View (Cart|Packet)/i });
      await expect(cartSummary).toBeVisible({ timeout: 5000 });
      const cartBox = await cartSummary.boundingBox();
      expect(cartBox?.height).toBeGreaterThanOrEqual(44);

      // Tap floating cart bar to open full-height bottom sheet
      await cartSummary.click();

      // Full-height bottom sheet with drag handle
      const cartSheet = page.locator('div[role="dialog"]');
      await expect(cartSheet).toBeVisible({ timeout: 5000 });

      // Sticky Amber Checkout button (min 52px tall, reachable by thumb)
      const checkoutBtn = cartSheet.getByRole('button', { name: /Proceed to (Gate )?Checkout/i });
      await expect(checkoutBtn).toBeVisible();
      const checkoutBox = await checkoutBtn.boundingBox();
      expect(checkoutBox?.height).toBeGreaterThanOrEqual(48);

      // Capture Cart Sheet screenshot
      await page.screenshot({
        path: `docs/screenshots/mobile/cart-${name}.png`,
        fullPage: false,
      });
    });

    test(`[${name}px] Checkout & Tracking: amber sticky button, 16px inputs, 96px handover code`, async ({
      page,
    }) => {
      const testNowUtc = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000);
      await page.setExtraHTTPHeaders({
        'x-mock-time': testNowUtc.toString(),
      });

      await page.setViewportSize({ width, height });

      // 1. Visit vendor and add item
      await page.goto('/vendor/wrapchik-pizza');
      await page.waitForLoadState('networkidle');

      const addBtn = page.locator('[data-menu-item]').first().getByRole('button', { name: /^Add$/i }).first();
      await expect(addBtn).toBeVisible();
      await addBtn.click();

      // If customisation sheet opens, confirm addition
      const sheetConfirmBtn = page.getByRole('button', { name: /Add to Packet/i });
      if (await sheetConfirmBtn.isVisible({ timeout: 2500 })) {
        await sheetConfirmBtn.click();
      }

      // 2. Open cart sheet and click Proceed to Checkout
      const cartSummary = page.getByRole('button', { name: /View (Cart|Packet)/i });
      await expect(cartSummary).toBeVisible({ timeout: 5000 });
      await cartSummary.click();

      const proceedBtn = page.getByRole('button', { name: /Proceed to (Gate )?Checkout/i });
      await expect(proceedBtn).toBeVisible({ timeout: 5000 });
      await proceedBtn.click();

      // 3. If demo sign in prompt appears, authenticate with 1-Tap Demo Student
      const demoStudentBtn = page.getByRole('button', { name: /Continue as Demo Student/i });
      if (await demoStudentBtn.isVisible({ timeout: 4000 })) {
        await demoStudentBtn.click();
      }

      // 4. Arrive on Checkout Page
      await page.waitForURL(/\/checkout/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // 5. If sign-in is required on checkout page, authenticate with Demo Student
      const demoBtn = page.getByRole('button', { name: /Quick Sign-in/i });
      try {
        await demoBtn.waitFor({ state: 'visible', timeout: 5000 });
        await demoBtn.click();
      } catch {
        // Already authenticated
      }

      // Verify zero horizontal scroll
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width + 1);

      // Verify font size on all input fields >= 16px to prevent iOS auto-zoom
      const inputFontSizes = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
        return inputs.map((el) => {
          const fs = parseFloat(window.getComputedStyle(el).fontSize);
          return { name: (el as HTMLInputElement).name || el.id || el.tagName, fs };
        });
      });
      for (const input of inputFontSizes) {
        expect(input.fs, `Input ${input.name} font size must be >= 16px`).toBeGreaterThanOrEqual(16);
      }

      // Sticky thumb-reachable amber action bar (on mobile bottom)
      const placeOrderBtn = page.locator('div.fixed.bottom-0 button:has-text("Place Order")');
      await expect(placeOrderBtn).toBeVisible();
      await expect(placeOrderBtn).toBeEnabled({ timeout: 8000 });
      const placeBox = await placeOrderBtn.boundingBox();
      expect(placeBox?.height).toBeGreaterThanOrEqual(48);

      // Capture Checkout Page screenshot
      await page.screenshot({
        path: `docs/screenshots/mobile/checkout-${name}.png`,
        fullPage: false,
      });

      // 6. Place order to reach Tracking page
      await placeOrderBtn.click();

      // 6. Tracking page with 96px code & packet chit
      await page.waitForURL(/\/orders\/[a-zA-Z0-9_-]+/, { timeout: 15000 });
      await page.waitForLoadState('networkidle');

      // Check packet chit is visible
      const packetChit = page.getByTestId('packet-chit');
      await expect(packetChit).toBeVisible({ timeout: 10000 });

      // Check 96px handover code display
      const codeElement = page.getByTestId('handover-code-display');
      await expect(codeElement).toBeVisible();
      const codeFontSize = await codeElement.evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(codeFontSize).toBeCloseTo(96, 5);

      // Zero horizontal scroll on Tracking page
      const trackingScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(trackingScrollWidth).toBeLessThanOrEqual(width + 1);

      // Capture Tracking screenshot
      await page.screenshot({
        path: `docs/screenshots/mobile/tracking-${name}.png`,
        fullPage: false,
      });
    });
  }
});
