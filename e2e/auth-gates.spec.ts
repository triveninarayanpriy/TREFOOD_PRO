import { test, expect } from '@playwright/test';

test.describe('Authentication (/signin), Demo Role Switcher, Gate Picker & Splash', () => {
  test('first-visit splash shows once on /, has 44px Skip button, never shows on reload or deep links', async ({
    page,
  }) => {
    // 1. Fresh visit to / displays splash with 44px+ Skip button
    await page.goto('/');
    const skipBtn = page.getByRole('button', { name: 'Skip' });
    await expect(skipBtn).toBeVisible();
    const box = await skipBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);

    await skipBtn.click();
    await expect(skipBtn).toBeHidden();

    // 2. Returning user reload does not show splash
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip' })).toBeHidden();

    // 3. Fresh storage deep link (/browse) never shows splash
    await page.evaluate(() => localStorage.removeItem('trefood_splash_seen'));
    await page.goto('/browse');
    await expect(page.getByRole('button', { name: 'Skip' })).toBeHidden();
    await expect(page.getByText('Delivering to Gate')).toBeVisible();
  });

  test('header shows Deliver to: gate, closed gate offers 1-tap nearest open gate, and choice persists on refresh', async ({
    page,
  }) => {
    // Freeze client clock to 19:45 IST (14:15 UTC) so Boys & Girls Hostels are Closed while Main Gate is Open 24x7
    await page.addInitScript(() => {
      const fixedNow = new Date('2026-11-10T14:15:00.000Z').getTime();
      const OriginalDate = Date;
      class MockDate extends OriginalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(fixedNow);
          } else {
            super(...(args as [string | number]));
          }
        }
        static now() {
          return fixedNow;
        }
      }
      window.Date = MockDate as DateConstructor;
    });

    await page.goto('/browse');

    // Header always displays Deliver to: + live status
    const gateBtn = page.getByRole('button', { name: /Deliver to:/i });
    await expect(gateBtn).toBeVisible();
    await expect(gateBtn).toContainText(/Main Gate/i);
    await expect(gateBtn).toContainText(/Open 24x7/i);

    // Open gate picker -> click closed Boys Hostel Gate -> explains why + offers 1-tap nearest open gate
    await gateBtn.click();
    await expect(page.getByRole('dialog', { name: 'Choose Delivery Gate' })).toBeVisible();
    await page.getByRole('button', { name: /Boys Hostel Gate/i }).click();

    await expect(page.getByText(/Boys Hostel Gate is closed right now/i)).toBeVisible();
    await expect(page.getByText(/Curfew ended at 19:30 IST/i)).toBeVisible();

    const switchBtn = page.getByRole('button', { name: /Switch to Main Gate/i });
    await expect(switchBtn).toBeVisible();
    await switchBtn.click();

    // Select Boys Hostel Gate again and keep it -> refresh retains choice cleanly
    await gateBtn.click();
    await page.getByRole('button', { name: /Boys Hostel Gate/i }).click();
    await page.getByRole('button', { name: /Keep Closed Gate/i }).click();
    await expect(gateBtn).toContainText(/Boys Hostel/i);
    await expect(gateBtn).toContainText(/Closed/i);

    await page.reload();
    await expect(page.getByRole('button', { name: /Deliver to:/i })).toContainText(/Boys Hostel/i);
  });

  test('/signin supports mock Google chooser, OTP dev toast fallback, Demo role switcher, returnTo, and session reload', async ({
    page,
  }) => {
    // 1. Guest can browse freely; tapping Favourite heart prompts /signin with returnTo
    await page.goto('/vendor/ganga-dhaba');
    await page.getByRole('button', { name: /Save to favourites/i }).click();
    await expect(page).toHaveURL(/\/signin\?returnTo=.*ganga-dhaba.*reason=favorites/);

    // 2. Mock Google Account Chooser returns user to where they were (/vendor/ganga-dhaba)
    await page.getByRole('button', { name: /Sign in with Google/i }).click();
    await expect(page.getByRole('heading', { name: 'Choose an NIT Patna Google Account' })).toBeVisible();
    await page.getByRole('button', { name: /Aarav Verma/i }).click();
    await expect(page).toHaveURL(/\/vendor\/ganga-dhaba/);

    // Session persists across refresh
    await page.reload();
    await page.goto('/favorites');
    await expect(page.getByRole('heading', { name: 'Saved Favourites' })).toBeVisible();

    // 3. Test Email OTP fallback dev toast & Demo Mode 3 role buttons on /signin
    await page.goto('/account');
    await page.getByText('Sign Out').click();

    await page.goto('/signin?returnTo=/orders');
    await expect(page.getByRole('button', { name: /Continue as Student/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue as Vendor/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue as Admin/i })).toBeVisible();

    // Test OTP request shows dev OTP code in toast and form
    const otpEmail = `otp_e2e_${Date.now()}@nitp.ac.in`;
    await page.locator('#signin-page-email').fill(otpEmail);
    await page.getByRole('button', { name: /Send 6-Digit Email OTP/i }).click();
    await expect(page.getByText(/Dev Email OTP for/i)).toBeVisible();

    // Switch role using Demo Vendor button -> lands cleanly on /v, persists on reload
    await page.goto('/signin');
    await page.getByRole('button', { name: /Continue as Vendor/i }).click();
    await expect(page).toHaveURL(/\/v/);
    await page.reload();
    await expect(page).toHaveURL(/\/v/);

    // Switch role to Demo Admin -> lands on /admin
    await page.goto('/signin');
    await page.getByRole('button', { name: /Continue as Admin/i }).click();
    await expect(page).toHaveURL(/\/admin/);
    await page.reload();
    await expect(page).toHaveURL(/\/admin/);
  });
});
