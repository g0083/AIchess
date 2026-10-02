/**
 * Content verifier.
 *
 * 1. Text integrity. Long Japanese prose is easy to corrupt, so two mechanical
 *    checks guard the shipped copy:
 *      - no Unicode replacement character (U+FFFD)
 *      - no kana immediately followed by a long Latin run, which is the
 *        signature of a stray machine word pasted into a Japanese sentence
 * 2. Chess validity: every FEN parses, every puzzle solution is legal.
 *
 * Diagnostics are ASCII-only on purpose: the Windows console mangles Japanese.
 * Run:  npm run verify:content
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const srcDir = resolve(root, 'src');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(srcDir);
const errors = [];

/* ------------------------------------------------------ 1. text integrity */

/** Kana (or any CJK) glued directly to a 4+ letter Latin word. */
const STRAY_LATIN = /[぀-ヿ一-鿿][A-Za-z]{4,}[A-Za-z]*/g;
/** Latin word glued to the start of CJK, e.g. "uidます". */
const STRAY_LATIN2 = /[A-Za-z]{4,}[A-Za-z]*[぀-ヿ]/g;

for (const file of files) {
  const rel = relative(root, file);
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const at = `${rel}:${i + 1}`;
      if (line.includes('�')) errors.push(`${at} contains U+FFFD`);
      for (const m of line.matchAll(STRAY_LATIN)) {
        errors.push(`${at} stray Latin in Japanese: "${m[0]}"`);
      }
      for (const m of line.matchAll(STRAY_LATIN2)) {
        errors.push(`${at} stray Latin in Japanese: "${m[0]}"`);
      }
    });
}
/* ------------------------------------------------------ 2. chess validity */
async function loadTs(path) {
  const compiled = await build({
    entryPoints: [path],
    bundle: true,
    format: 'esm',
    write: false,
    target: 'es2022',
    platform: 'neutral',
    external: ['chess.js', 'react', 'react-dom'],
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64')
  );
}

/** Every FEN carried by an exported content array must parse. */
async function checkFens(modulePath, exportNames) {
  const abs = join(srcDir, modulePath);
  let mod;
  try {
    mod = await loadTs(abs);
  } catch (e) {
    errors.push(`${modulePath}: failed to load (${e.message})`);
    return;
  }
  const { Chess } = await import('chess.js');
  for (const key of exportNames) {
    const value = mod[key];
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      const fens = [item?.fen, ...(item?.task?.fen ? [item.task.fen] : [])];
      for (const fen of fens) {
        if (typeof fen !== 'string') continue;
        try {
          new Chess(fen);
        } catch {
          errors.push(`${modulePath} ${key} ${item.id ?? ''}: bad FEN "${fen}"`);
        }
      }
    }
  }
}

/** Every puzzle solution must be a legal move sequence. */
async function checkPuzzles(modulePath) {
  const abs = join(srcDir, modulePath);
  let mod;
  try {
    mod = await loadTs(abs);
  } catch (e) {
    errors.push(`${modulePath}: failed to load (${e.message})`);
    return;
  }
  const { Chess } = await import('chess.js');
  for (const p of mod.PUZZLES ?? []) {
    let c;
    try {
      c = new Chess(p.fen);
    } catch {
      errors.push(`${modulePath} puzzle ${p.id}: bad FEN "${p.fen}"`);
      continue;
    }
    if (!Array.isArray(p.solution) || p.solution.length === 0) {
      errors.push(`${modulePath} puzzle ${p.id}: empty solution`);
      continue;
    }
    for (const san of p.solution) {
      const before = c.fen();
      let ok = false;
      try {
        ok = Boolean(c.move(san));
      } catch {
        ok = false;
      }
      if (!ok) {
        errors.push(`${modulePath} puzzle ${p.id}: illegal move "${san}" from ${before}`);
        break;
      }
    }
  }
}

for (const [path, names] of [
  ['content/glossary.ts', ['GLOSSARY']],
  ['content/lessons.ts', ['LESSONS']],
  ['content/openings.ts', ['OPENINGS']],
]) {
  await checkFens(path, names);
}
await checkPuzzles('content/puzzles.ts');

/* ----------------------------------------------------------------- report */
if (errors.length) {
  console.error(`\n[verify:content] ${errors.length} problem(s)\n`);
  for (const e of errors.slice(0, 60)) console.error('  ' + e);
  if (errors.length > 60) console.error(`  ... and ${errors.length - 60} more`);
  process.exit(1);
}
console.log(`[verify:content] OK - ${files.length} files checked`);