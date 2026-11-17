import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const QA_DIR = path.resolve(process.cwd(), 'docs/qa');
if (!fs.existsSync(QA_DIR)) {
  fs.mkdirSync(QA_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '360', width: 360, height: 800 },
  { name: '390', width: 390, height: 844 },
  { name: '430', width: 430, height: 932 },
  { name: '768', width: 768, height: 1024 },
  { name: '1024', width: 1024, height: 768 },
  { name: '1280', width: 1280, height: 800 },
  { name: '1440', width: 1440, height: 900 },
  { name: '1920', width: 1920, height: 1080 },
] as const;

const THEMES = ['light', 'dark'] as const;

interface RouteDefinition {
  key: string;
  url: string;
  readySelector: string;
  requiresAuth?: boolean;
}

const ROUTES: RouteDefinition[] = [
  { key: 'landing', url: '/', readySelector: 'h1' },
  { key: 'home', url: '/app', readySelector: 'h1, h2' },
  { key: 'search', url: '/app/search?q=paneer', readySelector: 'h1, h2, input' },
  { key: 'vendor', url: '/vendor/wrapchik-pizza', readySelector: 'h1' },
  { key: 'checkout', url: '/checkout', readySelector: 'h1, h2', requiresAuth: true },
  { key: 'orders', url: '/orders', readySelector: 'h1, h2', requiresAuth: true },
  { key: 'account', url: '/account', readySelector: 'h1, h2', requiresAuth: true },
  { key: 'favorites', url: '/favorites', readySelector: 'h1, h2', requiresAuth: true },
  { key: 'about', url: '/about', readySelector: 'h1' },
];

test.describe('Prompt P5 Quality Gate: Responsive & Theme Screenshot Suite', () => {
  test.setTimeout(300000); // 5 mins total

  for (const vp of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`[${vp.name}px - ${theme}] captures full-fidelity screenshots and asserts zero overflow`, async ({
        page,
      }) => {
        const consoleErrors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
          }
        });

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.emulateMedia({ colorScheme: theme });

        await page.addInitScript((th) => {
          localStorage.setItem('trefood_splash_seen', '1');
          localStorage.setItem('trefood_theme', th);
        }, theme);

        // Pre-authenticate demo student so authenticated routes have realistic live data
        await page.goto('/signin');
        await page.evaluate(async () => {
          await fetch('/api/auth/demo/student', { method: 'POST' });
        });

        // Ensure at least one order exists for tracking screenshot
        const ordersData = (await page.evaluate(async () => {
          try {
            const res = await fetch('/api/orders');
            return await res.json();
          } catch {
            return {};
          }
        })) as { orders?: Array<{ id: string }> };

        let sampleOrderId = ordersData.orders?.[0]?.id;

        // If no orders exist, place a test order
        if (!sampleOrderId) {
          const createdOrder = (await page.evaluate(async () => {
            try {
              const res = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Idempotency-Key': `qa-${Date.now()}`,
                },
                body: JSON.stringify({
                  vendorId: 'vendor_wrapchik_pizza',
                  gateId: 'gate_main',
                  items: [{ menuItemId: 'item_wp_farmhouse_medium', quantity: 1 }],
                }),
              });
              return await res.json();
            } catch {
              return {};
            }
          })) as { order?: { id: string } };
          sampleOrderId = createdOrder.order?.id;
        }

        const activeRoutes: RouteDefinition[] = [...ROUTES];
        if (sampleOrderId) {
          activeRoutes.push({
            key: 'tracking',
            url: `/orders/${sampleOrderId}`,
            readySelector: 'h1, h2, [data-code]',
            requiresAuth: true,
          });
        }

        for (const route of activeRoutes) {
          await page.goto(route.url);
          await page.locator(route.readySelector).first().waitFor({ state: 'visible', timeout: 15000 });

          // Ensure theme attribute is synced
          if (theme === 'dark') {
            await page.evaluate(() => {
              document.documentElement.classList.add('dark');
              document.documentElement.setAttribute('data-theme', 'dark');
            });
          } else {
            await page.evaluate(() => {
              document.documentElement.classList.remove('dark');
              document.documentElement.setAttribute('data-theme', 'light');
            });
          }

          // Let animations and image loads settle
          await page.evaluate(() =>
            Promise.all(
              document
                .getAnimations()
                .filter((a) => a.effect?.getComputedTiming().iterations === 1)
                .map((a) => a.finished)
            )
          );

          // Quality Rule: Zero horizontal overflow across all tested viewports
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1
          );
          expect(overflow, `Horizontal overflow on ${route.key} at ${vp.width}px (${theme})`).toBe(false);

          // Save screenshot
          const screenshotPath = path.join(QA_DIR, `${route.key}-${vp.name}-${theme}.png`);
          await page.screenshot({
            path: screenshotPath,
            fullPage: false,
          });
        }

        // Verify no console errors during audit
        const filteredConsoleErrors = consoleErrors.filter(
          (err) =>
            !err.includes('Download the React DevTools') &&
            !err.includes('[vite]') &&
            !err.includes('favicon')
        );
        expect(filteredConsoleErrors, `Console errors at ${vp.width}px (${theme})`).toEqual([]);
      });
    }
  }
});
