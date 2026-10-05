/* Measure per-frame update cost of a scene page (manual clock). */
import { chromium } from 'playwright';
const file = process.argv[2] || 'examples/campus.html', from = +(process.argv[3] || 3);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.addInitScript(() => { window.__ISO_MANUAL__ = true; });
const t0 = Date.now();
await p.goto('file://' + process.cwd() + '/' + file);
await p.waitForFunction(() => window.Iso && Iso.scenes()[0]?.built);
const load = Date.now() - t0;
const r = await p.evaluate((from) => {
  const s = Iso.scenes()[0];
  const measure = (n) => { const a = performance.now(); for (let i = 0; i < n; i++) Iso.advance(1 / 60); return (performance.now() - a) / n; };
  const entrance = measure(60);
  while (s.time < from) Iso.advance(1 / 60);
  const steady = measure(120);
  return { nodes: s.byUid.size, entrance: entrance.toFixed(2) + 'ms', steady: steady.toFixed(2) + 'ms', dom: s.svg.querySelectorAll('*').length };
}, from);
console.log(JSON.stringify({ load: load + 'ms', ...r }));
await b.close();
