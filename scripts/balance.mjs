/**
 * Dev helper: reports brace/paren/bracket balance per file so a botched edit
 * can be located quickly. Run: node scripts/balance.mjs [files...]
 */
import { readFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'src');

function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(n)) out.push(p);
  }
  return out;
}

const targets = walk(srcDir);
const open = { '{': '}', '(': ')', '[': ']' };
const close = { '}': '{', ')': '(', ']': '[' };

for (const file of targets) {
  const src = readFileSync(file, 'utf8');
  const stack = [];
  let line = 1;
  let inStr = null;
  let inTmpl = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\n') {
      line++;
      continue;
    }
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (inTmpl) {
      if (c === '\\') i++;
      else if (c === '`') inTmpl = false;
      continue;
    }
    if (c === '"' || c === "'") {
      inStr = c;
      continue;
    }
    if (c === '`') {
      inTmpl = true;
      continue;
    }
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      line++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] === '\n') line++;
        i++;
      }
      i++;
      continue;
    }
    if (open[c]) {
      stack.push({ c, line });
    } else if (close[c]) {
      const top = stack.pop();
      if (!top) {
        console.log(`${relative(root, file)}:${line} unexpected "${c}"`);
      } else if (top.c !== close[c]) {
        console.log(
          `${relative(root, file)}:${line} "${c}" closes "${top.c}" opened at line ${top.line}`,
        );
      }
    }
  }
  for (const s of stack) {
    console.log(`${relative(root, file)}:${s.line} unclosed "${s.c}"`);
  }
}
console.log('balance check done');