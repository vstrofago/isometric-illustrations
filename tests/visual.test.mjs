/* Visual smoke test: every example renders in Chromium with no page errors.
   Skips when Playwright or a browser is unavailable. Output PNGs go to out/visual/. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const render = join(root, 'skills/isometric-illustrations/scripts/render.mjs');
const out = join(root, 'out/visual');
let available = true;
try { await import('playwright'); } catch { available = false; }

const pages = readdirSync(join(root, 'examples')).filter((f) => f.endsWith('.html') && !f.includes('.standalone')).map((f) => ['examples/' + f, join(root, 'examples', f)]);
pages.push(['tests/visual/primitives.html', join(root, 'tests/visual/primitives.html')]);
pages.push(['tests/visual/prefabs.html', join(root, 'tests/visual/prefabs.html')]);
for (const p of ['hello', 'diagram', 'workspace', 'city', 'layers', 'computer']) pages.push(['playground?' + p, pathToFileURL(join(root, 'playground/index.html')).href + '?preset=' + p]);

mkdirSync(out, { recursive: true });
for (const [name, target] of pages) {
  test('renders ' + name, { skip: !available && 'playwright not installed', timeout: 60000 }, () => {
    const png = join(out, name.replace(/[^\w.-]+/g, '_') + '.png');
    const args = [render, target, '--out', png, '--scale', '1', '--quiet'];
    if (name.startsWith('playground')) args.push('--selector', '.preview', '--time', '2');
    try { execFileSync(process.execPath, args, { stdio: 'pipe' }); }
    catch (e) { assert.fail((e.stderr || e.stdout || e.message).toString()); }
    assert.ok(existsSync(png));
  });
}
