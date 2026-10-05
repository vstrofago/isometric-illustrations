// SPDX-License-Identifier: Apache-2.0
/* Engine unit tests (no DOM). Run: npm test */
import test from 'node:test';
import assert from 'node:assert/strict';
import Iso from '../engine/src/index.js';
import { makeView, rrect, insetConvex, signedArea, rng } from '../engine/src/math.js';
import { makeItem, compareItems, depthSort, hexOverlap } from '../engine/src/sort.js';
import { Timeline, ease } from '../engine/src/anim.js';
import { path } from '../engine/src/paths.js';

const close = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);

test('true isometric projection hides the view axis', () => {
  const v = makeView(30);
  const p = v.P(1, 1, 1);
  close(p[0], 0); close(p[1], 0);
  const q = v.P(10, 0, 0);
  close(q[0], 10 * Math.cos(Math.PI / 6)); close(q[1], 5);
  const d = makeView(26.565);
  const r = d.P(1, 1, 2 * d.S); close(r[0], 0); close(r[1], 0, 1e-9);
});

test('rounded rectangles carry corner kinds and inset cleanly', () => {
  const p = rrect(0, 0, 40, 20, 5);
  assert.equal(p.length, p.kinds.length);
  assert.ok(p.kinds.includes('t') && p.kinds.includes('s'));
  const sharp = rrect(0, 0, 10, 10, 0);
  assert.deepEqual(sharp.kinds, ['c', 'c', 'c', 'c']);
  const inner = insetConvex(sharp, 2);
  close(Math.abs(signedArea(inner)), 36);
});

const item = (box, order = 0, layer = 0) => makeItem({ layer }, box, 1, order);

test('separating axes order neighbours', () => {
  const floor = item([0, 0, -10, 100, 100, 0], 0);
  const cube = item([10, 10, 0, 20, 20, 10], 1);
  assert.equal(compareItems(floor, cube), -1, 'what stands on the floor draws after it');
  const back = item([0, 0, 0, 10, 10, 10]), front = item([10, 0, 0, 20, 10, 10]);
  assert.equal(compareItems(back, front), -1, 'smaller x is farther away');
  assert.equal(compareItems(front, back), 1);
  const left = item([0, 0, 0, 10, 10, 10]), nearer = item([0, 12, 0, 10, 22, 10]);
  assert.equal(compareItems(left, nearer), -1, 'smaller y is farther away');
});

test('coplanar decals keep authoring order; layers always win', () => {
  const a = item([0, 0, 0, 50, 50, 0], 0), b = item([10, 10, 0, 40, 40, 0], 1);
  assert.equal(compareItems(a, b), -1);
  assert.equal(compareItems(b, a), 1);
  const over = item([0, 0, -50, 10, 10, -40], 5, 1), under = item([0, 0, 0, 10, 10, 10], 0, 0);
  assert.equal(compareItems(under, over), -1);
});

test('an object sunk into its support still draws on top', () => {
  const base = item([-120, -120, -10, 120, 120, 0], 0);
  const post = item([-105, -5, -0.25, -95, 5, 34], 1);
  assert.equal(compareItems(base, post), -1);
});

test('depth sort satisfies every separable overlapping pair (property)', () => {
  const R = rng(42);
  for (let round = 0; round < 25; round++) {
    const items = [];
    /* non-intersecting boxes on a jittered grid, some stacked */
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      if (R() < 0.3) continue;
      const x = i * 20 + R() * 4, y = j * 20 + R() * 4, h = 4 + R() * 30;
      items.push(item([x, y, 0, x + 14, y + 14, h], items.length));
      if (R() < 0.3) items.push(item([x + 2, y + 2, h, x + 10, y + 10, h + 8], items.length));
    }
    const sorted = depthSort(items);
    const pos = new Map(sorted.map((it, i) => [it, i]));
    for (const a of items) for (const b of items) {
      if (a === b || !hexOverlap(a.hex, b.hex)) continue;
      if (compareItems(a, b) < 0) assert.ok(pos.get(a) < pos.get(b), 'constraint violated');
    }
  }
});

test('easings start at 0 and end at 1', () => {
  for (const k of Object.keys(ease)) {
    const f = ease[k];
    if (typeof f !== 'function' || ['bezier', 'steps', 'spring'].includes(k)) continue;
    close(f(0), 0, 1e-6); close(f(1), 1, 1e-6);
  }
  close(ease.out(0.5) > 0.5 ? 1 : 0, 1);
});

