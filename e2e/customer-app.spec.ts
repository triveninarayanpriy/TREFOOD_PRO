import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Customer Experience (/app, /app/search, /vendor/:slug)', () => {
  test('renders /app home cleanly at 320px and 1280px with promos, quick picks, zero-result chip guard, closed pre-order, and search', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const dayMockTs = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString();
    await page.setExtraHTTPHeaders({ 'x-mock-time': dayMockTs });

    // 1. Check /app at 320px width for zero horizontal scroll
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/app');
    await expect(page.getByRole('region', { name: /Campus gate departure board/i })).toBeVisible({
      timeout: 15000,
    });
    const mobileOverflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(mobileOverflow.scrollWidth).toBeLessThanOrEqual(mobileOverflow.innerWidth);

    // 2. Desktop two-column verification (1280x800) with PaperBill right column
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('complementary', { name: 'Campus Packet Summary' })).toBeVisible();

    // Real category photo tiles + Quick picks + Open now counters visible (no promo carousel)
    await expect(page.getByRole('region', { name: 'Campus categories' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick picks' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Open Now/i })).toBeVisible();

    // Slim Closed list shows Opens at, Notify me, and Pre-order
    const closedSection = page.getByRole('region', { name: 'Closed vendors' });
    await expect(closedSection).toBeVisible();
    await expect(closedSection.getByText(/Opens at/i).first()).toBeVisible();
    const notifyBtn = closedSection.getByRole('button', { name: 'Notify me' }).first();
    await notifyBtn.click();
    await expect(closedSection.getByRole('button', { name: 'Notified' }).first()).toBeVisible();
    await expect(closedSection.getByRole('button', { name: 'Pre-order' }).first()).toBeVisible();

    // Zero-result combination guard: toggling Veg only disables Fresh Chicken (0) chip cleanly
    const vegSwitch = page.getByRole('switch', { name: /Veg only/i });
    await vegSwitch.click();
    await expect(vegSwitch).toHaveAttribute('aria-checked', 'true');
    const chickenChip = page.getByRole('button', { name: /Fresh Chicken/i });
    await expect(chickenChip).toBeDisabled();
    await vegSwitch.click();

    // Sort controls (ETA, Rating, Price)
    const priceSortBtn = page.getByRole('button', { name: 'Price', exact: true });
    await priceSortBtn.click();
    await expect(priceSortBtn).toHaveAttribute('aria-pressed', 'true');

    // Axe accessibility check on /app
    const axeApp = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      axeApp.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    ).toEqual([]);

    // 3. Search suggestions + Recent searches + Search results page
    const searchInput = page.locator('#app-search-input');
    await searchInput.click();
    await searchInput.fill('Paneer');
    await expect(page.locator('#app-search-popover')).toBeVisible();
    await expect(page.locator('#app-search-popover').getByText(/Paneer/i).first()).toBeVisible();
    await searchInput.press('Enter');

    await expect(page).toHaveURL(/\/app\/search\?q=Paneer/);
    await expect(page.getByRole('heading', { name: /Results for "Paneer"/i })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Matching Vendors' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Matching Dishes' })).toBeVisible();

    // Axe accessibility check on /app/search
    const axeSearch = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      axeSearch.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    ).toEqual([]);

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test('/vendor/:slug displays Call, Save, Reviews summary tab, and Item Options Sheet with variants & add-ons', async ({
    page,
  }) => {
    const dayMockTs = Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString();
    await page.setExtraHTTPHeaders({ 'x-mock-time': dayMockTs });

    await page.goto('/vendor/kolkata-biryani-fast-food-pizza-house');
    await expect(page.getByRole('heading', { name: 'Kolkata Biryani Fast-Food Pizza House' })).toBeVisible({
      timeout: 15000,
    });

    // Call link + Save button + Night Safe notice
    const callLink = page.getByRole('link', { name: /Call Kolkata Biryani/i });
    await expect(callLink).toHaveAttribute('href', /^tel:/);
    await expect(page.getByRole('button', { name: /Save to favourites/i })).toBeVisible();
    await expect(page.getByText(/Campus Night Safety:/i)).toBeVisible();

    // Open Item Options Sheet for Egg Biryani (Customise button) -> select Full -> ₹199.00
    const eggBiryaniRow = page.locator('[data-menu-item="Egg Biryani"]').first();
    await eggBiryaniRow.getByRole('button', { name: 'Customise' }).click();
    await expect(page.getByRole('dialog', { name: 'Customise Item' })).toBeVisible();
    await page.getByLabel(/Full/i).check();
    const addPacketBtn = page.getByRole('button', { name: /Add to Packet • ₹199\.00/i });
    await expect(addPacketBtn).toBeVisible();
    await addPacketBtn.click();

    await expect(page.getByRole('button', { name: /Open Cart with 1 items/i })).toBeVisible();

    // Switch to Reviews tab and verify summary card
    await page.getByRole('tab', { name: /Reviews/i }).click();
    await expect(page.getByText('Student Rating Summary')).toBeVisible();
    await expect(page.getByText('/ 5.0')).toBeVisible();

    // Axe accessibility check on /vendor/:slug
    const axeVendor = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(
      axeVendor.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    ).toEqual([]);
  });
});
