/**
 * Dev helper: rasterises every piece into one contact sheet so the artwork can
 * be eyeballed without launching the app.
 *
 * Run: node scripts/preview-pieces.mjs [outfile] [theme]
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const out = resolve(root, process.argv[2] ?? 'preview-pieces.png');

const compiled = await build({
  entryPoints: [resolve(root, 'src', 'chess', 'pieces.ts')],
  bundle: true,
  format: 'esm',
  write: false,
  target: 'es2022',
});
const { pieceImage, paletteFor } = await import(
  'data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64')
);

// The SVG now carries literal colours, so it can be rasterised directly.
const palette = paletteFor(process.argv[3] ?? 'washi');

const roles = ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'];
const CELL = 120;
const cells = [];

function dataUriToBuffer(uri) {
  const b64 = uri.replace(/^url\("data:image\/svg\+xml;base64,/, '').replace(/"\)$/, '');
  return Buffer.from(b64, 'base64');
}

for (let c = 0; c < roles.length; c++) {
  for (let r = 0; r < 2; r++) {
    const role = roles[c];
    const color = r === 0 ? 'white' : 'black';
    const svg = dataUriToBuffer(pieceImage(role, color, palette)).toString('utf8');
    const bg = r === 0 ? '#a8794a' : '#e9dcc2';
    cells.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${CELL}">` +
          `<rect width="${CELL}" height="${CELL}" fill="${bg}"/>` +
          `<g transform="translate(10 10) scale(${(CELL - 20) / 45})">${svg}</g></svg>`,
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