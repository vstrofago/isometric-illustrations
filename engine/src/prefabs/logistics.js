// SPDX-License-Identifier: Apache-2.0
/* Logistics prefabs: parcel, pallet, rack, forklift, truck, scanner, tunnel.
   Local origin = centre of the footprint at the base; `at` and `rot` place the prefab. */
import { rng } from '../math.js';

export default function install(define) {
  /* Cardboard box. open: flaps up and a dark mouth; otherwise taped. label: a printed sticker on the
     front (+y) face; `labelLit` makes it glow-free bright. API: open(bool), label(bool). */
  define('parcel', (g, o) => {
    const [w, d, h] = o.size || [16, 13, 11];
    const mat = o.material ?? 'paper', id = (s) => (o.id ? o.id + '-' + s : undefined);
    g.box({ at: [-w / 2, -d / 2, 0], size: [w, d, h], r: 0.5, material: mat, color: o.color });
    /* taped state */
    const tapes = [
      g.rect({ id: id('tape'), class: 'tape', at: [-w / 2, -1.1, h], size: [w, 2.2], fill: 'f-bevel', line: 'ln-faint', material: mat }),
      g.pane({ id: id('tape-side'), class: 'tape', plane: 'right', at: [w / 2, 1.1, h], w: 2.2, h: h * 0.42, fill: 'f-bevel', line: 'ln-faint', material: mat }),
    ];
    /* open state: a dark mouth and four flaps leaning out */
    const a = ((o.flapAngle ?? 32) * Math.PI) / 180, s = Math.sin(a), c = Math.cos(a), ft = 0.5;
    const fd = d * 0.46, fw = w * 0.36;
    const open = [
      g.rect({ id: id('mouth'), at: [-w / 2 + 0.7, -d / 2 + 0.7, h], size: [w - 1.4, d - 1.4], fill: 'f-dark', line: 'ln-soft' }),
      g.slab({ origin: [-w / 2, -d / 2, h], u: [w, 0, 0], v: [0, -s * fd, c * fd], w: [0, c * ft, s * ft], material: mat }),
      g.slab({ origin: [-w / 2, -d / 2, h], u: [0, d, 0], v: [-s * fw, 0, c * fw], w: [c * ft, 0, s * ft], material: mat }),
      g.slab({ origin: [w / 2, -d / 2, h], u: [0, d, 0], v: [s * fw, 0, c * fw], w: [-c * ft, 0, s * ft], material: mat }),
      g.slab({ origin: [-w / 2, d / 2, h], u: [w, 0, 0], v: [0, s * fd, c * fd], w: [0, -c * ft, s * ft], material: mat }),
    ];
    /* printed label on the front face */
    const lw = Math.min(w * 0.46, 9), lh = Math.min(h * 0.42, 5);
    const label = g.pane({
      id: id('label'), class: 'label', plane: 'left', at: [w / 2 - lw - 1.6, d / 2, h * 0.78], w: lw, h: lh, r: 0.4,
      fill: o.labelLit === false ? 'f-bg' : 'f-lit', line: 'ln-faint',
      draw: (f) => { for (let i = 0; i < 6; i++) f.line(1 + i * (lw - 2) / 5.5, lh * 0.45, 1 + i * (lw - 2) / 5.5, lh - 0.8, 'ln-strong'); },
    });
    const apply = (isOpen, hasLabel) => {
      for (const n of tapes) n.set('hidden', isOpen);
      for (const n of open) n.set('hidden', !isOpen);
      label.set('hidden', !hasLabel);
    };
    const state = { open: !!o.open, label: !!o.label };
    apply(state.open, state.label);
    return {
      state,
      open(v = true) { if (state.open !== v) { state.open = v; apply(state.open, state.label); } return this; },
      label(v = true) { if (state.label !== v) { state.label = v; apply(state.open, state.label); } return this; },
    };
  }, { sort: 'none' });

  /* Wooden pallet, optionally loaded: load: [cols, rows, layers] of taped parcels. */
  define('pallet', (g, o) => {
    const [w, d] = o.size || [30, 26], R = rng(o.seed ?? 4);
    for (const y of [-d / 2, -1.2, d / 2 - 2.4]) g.box({ at: [-w / 2, y, 0], size: [w, 2.4, 2.4], material: o.material });
    const n = 5, bw = (w - (n - 1) * 1.4) / n;
    for (let i = 0; i < n; i++) g.box({ at: [-w / 2 + i * (bw + 1.4), -d / 2, 2.4], size: [bw, d, 1.4], material: o.material });
    if (o.load) {
      const [cols, rows, layers] = o.load, gap = 0.6, top = 3.8;
      const cw = (w - gap * (cols - 1)) / cols, cd = (d - gap * (rows - 1)) / rows, ch = o.boxH ?? Math.min(11, cw * 0.75);
      for (let k = 0; k < layers; k++) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        if (k === layers - 1 && o.partial && R() < o.partial) continue;
        g.parcel({ at: [-w / 2 + cw / 2 + i * (cw + gap), -d / 2 + cd / 2 + j * (cd + gap), top + k * (ch + 0.3)], size: [cw, cd, ch], material: o.boxMaterial });
      }
    }
  });

  /* Warehouse rack: four uprights, shelves, parcels on the shelves (seeded). */
  define('rack', (g, o) => {
    const [w, d] = o.size || [70, 24], h = o.h ?? 54, levels = o.levels ?? 3, p = 2.2, R = rng(o.seed ?? 5), fill = o.fill ?? 0.7;
    for (const [x, y] of [[-w / 2, -d / 2], [w / 2 - p, -d / 2], [-w / 2, d / 2 - p], [w / 2 - p, d / 2 - p]]) g.box({ at: [x, y, 0], size: [p, p, h], material: o.material });
    const step = (h - 3) / levels;
    for (let i = 0; i < levels; i++) {
      const z = 2 + i * step;
      g.box({ at: [-w / 2, -d / 2 + p, z], size: [w, d - 2 * p, 1.6], material: o.material, left: (f) => f.hlines(2, 0.8, f.w - 4, 0, 1, 'ln-faint') });
      const slots = Math.max(1, Math.floor((w - 4) / 17));
      const sw = (w - 4) / slots;
      for (let k = 0; k < slots; k++) {
        if (R() > fill) continue;
        const bw = sw * R.range(0.68, 0.86), bd = (d - 2 * p) * R.range(0.62, 0.82), bh = Math.min(step - 3.5, R.range(7, 12));
        g.parcel({ at: [-w / 2 + 2 + sw * (k + 0.5), R.range(-1, 1), z + 1.6], size: [bw, bd, bh], material: o.boxMaterial });
      }
    }
  });

  /* Forklift facing +x. lift: fork height. load: carry a loaded pallet. */
  define('forklift', (g, o) => {
    const fz = o.lift ?? 1.4, mat = o.material;
    for (const [x, y] of [[-9.5, -8.2], [4.5, -8.2], [-9.5, 6], [4.5, 6]]) g.box({ at: [x, y, 0], size: [5, 2.2, 5], r: 1, material: 'dark' });
    g.box({ at: [-13, -6.5, 1.5], size: [3, 13, 10], r: 1.5, chamfer: 0.6, material: mat });
    g.box({ at: [-10, -6, 1.5], size: [18, 12, 6.5], r: 2, chamfer: 0.8, material: mat, left: (f) => f.hlines(3, 3, f.w - 6, 0, 1, 'ln-faint') });
    g.box({ at: [-7, -3, 8], size: [5, 6, 3.5], r: 1, material: 'dark' });
    for (const [x, y] of [[-9.6, -5.6], [-1.6, -5.6], [-9.6, 4.6], [-1.6, 4.6]]) g.box({ at: [x, y, 8], size: [1, 1, 14] });
    g.box({ at: [-10, -6, 22], size: [9.5, 12, 1], r: 0.6, material: mat, top: (f) => f.hlines(1.5, 2, f.w - 3, f.h - 4, 4, 'ln-faint') });
    for (const y of [-4.6, 3.4]) g.box({ at: [8, y, 1.2], size: [1.6, 1.2, 26] });
    g.box({ at: [8, -4.6, 26], size: [1.6, 9.2, 1.2] });
    g.box({ at: [9.6, -5, fz], size: [1, 10, 9], material: 'dark' });
    for (const y of [-4, 2.4]) g.box({ at: [10.6, y, fz], size: [13, 1.6, 0.8] });
    if (o.load) g.pallet({ at: [17.4, 0, fz + 0.8], size: [13, 12], load: [1, 1, 2], boxH: 6 });
  });

  /* Box truck with its open rear toward +x (backs onto a dock or a conveyor). */
  define('truck', (g, o) => {
    const L = o.length ?? 90, W = o.w ?? 40, H = o.h ?? 44, fl = o.floor ?? 12, mat = o.material;
    for (const x of [L / 2 - 16, L / 2 - 28, -L / 2 - 14]) for (const y of [-W / 2 + 1, W / 2 - 3.4]) g.box({ at: [x, y, 0], size: [9, 2.4, 9], r: 2, material: 'dark' });
    g.box({ at: [-L / 2 - 24, -W / 2 + 4, 4], size: [L + 22, W - 8, fl - 4], material: 'dark' });
    g.box({ at: [-L / 2 - 25, -W / 2 + 2, 6], size: [22, W - 4, fl + 18], r: 3, chamfer: 1, material: mat,
      left: (f) => { f.rect(f.w * 0.5, 4, f.w * 0.42, f.h * 0.38, { r: 1.5, fill: 'f-screen', line: 'ln-soft' }); f.line(f.w * 0.46, 4, f.w * 0.46, f.h - 3, 'ln-faint'); } });
    g.box({
      at: [-L / 2, -W / 2, fl], size: [L, W, H], r: 1.5, chamfer: 1, material: mat,
      left: (f) => { f.vlines(4, 3, f.w - 8, f.h - 6, Math.round(L / 8), 'ln-faint'); if (o.text) f.text(o.text, 8, f.h * 0.62, { size: 6, cls: 'tx tx-label', spacing: 1.5 }); },
      right: (f) => {
        if (o.open === false) { f.hlines(3, 3, f.w - 6, f.h - 6, 10, 'ln-soft'); return; }
        f.rect(2.5, 2.5, f.w - 5, f.h - 4, { r: 1, fill: 'f-dark', line: 'ln' });
        f.hlines(3, 3, f.w - 6, 5, 4, 'ln-faint');
      },
      top: (f) => f.rect(2, 2, f.w - 4, f.h - 4, { r: 1, line: 'ln-faint' }),
    });
  });

  /* Scanner arch over a belt with a lit beam. axis: the belt direction ('x' or 'y').
     w = clear width between posts, h = clearance; beam node id `${id}-beam`, class `scan-beam`. */
  define('scanner', (g, o) => {
    const w = o.w ?? 30, h = o.h ?? 38, t = o.t ?? 4, from = o.beamFrom ?? 0, axis = o.axis || 'x', mat = o.material;
    const id = (s) => (o.id ? o.id + '-' + s : undefined);
    if (axis === 'x') {
      g.box({ at: [-t / 2, -w / 2 - t, 0], size: [t, t, h], r: 0.8, material: mat });
      g.box({ at: [-t / 2, w / 2, 0], size: [t, t, h], r: 0.8, material: mat, left: (f) => f.rect(f.w / 2 - 0.8, 4, 1.6, 1.6, { r: 0.8, fill: 'f-lit', line: null }) });
      g.box({ at: [-t / 2 - 1, -w / 2 - t, h], size: [t + 2, w + 2 * t, 5], r: 1, chamfer: 0.6, material: mat, right: (f) => f.rect(t, 1.6, f.w - 2 * t, 1.4, { r: 0.7, fill: 'f-lit', line: null }) });
      g.pane({ id: id('beam'), class: 'scan-beam', plane: 'right', at: [0, w / 2, h], w, h: h - from, fill: 'f-lit', line: null, material: 'lit', glow: o.glow ?? true, style: { opacity: o.beamOpacity ?? 0.35 } });
    } else {
      g.box({ at: [-w / 2 - t, -t / 2, 0], size: [t, t, h], r: 0.8, material: mat });
      g.box({ at: [w / 2, -t / 2, 0], size: [t, t, h], r: 0.8, material: mat, right: (f) => f.rect(f.w / 2 - 0.8, 4, 1.6, 1.6, { r: 0.8, fill: 'f-lit', line: null }) });
      g.box({ at: [-w / 2 - t, -t / 2 - 1, h], size: [w + 2 * t, t + 2, 5], r: 1, chamfer: 0.6, material: mat, left: (f) => f.rect(t, 1.6, f.w - 2 * t, 1.4, { r: 0.7, fill: 'f-lit', line: null }) });
      g.pane({ id: id('beam'), class: 'scan-beam', plane: 'left', at: [-w / 2, 0, h], w, h: h - from, fill: 'f-lit', line: null, material: 'lit', glow: o.glow ?? true, style: { opacity: o.beamOpacity ?? 0.35 } });
    }
  }, { flat: true });

  /* Machine hood a belt runs through (sealing, labelling, wrapping). axis: the belt direction.
     A strip curtain hangs at the exit; status light id `${id}-led`. */
  define('tunnel', (g, o) => {
    const L = o.length ?? 30, w = o.w ?? 30, h = o.h ?? 36, t = o.t ?? 3, roof = o.roof ?? 7, axis = o.axis || 'x', mat = o.material;
    const id = (s) => (o.id ? o.id + '-' + s : undefined);
    const strips = (f) => { const n = Math.round(f.w / 3); for (let i = 1; i < n; i++) f.line((i * f.w) / n, 0, (i * f.w) / n, f.h, 'ln-faint'); };
    const panel = (f) => { f.rect(4, 5, f.w - 8, f.h * 0.34, { r: 1, fill: 'f-screen', line: 'ln-soft' }); f.hlines(5, f.h * 0.58, f.w * 0.45, f.h * 0.22, 4, 'ln-faint'); };
    if (axis === 'x') {
      g.box({ at: [-L / 2, -w / 2 - t, 0], size: [L, t, h], material: mat });
      g.box({ at: [-L / 2, w / 2, 0], size: [L, t, h], r: 0.6, material: mat, left: panel });
      g.box({ at: [-L / 2 - 1, -w / 2 - t - 1, h], size: [L + 2, w + 2 * t + 2, roof], r: 1.5, chamfer: 1, material: mat, top: (f) => f.hlines(4, 4, f.w - 8, f.h - 8, 5, 'ln-faint') });
      g.pane({ plane: 'right', at: [L / 2, w / 2, h], w, h: h * 0.55, fill: 'f-glass', line: 'ln-faint', material: 'glass', draw: strips });
      g.pane({ id: id('led'), class: 'tunnel-led', plane: 'left', at: [L / 2 - 4, w / 2 + t, h - 2], w: 2, h: 2, r: 1, fill: 'f-lit', line: null });
    } else {
      g.box({ at: [-w / 2 - t, -L / 2, 0], size: [t, L, h], material: mat });
      g.box({ at: [w / 2, -L / 2, 0], size: [t, L, h], r: 0.6, material: mat, right: panel });
      g.box({ at: [-w / 2 - t - 1, -L / 2 - 1, h], size: [w + 2 * t + 2, L + 2, roof], r: 1.5, chamfer: 1, material: mat, top: (f) => f.vlines(4, 4, f.w - 8, f.h - 8, 5, 'ln-faint') });
      g.pane({ plane: 'left', at: [-w / 2, L / 2, h], w, h: h * 0.55, fill: 'f-glass', line: 'ln-faint', material: 'glass', draw: strips });
      g.pane({ id: id('led'), class: 'tunnel-led', plane: 'right', at: [w / 2 + t, -L / 2 + 6, h - 2], w: 2, h: 2, r: 1, fill: 'f-lit', line: null });
    }
  }, { flat: true });
}
