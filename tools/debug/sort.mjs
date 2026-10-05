// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e));
await p.addInitScript(() => { window.__ISO_MANUAL__ = true; });
await p.goto('file://' + process.cwd() + '/' + (process.argv[2] || 'tests/visual/motion.html'));
await p.waitForFunction(() => window.Iso && Iso.scenes()[0]?.built);
const r = await p.evaluate(() => {
  const s = Iso.scenes()[0];
  return s.root.items().map(n => (n.id || n.kind) + ' ' + JSON.stringify(n.sortBox().map(v => Math.round(v*10)/10)) + ' layer=' + n.layer);
});
console.log(r.join('\n'));
await b.close();
