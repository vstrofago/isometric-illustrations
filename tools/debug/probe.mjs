// SPDX-License-Identifier: Apache-2.0
/* Evaluate an expression in a scene page at time t: node tools/debug/probe.mjs page.html 5.7 "s.get('phone-0').t" */
import { chromium } from 'playwright';
const [file, t, expr] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e));
await p.addInitScript(() => { window.__ISO_MANUAL__ = true; });
await p.goto('file://' + process.cwd() + '/' + file);
await p.waitForFunction(() => window.Iso && Iso.scenes()[0]?.built);
const r = await p.evaluate(([t, expr]) => { const s = Iso.scenes()[0]; while (s.time < +t - 1e-9) Iso.advance(Math.min(1 / 60, +t - s.time)); return JSON.stringify(eval(expr)); }, [t, expr]);
console.log(r);
await b.close();
