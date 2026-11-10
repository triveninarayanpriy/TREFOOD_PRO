import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Design System & Accessibility (/dev/ui)', () => {
  test('renders every component in light and dark themes with zero console errors or WCAG contrast failures', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto('/dev/ui');

    // Ensure lazy-loaded DevKitPage rendered cleanly
    await expect(page.getByRole('heading', { name: /TreFood Design System/i })).toBeVisible({ timeout: 15000 });

    // Check every key component section from Prompt 1 is rendered
    await expect(page.getByText('Primary Maroon').first()).toBeVisible();
    await expect(page.getByText('Primary CTA Amber').first()).toBeVisible();
    await expect(page.getByText('VendorCard — Open Variant').first()).toBeVisible();
    await expect(page.getByText('VendorCard — Compact Closed Variant').first()).toBeVisible();
    await expect(page.getByText('MenuItemRow & QuantityStepper').first()).toBeVisible();
    await expect(page.getByText('Live Order Progress').first()).toBeVisible();
    await expect(page.getByText('4-Digit Handover Code').first()).toBeVisible();

    // Verify no horizontal overflow at current viewport (390px or 1280px)
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasOverflow).toBe(false);

    // 1. Light mode accessibility + color-contrast scan
    const lightResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const seriousOrCriticalLight = lightResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousOrCriticalLight, `Light mode axe violations: ${JSON.stringify(seriousOrCriticalLight, null, 2)}`).toEqual([]);

    // 2. Toggle to Dark mode and verify persistence + contrast
    const themeToggle = page.getByRole('button', { name: /Switch to (dark|light) theme/i }).first();
    await themeToggle.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    const darkResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const seriousOrCriticalDark = darkResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousOrCriticalDark, `Dark mode axe violations: ${JSON.stringify(seriousOrCriticalDark, null, 2)}`).toEqual([]);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('renders responsive desktop rail on wide viewport (1440x900) and mobile nav on 390px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/browse');
    await expect(page.getByText('All Canteens')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Desktop Navigation Rail')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByLabel('Mobile Bottom Navigation')).toBeVisible();
    await expect(page.getByLabel('Desktop Navigation Rail')).toBeHidden();
  });
});
