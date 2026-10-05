// SPDX-License-Identifier: Apache-2.0
/* Bundle the engine: dist/iso.js (global `Iso`), dist/iso.min.js, dist/iso.esm.js,
   and a copy inside the skill so the skill folder is self-contained. */
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');
const banner = { js: `/*! Iso ${JSON.parse(readFileSync(join(root, 'package.json'))).version} — isometric illustration engine · Apache-2.0 · github.com/vstrofago/isometric-illustrations */` };
const common = { bundle: true, target: ['es2020'], logLevel: 'warning', banner };

const builds = [
  { ...common, entryPoints: [join(root, 'engine/src/global.js')], outfile: join(root, 'dist/iso.js'), format: 'iife' },
  { ...common, entryPoints: [join(root, 'engine/src/global.js')], outfile: join(root, 'dist/iso.min.js'), format: 'iife', minify: true },
  { ...common, entryPoints: [join(root, 'engine/src/index.js')], outfile: join(root, 'dist/iso.esm.js'), format: 'esm' },
];

function copyToSkill() {
  const dest = join(root, 'skills/isometric-illustrations/assets');
  mkdirSync(dest, { recursive: true });
  copyFileSync(join(root, 'dist/iso.js'), join(dest, 'iso.js'));
  const kb = (f) => (statSync(join(root, f)).size / 1024).toFixed(1) + ' KB';
  console.log(`built dist/iso.js ${kb('dist/iso.js')} · iso.min.js ${kb('dist/iso.min.js')} · iso.esm.js ${kb('dist/iso.esm.js')} → skill assets`);
}

if (watch) {
  for (const b of builds) {
    const ctx = await esbuild.context({ ...b, plugins: [{ name: 'copy', setup(build) { build.onEnd(() => { try { copyToSkill(); } catch {} }); } }] });
    await ctx.watch();
  }
  console.log('watching engine/src …');
} else {
  await Promise.all(builds.map((b) => esbuild.build(b)));
  copyToSkill();
}
