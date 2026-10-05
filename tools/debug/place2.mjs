// SPDX-License-Identifier: Apache-2.0
import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e));
await p.addInitScript(() => { window.__ISO_MANUAL__ = true; });
await p.goto('file://' + process.cwd() + '/tests/visual/motion.html');
await p.waitForFunction(() => window.Iso && Iso.scenes()[0]?.built);
const r = await p.evaluate(() => {
  const s = Iso.scenes()[0], log = [];
  for (let i = 0; i < 119; i++) Iso.advance(1/60);
  const order = () => Array.from(s.rootEl.children).map(el => { const n = s.byUid.get(+el.dataset.uid); return n.id || n.kind; }).join(' ');
  const origPlace = s._place.bind(s);
  s._place = (c, movers) => { log.push('place movers=' + Array.from(movers).map(m => m.id).join(',')); origPlace(c, movers); };
  const st = s._containers.get(s.root);
  const parent = st.parent;
  const ib = parent.insertBefore.bind(parent);
  parent.insertBefore = (el, ref) => { log.push('insert ' + s.byUid.get(+el.dataset.uid).id + ' before ' + (ref ? s.byUid.get(+ref.dataset.uid).id : 'END')); return ib(el, ref); };
  const P = st.placer, so = P.slot.bind(P); P.slot = (it) => { const r = so(it); log.push("slot " + it.node.id + "=" + r + " box=" + JSON.stringify(it.box.map(Math.round))); return r; };
  log.push("before: " + order());
  Iso.advance(1/60);
  log.push('after: ' + order());
  return log;
});
console.log(r.join('\n'));
await b.close();
