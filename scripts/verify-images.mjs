import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve('public');
const SEED_PATH = path.resolve('db/real-seed.json');
const WIDTHS = [320, 640, 960, 1440];

function toImageKey(imageUrl) {
  return imageUrl
    .replace(/^\/+images\//, '')
    .replace(/\.[a-z0-9]+$/i, '');
}

async function main() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const failures = [];

  // 1. Vendor audit checks (zero duplicate vendors, zero numeric suffixes)
  const seenSlugs = new Set();
  const seenVendorNames = new Set();
  for (const v of seed.vendors) {
    if (seenSlugs.has(v.slug)) failures.push(`Duplicate vendor slug: ${v.slug}`);
    seenSlugs.add(v.slug);

    const normName = v.name.trim().toLowerCase();
    if (seenVendorNames.has(normName)) failures.push(`Duplicate vendor name: ${v.name}`);
    seenVendorNames.add(normName);

    if (/\b\d{3,4}$/.test(v.name.trim()) || /-\d{3,4}$/.test(v.slug)) {
      failures.push(`Numeric suffix detected on vendor: ${v.name} (${v.slug})`);
    }
  }

  // 2. Collect every seed image reference & required crops
  const required = new Map();
  const addReq = (label, url, crops) => {
    if (!url || !url.startsWith('/images/')) {
      failures.push(`Missing or invalid local image path for ${label}: ${url}`);
      return;
    }
    const existing = required.get(url);
    if (existing) {
      crops.forEach((c) => existing.crops.add(c));
    } else {
      required.set(url, { label, url, crops: new Set(crops) });
    }
  };

  for (const v of seed.vendors) {
    addReq(`vendor:${v.slug}`, v.coverImageUrl, ['21x9', '4x3']);
  }
  for (const c of seed.categories) {
    addReq(`category:${c.id}`, c.imageUrl, ['21x9', '4x3']);
  }
  for (const qp of seed.quickPicks || []) {
    addReq(`quickPick:${qp.name}`, qp.imageUrl, ['1x1']);
  }
  for (const item of seed.menuItems) {
    addReq(`item:${item.id}`, item.imageUrl, ['1x1']);
  }
  addReq('brand:logo', '/images/brand/trefood-brand-logo.jpg', ['1x1']);

  // 3. Validate canonical width >= 640px & all AVIF/WebP variants exist
  const items = [...required.values()];
  let checked = 0;

  await Promise.all(
    items.map(async (entry) => {
      const srcAbs = path.join(PUBLIC_DIR, entry.url.replace(/^\//, ''));
      if (!fs.existsSync(srcAbs)) {
        failures.push(`Missing canonical seed image: ${entry.url} (${entry.label})`);
        return;
      }

      const meta = await sharp(srcAbs).metadata();
      if (!meta.width || meta.width < 640) {
        failures.push(
          `Seed image too narrow (<640px): ${entry.url} is ${meta.width || 0}x${meta.height || 0} (${entry.label})`
        );
      }

      const key = toImageKey(entry.url);
      for (const crop of entry.crops) {
        for (const w of WIDTHS) {
          for (const ext of ['avif', 'webp']) {
            const variantRel = path.join('images', 'r', path.dirname(key), `${path.basename(key)}--${crop}-${w}.${ext}`);
            const variantAbs = path.join(PUBLIC_DIR, variantRel);
            if (!fs.existsSync(variantAbs)) {
              failures.push(`Missing responsive variant: /${variantRel.replace(/\\/g, '/')} (${entry.label})`);
            }
          }
        }
      }
      checked++;
    })
  );

  if (failures.length > 0) {
    console.error(`verify-images FAILED (${failures.length} issues found across ${checked} assets):`);
    for (const f of failures.slice(0, 30)) {
      console.error('  -', f);
    }
    if (failures.length > 30) {
      console.error(`  ... and ${failures.length - 30} more issues.`);
    }
    process.exit(1);
  }

  console.log(
    `verify-images PASSED: ${checked} canonical assets (>=640px), ${seed.vendors.length} vendors (21:9 & 4:3), ${seed.menuItems.length} menu items (1:1), all 320/640/960/1440 AVIF+WebP present.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
