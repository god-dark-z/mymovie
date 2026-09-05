/**
 * Rasterises the CINEORA brand assets from `src/components/brand/marks.ts`, so
 * the icons can never drift from the logo the app renders.
 *
 *   node scripts/generate-icons.mjs
 *
 * Outputs
 *   src/app/icon.svg              favicon (Next.js metadata convention)
 *   src/app/apple-icon.png        180px iOS home-screen icon
 *   public/icons/icon-{192,512}.png            PWA icons
 *   public/icons/maskable-{192,512}.png        Android adaptive icons
 *   public/og.png                 1200x630 social card
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

import {
  BRAND_INK,
  BRAND_SWEEP,
  MARK_ARC,
  MARK_ARC_WIDTH,
  MARK_PLAY,
  MARK_PLAY_WIDTH,
  MARK_RING,
  MARK_RING_WIDTH,
  WORDMARK_APERTURE,
  WORDMARK_INK_WIDTH,
  WORDMARK_LETTERS,
  WORDMARK_STROKE,
} from '../src/components/brand/marks.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const stops = BRAND_SWEEP.map(
  (stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`,
).join('');

/** The mark, drawn into a 64-unit box at an arbitrary offset and scale. */
function markGroup({ scale = 1, x = 0, y = 0, paint = 'url(#sweep)' } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${scale})" fill="none"
      stroke-linecap="round" stroke-linejoin="round">
    <path d="${MARK_RING}" stroke="${paint}" stroke-width="${MARK_RING_WIDTH}"/>
    <path d="${MARK_ARC}" stroke="${paint}" stroke-width="${MARK_ARC_WIDTH}" opacity="0.55"/>
    <path d="${MARK_PLAY}" fill="${paint}" stroke="${paint}" stroke-width="${MARK_PLAY_WIDTH}"/>
  </g>`;
}

/**
 * App icon: the mark on a black-glass tile.
 *
 * `inset` reserves the maskable safe zone — Android may crop an adaptive icon to
 * a circle, so the artwork has to survive losing the corners.
 */
function iconSvg({ size = 512, inset = 0.16, rounded = true } = {}) {
  const radius = rounded ? size * 0.235 : 0;
  const artSize = size * (1 - inset * 2);
  const scale = artSize / 64;
  const offset = size * inset;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0%" stop-color="#12151d"/>
      <stop offset="55%" stop-color="#090b11"/>
      <stop offset="100%" stop-color="${BRAND_INK}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.12" r="0.8">
      <stop offset="0%" stop-color="#d4213d" stop-opacity="0.3"/>
      <stop offset="70%" stop-color="#d4213d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#tile)"/>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#glow)"/>
  ${markGroup({ scale, x: offset, y: offset })}
  <rect x="0.5" y="0.5" width="${size - 1}" height="${size - 1}" rx="${Math.max(radius - 0.5, 0)}"
    fill="none" stroke="#ffffff" stroke-opacity="0.10"/>
</svg>`;
}

/** 1200x630 social card: the lockup on black glass with a single ruby bloom. */
function ogSvg() {
  const markScale = 132 / 64;
  const wordWidth = 430;
  const wordScale = wordWidth / WORDMARK_INK_WIDTH;
  const lockupWidth = 132 + 36 + wordWidth;
  const markX = Math.round((1200 - lockupWidth) / 2);
  const markY = 224;
  const wordX = markX + 132 + 36 - 5 * wordScale;
  const wordY = 290 - (77 * wordScale) / 2 - 11.5 * wordScale;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="1">${stops}</linearGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#0d1017"/>
      <stop offset="60%" stop-color="#07080d"/>
      <stop offset="100%" stop-color="${BRAND_INK}"/>
    </linearGradient>
    <radialGradient id="bloom" cx="0.5" cy="0.06" r="0.72">
      <stop offset="0%" stop-color="#d4213d" stop-opacity="0.36"/>
      <stop offset="100%" stop-color="#d4213d" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#bloom)"/>
  ${markGroup({ scale: markScale, x: markX, y: markY })}
  <g transform="translate(${wordX} ${wordY}) scale(${wordScale})" fill="none"
     stroke-width="${WORDMARK_STROKE}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${WORDMARK_LETTERS}" stroke="#eef0f5"/>
    <path d="${WORDMARK_APERTURE}" stroke="url(#sweep)"/>
  </g>
  <rect x="420" y="404" width="360" height="1" fill="url(#rule)"/>
  <text x="600" y="462" text-anchor="middle" fill="#939bad" letter-spacing="11"
    font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="25" font-weight="600">
    MOVIES · SERIES · ANIME
  </text>
</svg>`;
}

async function png(svg, outPath, size) {
  await mkdir(dirname(outPath), { recursive: true });
  const image = sharp(Buffer.from(svg), { density: 384 });
  const pipeline = size ? image.resize(size, size, { fit: 'contain' }) : image;
  await pipeline.png({ compressionLevel: 9, palette: false }).toFile(outPath);
  return outPath;
}

async function main() {
  const written = [];

  // Favicon: SVG so it stays sharp at every size a browser asks for.
  const faviconPath = join(root, 'src/app/icon.svg');
  await mkdir(dirname(faviconPath), { recursive: true });
  await writeFile(faviconPath, `${iconSvg({ size: 64, inset: 0.11 })}\n`, 'utf8');
  written.push(faviconPath);

  // iOS crops nothing but rounds the corners itself, so ship a square tile.
  written.push(await png(iconSvg({ size: 512, inset: 0.15, rounded: false }), join(root, 'src/app/apple-icon.png'), 180));

  for (const size of [192, 512]) {
    written.push(await png(iconSvg({ size: 512 }), join(root, `public/icons/icon-${size}.png`), size));
    written.push(
      await png(
        iconSvg({ size: 512, inset: 0.26, rounded: false }),
        join(root, `public/icons/maskable-${size}.png`),
        size,
      ),
    );
  }

  written.push(await png(ogSvg(), join(root, 'public/og.png')));

  for (const path of written) console.log(`  ${path.replace(root, '.').replace(/\\/g, '/')}`);
}

await main();



