#!/usr/bin/env node
/* Make a page self-contained: inline every <script src="…iso.js"> (and other local scripts) so the
   file works anywhere — an artifact, an email attachment, a static host, file://.

   node build.mjs page.html                → page.standalone.html
   node build.mjs page.html --out dist/figure.html
   node build.mjs page.html --min          (inline iso.min.js when it sits next to iso.js) */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const src = args.find((a) => !a.startsWith('--'));
if (!src) { console.error('usage: build.mjs <page.html> [--out file.html] [--min]'); process.exit(1); }
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args[outIdx + 1] : join(dirname(src), basename(src, extname(src)) + '.standalone.html');
const useMin = args.includes('--min');
const here = dirname(fileURLToPath(import.meta.url));
const bundled = resolve(here, '../assets/iso.js');

let html = readFileSync(src, 'utf8');
let count = 0;
html = html.replace(/<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)><\/script>/g, (m, a, href, b) => {
  if (/^(https?:)?\/\//.test(href)) return m; // leave CDN scripts alone
  let file = resolve(dirname(src), href);
  if (/iso(\.min)?\.js$/.test(href)) {
    if (useMin) { const min = file.replace(/iso\.js$/, 'iso.min.js'); if (existsSync(min)) file = min; }
    if (!existsSync(file)) file = bundled; // fall back to the copy shipped with the skill
  }
  if (!existsSync(file)) { console.warn('skip (not found): ' + href); return m; }
  count++;
  const code = readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script' + a + b + '>\n' + code + '\n</script>';
});
writeFileSync(out, html);
console.log(`inlined ${count} script(s) → ${out} (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB)`);
