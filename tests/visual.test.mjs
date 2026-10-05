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

/* Regression: after the entrance settles, boxes riding a belt must draw after the belt (and the belt's
   legs), even though both were moving during the entrance. */
test('travelling boxes stay on top of the belt after the entrance', { skip: !available && 'playwright not installed', timeout: 60000 }, async () => {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => { window.__ISO_MANUAL__ = true; });
    await page.goto(pathToFileURL(join(root, 'examples/packing-line.html')).href);
    await page.waitForFunction(() => window.Iso && Iso.scenes()[0] && Iso.scenes()[0].built);
    const bad = await page.evaluate(() => {
      const s = Iso.scenes()[0];
      for (let i = 0; i < 6 * 60; i++) Iso.advance(1 / 60);
      const order = Array.from(s.rootEl.children);
      const belt = s.get('belt-b').children.find((c) => c.opts.top);
      const by = belt.sortBox();
      return s.all((n) => n.prefab === 'parcel' && /^box-/.test(n.id || '')).filter((p) => {
        const b = p.sortBox();
        const onBelt = b[1] >= by[1] - 1 && b[4] <= by[4] + 1 && Math.abs(b[2] - by[5]) < 0.5;
        return onBelt && order.indexOf(p.el) < order.indexOf(belt.el);
      }).map((p) => p.id);
    });
    assert.deepEqual(bad, []);
  } finally { await browser.close(); }
});
