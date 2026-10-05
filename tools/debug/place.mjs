import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e));
await p.addInitScript(() => { window.__ISO_MANUAL__ = true; });
await p.goto('file://' + process.cwd() + '/tests/visual/motion.html');
await p.waitForFunction(() => window.Iso && Iso.scenes()[0]?.built);
const r = await p.evaluate(() => {
  const s = Iso.scenes()[0], log = [];
  const order = () => Array.from(s.rootEl.children).map(el => { const n = s.byUid.get(+el.dataset.uid); return n.id || n.kind; }).join(' ');
  log.push('initial: ' + order());
  for (let i = 0; i < 3; i++) {
    const st = s._containers.get(s.root);
    if (st && st.placer && !st.placer._w) { const P = st.placer, orig = P.slot.bind(P); P.slot = (it) => { const r = orig(it); log.push('slot ' + it.node.id + '=' + r); return r; }; P._w = 1; }
    Iso.advance(1/60);
    log.push('frame ' + i + ': ' + order());
  }
  return log;
});
console.log(r.join('\n'));
await b.close();
