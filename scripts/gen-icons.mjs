/**
 * Generates the app icons from a single hand-written SVG mark.
 *
 * Run with:  node scripts/gen-icons.mjs
 * Output:    public/icons/{favicon.svg,icon-192.png,icon-512.png,
 *                        icon-maskable-512.png,apple-touch-icon.png}
 *
 * The mark is an original rook glyph drawn in the project's ink/brass
 * palette on a warm paper ground. No emoji, no Unicode chess characters.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

/** The rook, drawn in a 100x100 coordinate space, base at y=86. */
const rook = `
  <g fill="url(#body)">
    <rect x="20" y="14" width="60" height="11" rx="2.5"/>
    <rect x="26" y="25" width="48" height="34" rx="3"/>
    <rect x="16" y="59" width="68" height="11" rx="2.5"/>
    <rect x="13" y="70" width="74" height="15" rx="3.5"/>
  </g>
  <g fill="url(#brass)">
    <rect x="30" y="20" width="6" height="5" rx="1"/>
    <rect x="47" y="20" width="6" height="5" rx="1"/>
    <rect x="64" y="20" width="6" height="5" rx="1"/>
  </g>
  <g stroke="rgba(255,255,255,0.35)" stroke-width="1.4" stroke-linecap="round">
    <path d="M29 29 L29 55"/>
    <path d="M20 62.5 L80 62.5" stroke="rgba(255,255,255,0.22)"/>
  </g>
  <path d="M13 85 L87 85 L87 88 L13 88 Z" fill="rgba(0,0,0,0.18)"/>
`;

/**
 * @param {{ size: number, pad: number, radius: number, plate: boolean }} o
 */
function svg({ size, pad, radius, plate }) {
  const s = size;
  const inner = s - pad * 2;
  const scale = inner / 100;
  const board =
    plate
      ? `<rect width="${s}" height="${s}" rx="${radius}" fill="url(#ground)"/>
         <g opacity="0.5">
           ${Array.from({ length: 4 }, (_, r) =>
             Array.from({ length: 4 }, (_, c) => {
               const cs = inner / 4;
               return (r + c) % 2 === 0
                 ? ''
                 : `<rect x="${pad + c * cs}" y="${pad + r * cs}" width="${cs}" height="${cs}" fill="#8a6a3c" opacity="0.16"/>`;
             }).join(''),
           ).join('')}
         </g>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f7f2e9"/><stop offset="1" stop-color="#e7dcc8"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a3227"/><stop offset="0.55" stop-color="#211b14"/>
      <stop offset="1" stop-color="#14100b"/>
    </linearGradient>
    <linearGradient id="brass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e0bd7a"/><stop offset="1" stop-color="#a67c3d"/>
    </linearGradient>
    <radialGradient id="sheen" cx="0.3" cy="0.15" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${board}
  <g transform="translate(${pad} ${pad}) scale(${scale})">${rook}</g>
  <rect width="${s}" height="${s}" rx="${radius}" fill="url(#sheen)"/>
</svg>`;
}

const favicon = svg({ size: 100, pad: 12, radius: 14, plate: true });
writeFileSync(join(outDir, 'favicon.svg'), favicon, 'utf8');
console.log('[icons] favicon.svg');

/** @type {Array<[string, {size:number,pad:number,radius:number,plate:boolean}]>} */
const pngs = [
  ['icon-192.png', { size: 192, pad: 22, radius: 0, plate: true }],
  ['icon-512.png', { size: 512, pad: 58, radius: 0, plate: true }],
  // Maskable icons must keep their content inside the safe circle (80% of the canvas).
  ['icon-maskable-512.png', { size: 512, pad: 110, radius: 0, plate: true }],
  ['apple-touch-icon.png', { size: 180, pad: 20, radius: 0, plate: true }],
];

for (const [name, opt] of pngs) {
  const buf = Buffer.from(svg(opt));
  await sharp(buf, { density: 384 }).png({ compressionLevel: 9 }).toFile(join(outDir, name));
  console.log(`[icons] ${name}`);
}
console.log('[icons] done');
