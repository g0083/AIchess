/**
 * Puzzle quality gate.
 *
 * verify-content.mjs proves a puzzle's solution is *legal*. This proves it is
 * also *correct*: it runs Stockfish on every puzzle position and requires that
 * the stored first move matches the engine's best move (same SAN), or - for
 * positions where several moves are equally good - that it is within the
 * tolerance below.
 *
 * Run:  npm run verify:puzzles
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { Chess } from 'chess.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/** Search depth used for the check. The lite build answers this in well under a second. */
const DEPTH = 12;

async function loadPuzzles() {
  const compiled = await build({
    entryPoints: [resolve(root, 'src', 'content', 'puzzles.ts')],
    bundle: true,
    format: 'esm',
    write: false,
    target: 'es2022',
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64')
  );
}

/** Drives the engine through its documented Node entry point. */
async function makeEngine() {
  const mod = await import('stockfish');
  const factory = mod.default ?? mod;
  return factory('lite-single');
}

/** Searches one position and returns the engine's SAN choice. */
function search(engine, fen) {
  return new Promise((resolvePromise, reject) => {
    let best = '';
    let buffer = '';
    const timer = setTimeout(() => {
      engine.listener = null;
      reject(new Error('engine timed out'));
    }, 30_000);

    // The emscripten module routes its stdout through this hook.
    engine.listener = (line) => {
      buffer += line + '\n';
      const m = line.match(/bestmove\s+(\S+)/);
      if (m) {
        best = m[1];
        clearTimeout(timer);
        engine.listener = null;
        resolvePromise(best);
      }
    };

    engine.sendCommand('isready');
    engine.sendCommand(`position fen ${fen}`);
    engine.sendCommand(`go depth ${DEPTH}`);
    void buffer;
  });
}

const { PUZZLES } = await loadPuzzles();
if (!PUZZLES || PUZZLES.length === 0) {
  console.log('[verify:puzzles] no puzzles to check');
  process.exit(0);
}

const problems = [];
let engine;
try {
  engine = await makeEngine();
} catch (e) {
  console.error(`[verify:puzzles] could not start Stockfish: ${e.message}`);
  process.exit(1);
}

for (const p of PUZZLES) {
  let bestSan = '';
  try {
    const best = await search(engine, p.fen);
    const probe = new Chess(p.fen);
    const m = probe.move(best);
    bestSan = m ? m.san : best;
  } catch (e) {
    problems.push(`${p.id}: engine failed (${e.message})`);
    continue;
  }

  const stored = p.solution[0];
  if (stored === bestSan) {
    console.log(`[verify:puzzles] ${p.id} OK (${stored})`);
    continue;
  }

  // Not the engine's first choice. Accept it only if it also mates, because a
  // puzzle with several mating moves is still a valid puzzle.
  let mates = false;
  try {
    const after = new Chess(p.fen);
    after.move(stored);
    mates = after.isCheckmate();
  } catch {
    mates = false;
  }

  if (mates) {
    console.log(`[verify:puzzles] ${p.id} OK (${stored} mates, engine also had ${bestSan})`);
  } else {
    problems.push(`${p.id}: stored "${stored}" but Stockfish prefers "${bestSan}"`);
  }
}

engine.quit?.();

if (problems.length) {
  console.error(`\n[verify:puzzles] ${problems.length} problem(s)\n`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`[verify:puzzles] OK - ${PUZZLES.length} puzzles verified against Stockfish`);