/**
 * Local stand-in for GitHub Pages / Cloudflare Pages sub-path hosting.
 *
 * GitHub Pages serves the repo at https://<user>.github.io/<repo>/, so the app
 * must work with every URL relative rather than absolute. This serves ./dist
 * under a configurable prefix and reports the status of every asset the built
 * index.html references, so a broken sub-path assumption fails loudly here
 * instead of after deployment.
 *
 * Run:  node scripts/serve-subpath.mjs [prefix] [port]
 *        node scripts/serve-subpath.mjs /AIchess 4174
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '..', 'dist');
const prefix = (process.argv[2] ?? '/AIchess').replace(/\/+$/, '');
const port = Number(process.argv[3] ?? 4174);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon',
};

if (!existsSync(dist)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

/** Resolves a URL path to a file inside dist/, refusing traversal. */
function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const abs = join(dist, clean);
  if (!abs.startsWith(dist)) return null;
  if (existsSync(abs) && statSync(abs).isFile()) return abs;
  // SPA fallback: unknown paths without a file extension render index.html.
  if (!extname(clean)) {
    const index = join(dist, 'index.html');
    if (existsSync(index)) return index;
  }
  return null;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = url.pathname;

  // Everything must live under the prefix, exactly like the real host.
  if (pathname === prefix || pathname === `${prefix}/`) pathname = '/index.html';
  else if (pathname.startsWith(prefix + '/')) pathname = pathname.slice(prefix.length);
  else {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('outside the deployment prefix');
    return;
  }

  const file = resolveFile(pathname);
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found');
    console.log(`404  ${req.url}`);
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  res.end(readFileSync(file));
});

server.listen(port, () => {
  console.log(`[serve] http://localhost:${port}${prefix}/`);
  verify();
});

/** Fetches every URL the built app references, under the sub-path prefix. */
async function verify() {
  const origin = `http://localhost:${port}${prefix}`;
  const checks = ['/index.html', '/manifest.webmanifest', '/app-config.json', '/sw.js'];

  const html = await (await fetch(`${origin}/index.html`)).text();
  for (const m of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)) {
    checks.push('/' + m[1].replace(/^\.\//, ''));
  }

  const manifest = await (await fetch(`${origin}/manifest.webmanifest`)).json();
  for (const icon of manifest.icons ?? []) {
    checks.push('/' + icon.src.replace(/^\.\//, ''));
  }
  for (const s of manifest.shortcuts ?? []) {
    checks.push(new URL(s.url, `${origin}/`).pathname.slice(prefix.length));
  }

  let bad = 0;
  for (const c of new Set(checks)) {
    const res = await fetch(origin + c);
    if (!res.ok) {
      console.log(`  MISSING ${c} -> ${res.status}`);
      bad++;
    }
  }

  // A leading-slash URL would escape the sub-path on the real host.
  if (JSON.stringify(manifest).includes('"/assets')) {
    console.log('  manifest contains an absolute asset path');
    bad++;
  }

  // Every icon the manifest declares must actually exist, or the install
  // prompt breaks. These are generated, so a missing step is easy to miss.
  const declared = [
    ...(manifest.icons ?? []).map((i) => i.src),
    ...(manifest.shortcuts ?? []).flatMap((s) => []),
  ];
  for (const src of new Set(declared)) {
    const res = await fetch(`${origin}/${src.replace(/^\.\//, '')}`);
    if (!res.ok) {
      console.log(`  ICON MISSING ${src} -> ${res.status}`);
      bad++;
    }
  }

  console.log(
    bad === 0
      ? `[serve] OK - all ${new Set(checks).size} assets and ${new Set(declared).size} icons resolve under ${prefix}`
      : `[serve] ${bad} problem(s) under ${prefix}`,
  );
  server.close();
}