#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/* Scaffold a new figure from the skill's templates.
   node new.mjs out/my-figure.html [--spec] [--title "My figure"] [--inline]
   --spec    JSON-spec template instead of the JS template
   --inline  embed the engine in the page (one self-contained file); default copies iso.js next to it */
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--'));
if (!out) { console.error('usage: new.mjs <file.html> [--spec] [--title "…"] [--inline]'); process.exit(1); }
const ti = args.indexOf('--title');
const title = ti >= 0 ? args[ti + 1] : basename(out, extname(out)).replace(/[-_]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');
let html = readFileSync(join(assets, args.includes('--spec') ? 'template-spec.html' : 'template.html'), 'utf8').replaceAll('{{TITLE}}', title);
const dir = dirname(resolve(out));
mkdirSync(dir, { recursive: true });
if (args.includes('--inline')) {
  const engine = readFileSync(join(assets, 'iso.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
  html = html.replace('<script src="iso.js"></script>', '<script>\n' + engine + '\n</script>');
} else if (!existsSync(join(dir, 'iso.js'))) copyFileSync(join(assets, 'iso.js'), join(dir, 'iso.js'));
if (existsSync(out) && !args.includes('--force')) { console.error(out + ' exists (use --force)'); process.exit(1); }
writeFileSync(out, html);
console.log('created ' + out + (args.includes('--inline') ? ' (engine inlined)' : ' + iso.js'));
