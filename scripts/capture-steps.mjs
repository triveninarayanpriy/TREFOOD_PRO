/* global document, localStorage */
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT_DIR = path.resolve('public/images/steps');
const BASE_URL = process.env.CAPTURE_URL || 'http://127.0.0.1:5173';

async function waitForServer(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Wait for local Vite + Worker dev server
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  let serverProc = null;
  let startedLocal = false;
  try {
    await fetch(BASE_URL);
  } catch {
    startedLocal = true;
    serverProc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
      stdio: 'ignore',
      shell: true,
    });
    await waitForServer(BASE_URL);
  }

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 720, height: 800 },
      deviceScaleFactor: 1,
      extraHTTPHeaders: {
        // 14:00 IST (08:30 UTC) so open NIT Patna counters appear cleanly
        'x-mock-time': Math.floor(new Date().setUTCHours(8, 30, 0, 0) / 1000).toString(),
      },
    });
    const page = await context.newPage();

    // Dismiss splash cleanly on capture context
    await page.addInitScript(() => {
      localStorage.setItem('trefood_splash_seen', '1');
    });

    // Step 1 & 2 from live /app
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const gateBoard = page.locator('section[aria-label="Campus gate departure board"]').first();
    await gateBoard.waitFor({ state: 'visible', timeout: 10000 });
    await gateBoard.scrollIntoViewIfNeeded();
    await gateBoard.screenshot({ path: path.join(OUT_DIR, 'step-1-gate.png') });

    const vendorCard = page.locator('article[data-vendor-variant="open"]').first();
    await vendorCard.waitFor({ state: 'visible', timeout: 10000 });
    await vendorCard.scrollIntoViewIfNeeded();
    await vendorCard.screenshot({ path: path.join(OUT_DIR, 'step-2-vendor.png') });

    // Step 3 (PaperBill) & Step 4 (PacketChit) from live R2 Print Kit
    await page.goto(`${BASE_URL}/dev/ui`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const bill = page.locator('.tf-paper-bill').first();
    await bill.scrollIntoViewIfNeeded();
    await bill.screenshot({ path: path.join(OUT_DIR, 'step-3-track.png') });

    const chit = page.locator('[data-testid="packet-chit"]').first();
    await chit.scrollIntoViewIfNeeded();
    await chit.screenshot({ path: path.join(OUT_DIR, 'step-4-code.png') });

    console.log('Captured 4 refreshed step screenshots into', OUT_DIR);
  } finally {
    await browser.close();
    if (startedLocal && serverProc) {
      serverProc.kill();
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
