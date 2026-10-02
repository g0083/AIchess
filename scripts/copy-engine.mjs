/**
 * Copy the Stockfish WASM builds out of node_modules into public/engine/.
 *
 * - stockfish-19-lite-single.{js,wasm}  : ~1.8 MB, single threaded, no COOP/COEP
 *                                        headers required -> works fully offline.
 * - stockfish-19-single.{js,wasm}       : ~99 MB, optional "full strength" engine.
 *                                        Only copied when --full is passed, since
 *                                        it must never end up in the precache.
 *
 * The optional full build can also be fetched at runtime by the user from the
 * Settings screen; in that case the app downloads it directly from the same
 * upstream release and caches it in the browser cache storage.
 */
import { existsSync, copyFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const outDir = join(root, 'public', 'engine');
const wantFull = process.argv.includes('--full');

let binDir;
{
  // The stockfish package does not expose package.json through "exports",
  // so resolve the package root by walking node_modules directly.
  const candidates = [
    join(root, 'node_modules', 'stockfish', 'bin'),
    join(root, '..', 'node_modules', 'stockfish', 'bin'),
  ];
  binDir = candidates.find((d) => existsSync(d));
  if (!binDir) {
    console.error('[engine] stockfish package not found. Run `npm install` first.');
    process.exit(1);
  }
}

mkdirSync(outDir, { recursive: true });

/** @type {Array<[string, number]>} */
const targets = [
  ['stockfish-19-lite-single.js', 21_415],
  ['stockfish-19-lite-single.wasm', 1_787_571],
];
if (wantFull) {
  targets.push(['stockfish-19-single.js', 21_315], ['stockfish-19-single.wasm', 99_102_793]);
}

let copied = 0;
for (const [name, expected] of targets) {
  const src = join(binDir, name);
  const dst = join(outDir, name);
  if (!existsSync(src)) {
    console.error(`[engine] missing ${name} in ${binDir} - skipping`);
    continue;
  }
  const size = statSync(src).size;
  if (size === 0) {
    console.error(`[engine] ${name} is a 0-byte symlink placeholder - skipping`);
    continue;
  }
  if (size !== expected) {
    console.warn(`[engine] ${name}: expected ~${expected} bytes, found ${size}`);
  }
  copyFileSync(src, dst);
  copied += 1;
  console.log(`[engine] copied ${name} (${(size / 1024).toFixed(0)} KB)`);
}

if (copied === 0) {
  console.error('[engine] nothing was copied - the AI features will not work.');
  process.exit(1);
}
console.log(`[engine] done: ${copied} file(s) in public/engine`);
