/**
 * Dev helper: renders every piece to a single PNG contact sheet so the artwork
 * can be eyeballed without launching the app.
 *
 * Run:  node scripts/preview-pieces.mjs [outfile]
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, process.argv[2] ?? 'preview-pieces.png');

const VARS = {
  white: {
    '--piece-white': '#f6f1e6',
    '--piece-white-edge': '#2b2620',
    '--piece-detail': '#8b8071',
    '--piece-sheen': '#ffffff',
  },
  black: {
    '--piece-black': '#241f19',
    '--piece-black-edge': '#050403',
    '--piece-detail': '#6a5f52',
    '--piece-sheen': '#9c8f7c',
  },
};

// pieces.ts is TypeScript, so compile it with esbuild before importing.
const compiled = await build({
  entryPoints: [resolve(root, 'src', 'chess', 'pieces.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  target: 'es2022',
});
const { pieceImage } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64')
);

const roles = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
const CELL = 120;
const cells = [];

function dataUriToBuffer(uri) {
  const b64 = uri.replace(/^url\("data:image\/svg\+xml,/, '').replace(/"\)$/, '');
  return Buffer.from(decodeURIComponent(b64), 'utf8');
}

for (let c = 0; c < roles.length; c++) {
  for (let r = 0; r < 2; r++) {
    const role = roles[c];
    const color = r === 0 ? 'white' : 'black';
    let svg = dataUriToBuffer(pieceImage(role, color)).toString('utf8');
    for (const [k, v] of Object.entries(VARS[color])) svg = svg.replaceAll(`var(${k})`, v);
    const bg = r === 0 ? '#a8794a' : '#e9dcc2';
    cells.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}"><rect width="${CELL}" height="${CELL}" fill="${bg}"/><g transform="translate(10 10) scale(${(CELL - 20) / 45})">${svg}</g></svg>`,
      ),
      left: c * CELL,
      top: r * CELL,
    });
  }
}

await sharp({
  create: { width: CELL * roles.length, height: CELL * 2, channels: 4, background: '#ffffff' },
})
  .composite(cells)
  .png()
  .toFile(out);

console.log('[preview] wrote', out);