test('timelines are pure functions of time', () => {
  const node = { uid: 1, v: { z: 0, opacity: 1 }, get(k) { return this.v[k]; }, set(k, x) { this.v[k] = x; } };
  const fake = { time: 0, resolve: (t) => [].concat(t) };
  const tl = new Timeline(fake, { start: 0 });
  tl.to(node, { z: 10 }, { duration: 1, ease: 'linear' }).to(node, { z: 0 }, { duration: 1, ease: 'linear' });
  tl.apply(0.5); close(node.v.z, 5);
  tl.apply(1.5); close(node.v.z, 5);
  tl.apply(0.25); close(node.v.z, 2.5);
  tl.apply(3); close(node.v.z, 0);
  assert.equal(tl.done, true);
  const rep = new Timeline(fake, { start: 0, repeat: -1, yoyo: true });
  rep.to(node, { opacity: 0 }, { duration: 1, ease: 'linear' });
  rep.apply(0.25); close(node.v.opacity, 0.75);
  rep.apply(1.25); close(node.v.opacity, 0.25);
  let calls = 0;
  const cb = new Timeline(fake, { start: 0, repeat: 2 });
  cb.to(node, { z: 1 }, { duration: 1 }).call(() => calls++, 0.5);
  for (let t = 0; t <= 3.2; t += 0.1) cb.apply(t);
  assert.equal(calls, 3);
});

test('paths are parameterised by arc length', () => {
  const c = path.circle({ center: [0, 0, 5], r: 10, n: 360 });
  close(c.length, 2 * Math.PI * 10, 0.01);
  const q = c.at(0.25);
  close(q[0], 0, 0.05); close(q[1], 10, 0.05); close(q[2], 5);
  const l = path.polyline([[0, 0, 0], [10, 0, 0], [10, 10, 0]]);
  assert.deepEqual(l.at(0.75).map((v) => Math.round(v)), [10, 5, 0]);
});

test('every prefab builds and measures without a DOM', () => {
  const s = Iso.scene(null, {});
  let x = 0;
  for (const name of Object.keys(Iso.prefabs)) s[name]({ at: [x, 0, 0] }), (x += 80);
  const b = s.measure();
  assert.ok(b.every(Number.isFinite), 'finite bounds');
  const svg = s.toString();
  assert.ok(svg.startsWith('<svg') && svg.includes('data-uid'));
  assert.ok(Object.keys(Iso.prefabs).length >= 25);
});

test('JSON specs build the same scene graph', () => {
  const s = Iso.render({
    objects: [{ type: 'platform', size: [100, 80] }, { type: 'group', id: 'g', at: [10, 0, 0], children: [{ type: 'box', id: 'b', size: [10, 10, 10] }] },
      { type: 'diagram', nodes: [{ id: 'a', cell: [0, 0] }, { id: 'b2', cell: [1, 0] }], edges: [{ from: 'a', to: 'b2' }] }],
    animations: [{ type: 'float', target: 'b' }],
  }, null);
  assert.ok(s.get('b') && s.get('g') && s.get('a'));
  assert.equal(s.get('b').parent, s.get('g'));
  assert.equal(s.behaviors.length, 1);
  assert.ok(s.toString().includes('<path'));
});

test('untrusted specs cannot inject markup', () => {
  const evil = '"><script>alert(1)</script><x y="';
  const s = Iso.render({
    class: evil, theme: evil, colors: { bg: 'red;}</style><script>', [evil]: 'x' },
    objects: [
      { type: 'block', id: evil, class: evil, color: evil, icon: evil, label: evil, style: { [evil]: evil, '--ok': evil } },
      { type: 'text', text: evil, cls: evil, anchor: evil, weight: evil, spacing: evil },
      { type: 'line', points: [[0, 0, 0], [10, 0, 0]], dash: evil, flow: evil, width: evil, line: evil },
      { type: 'rect', size: [10, 10], dash: evil, fill: evil },
      { type: 'deskComputer', logo: evil },
      { type: 'stack', layers: [{ label: evil, icon: evil }] },
    ],
  }, null);
  const svg = s.toString();
  assert.ok(!/<script|<x |alert\(1\)<\/|onerror|<\/style>/i.test(svg), 'markup escaped or dropped');
});
