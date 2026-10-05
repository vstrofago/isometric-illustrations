/* Debug helper: print draw order and placement decisions for a scene page. */
import { chromium } from 'playwright';
const file = process.argv[2] || 'tests/visual/motion.html', id = process.argv[3] || 'post4', t = +(process.argv[4] || 2);
const b = await chromium.launch(); const p = await b.newPage();
p.on('pageerror', e => console.log('ERR', e));
await p.addInitScript(() => { window.__ISO_MANUAL__ = true; });
await p.goto('file://' + process.cwd() + '/' + file);
await p.waitForFunction(() => window.Iso && Iso.scenes()[0]?.built);
const r = await p.evaluate(([id, t]) => {
  const s = Iso.scenes()[0];
  for (let i = 0; i < t * 60; i++) Iso.advance(1/60);
  const order = Array.from(s.rootEl.children).map(el => { const n = s.byUid.get(+el.dataset.uid); return n.id || n.kind; });
  const st = s._containers.get(s.root);
  const n = s.get(id);
  const statics = st.statics.map(x => x.node.id);
  const zs = s.view.ZS;
  const out = { order: order.join(' '), statics: statics.join(' '), dyn: Array.from(st.dyn).map(x => x.id).join(' ') };
  const P = st.placer;
  const it = { node: n, box: n.sortBox(), layer: 0, order: n.order, key: 0 };
  it.hex = [it.box[0]-it.box[4], it.box[3]-it.box[1], it.box[0]-it.box[5]*zs, it.box[3]-it.box[2]*zs, it.box[1]-it.box[5]*zs, it.box[4]-it.box[2]*zs];
  out.slot = P.slot(it);
  out.base = st.statics.find(x => x.node.id === 'base');
  out.baseIndex = out.base && out.base.index; out.baseHex = out.base && out.base.hex; out.itHex = it.hex;
  out.cells = []; P._cells(it.hex, k => out.cells.push(k + ':' + (P.grid.get(k) || []).map(x => x.node.id).join(',')));
  delete out.base;
  return out;
}, [id, t]);
console.log(JSON.stringify(r, null, 1));
await b.close();
