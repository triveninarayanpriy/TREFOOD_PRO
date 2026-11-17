import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve('public');
const SEED_PATH = path.resolve('db/real-seed.json');
const MANIFEST_PATH = path.resolve('src/shared/image-manifest.ts');
const WIDTHS = [320, 640, 960, 1440];
const FORCE = process.argv.includes('--force');

const CROP_RATIOS = {
  '21x9': [21, 9],
  '4x3': [4, 3],
  '1x1': [1, 1],
};

function toImageKey(imageUrl) {
  return imageUrl
    .replace(/^\/+images\//, '')
    .replace(/\.[a-z0-9]+$/i, '');
}

function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
      .join('')
  );
}

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function processAsset(task) {
  const srcAbs = path.join(PUBLIC_DIR, task.url.replace(/^\//, ''));
  if (!fs.existsSync(srcAbs)) {
    throw new Error(`Missing source asset: ${task.url} (${srcAbs})`);
  }

  let srcStat = await fs.promises.stat(srcAbs);
  let srcBuf = await fs.promises.readFile(srcAbs);
  const meta = await sharp(srcBuf).metadata();

  // Upgrade sub-640 authentic thumbnails cleanly to 640px so every canonical seed asset >= 640px wide
  if ((meta.width || 0) < 640) {
    const ratio = (meta.height || 400) / Math.max(1, meta.width || 400);
    const targetH = Math.max(640, Math.round(640 * ratio));
    const ext = path.extname(srcAbs).toLowerCase();
    let pipeline = sharp(srcBuf)
      .resize(640, targetH, { kernel: sharp.kernel.lanczos3, fit: 'cover' })
      .sharpen({ sigma: 0.6 });
    if (ext === '.webp') {
      srcBuf = await pipeline.webp({ quality: 86 }).toBuffer();
    } else if (ext === '.png') {
      srcBuf = await pipeline.png({ compressionLevel: 9 }).toBuffer();
    } else {
      srcBuf = await pipeline.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    }
    await fs.promises.writeFile(srcAbs, srcBuf);
    srcStat = await fs.promises.stat(srcAbs);
  }

  const stats = await sharp(srcBuf).stats();
  const dom = stats.dominant;
  const colorHex = rgbToHex(dom.r, dom.g, dom.b);
  const key = toImageKey(task.url);

  for (const crop of task.crops) {
    const [rw, rh] = CROP_RATIOS[crop];
    for (const w of WIDTHS) {
      const h = Math.round((w * rh) / rw);
      const outDir = path.join(PUBLIC_DIR, 'images', 'r', path.dirname(key));
      await ensureDir(outDir);
      const baseName = `${path.basename(key)}--${crop}-${w}`;
      const avifPath = path.join(outDir, `${baseName}.avif`);
      const webpPath = path.join(outDir, `${baseName}.webp`);

      const needAvif =
        FORCE ||
        !fs.existsSync(avifPath) ||
        fs.statSync(avifPath).size === 0 ||
        fs.statSync(avifPath).mtimeMs < srcStat.mtimeMs;
      const needWebp =
        FORCE ||
        !fs.existsSync(webpPath) ||
        fs.statSync(webpPath).size === 0 ||
        fs.statSync(webpPath).mtimeMs < srcStat.mtimeMs;

      if (!needAvif && !needWebp) continue;

      const resized = sharp(srcBuf).resize(w, h, {
        fit: 'cover',
        position: crop === '1x1' ? 'attention' : 'centre',
        kernel: sharp.kernel.lanczos3,
      });

      if (needAvif) {
        await resized
          .clone()
          .avif({ quality: 48, effort: 1 })
          .toFile(avifPath);
      }
      if (needWebp) {
        await resized
          .clone()
          .webp({ quality: 78, effort: 2 })
          .toFile(webpPath);
      }
    }
  }

  return { key, colorHex };
}

async function runPool(items, concurrency, workerFn) {
  const results = [];
  let idx = 0;
  let done = 0;

  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      const res = await workerFn(items[current]);
      results.push(res);
      done++;
      if (done % 50 === 0 || done === items.length) {
        console.log(`Processed ${done}/${items.length} assets...`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

async function main() {
  const started = Date.now();
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

  const taskMap = new Map();
  const addTask = (url, crops) => {
    if (!url || !url.startsWith('/images/')) return;
    const prev = taskMap.get(url);
    if (prev) {
      crops.forEach((c) => prev.crops.add(c));
    } else {
      taskMap.set(url, { url, crops: new Set(crops) });
    }
  };

  for (const v of seed.vendors) {
    addTask(v.coverImageUrl, ['21x9', '4x3']);
  }
  for (const c of seed.categories) {
    addTask(c.imageUrl, ['21x9', '4x3']);
  }
  for (const b of seed.banners || []) {
    addTask(b, ['21x9']);
  }
  for (const qp of seed.quickPicks || []) {
    addTask(qp.imageUrl, ['1x1']);
  }
  for (const item of seed.menuItems) {
    addTask(item.imageUrl, ['1x1']);
  }
  addTask('/images/brand/trefood-brand-logo.jpg', ['1x1']);

  const tasks = [...taskMap.values()].map((t) => ({ url: t.url, crops: [...t.crops] }));
  console.log(`Building responsive AVIF/WebP variants for ${tasks.length} unique images...`);

  const pairs = await runPool(tasks, 4, processAsset);
  pairs.sort((a, b) => a.key.localeCompare(b.key));

  const colorObj = Object.fromEntries(pairs.map((p) => [p.key, p.colorHex]));

  const tsLines = [
    '// Auto-generated by scripts/build-images.mjs — DO NOT EDIT MANUALLY.',
    '// Maps normalized image paths (without leading /images/ or extension) to dominant hex placeholders',
    '// and builds responsive AVIF + WebP srcset URLs across 320, 640, 960, 1440px widths.',
    '',
    'export type ImageCrop = \'21x9\' | \'4x3\' | \'1x1\';',
    '',
    'export const RESPONSIVE_WIDTHS = [320, 640, 960, 1440] as const;',
    '',
    'export const DEFAULT_VENDOR_FALLBACK_COVER = \'/images/categories/food.jpg\';',
    '',
    'export const IMAGE_CROP_DIMENSIONS: Record<ImageCrop, { width: number; height: number }> = {',
    "  '21x9': { width: 1440, height: 617 },",
    "  '4x3': { width: 960, height: 720 },",
    "  '1x1': { width: 640, height: 640 },",
    '};',
    '',
    'export function toImageKey(imageUrl: string): string {',
    "  return imageUrl.replace(/^\\/+images\\//, '').replace(/\\.[a-z0-9]+$/i, '');",
    '}',
    '',
    `export const IMAGE_COLORS: Record<string, string> = ${JSON.stringify(colorObj, null, 2)};`,
    '',
    'export function getDominantColor(imageUrl?: string | null): string {',
    "  if (!imageUrl) return '#EFE6D8';",
    '  const key = toImageKey(imageUrl);',
    "  return IMAGE_COLORS[key] || '#EFE6D8';",
    '}',
    '',
    'export function hasResponsiveVariant(imageUrl?: string | null): boolean {',
    '  if (!imageUrl) return false;',
    '  return Boolean(IMAGE_COLORS[toImageKey(imageUrl)]);',
    '}',
    '',
    'export function buildResponsiveUrls(imageUrl: string, crop: ImageCrop) {',
    '  const key = toImageKey(imageUrl);',
    '  const avifSrcSet = RESPONSIVE_WIDTHS.map((w) => `/images/r/${key}--${crop}-${w}.avif ${w}w`).join(\', \');',
    '  const webpSrcSet = RESPONSIVE_WIDTHS.map((w) => `/images/r/${key}--${crop}-${w}.webp ${w}w`).join(\', \');',
    '  const fallbackSrc = `/images/r/${key}--${crop}-640.webp`;',
    '  return { avifSrcSet, webpSrcSet, fallbackSrc };',
    '}',
    '',
  ];

  fs.writeFileSync(MANIFEST_PATH, tsLines.join('\n'));
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`Image pipeline completed in ${elapsed}s -> wrote ${MANIFEST_PATH} (${pairs.length} keys).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
