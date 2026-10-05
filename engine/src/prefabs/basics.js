// SPDX-License-Identifier: Apache-2.0
/* Scenery prefabs: platforms, trees, plants, lamps, markers, zones, plaques, desks.
   Local origin = centre of the footprint at the base; `at` and `rot` place the prefab. */
import { rng } from '../math.js';

export default function install(define) {
  /* The slab every diorama sits on. Its top is z = 0, so objects at z = 0 stand on it. */
  define('platform', (g, o) => {
    const [w, d] = o.size || [240, 180], h = o.h ?? 10, r = o.r ?? 12, inset = o.inset ?? 10;
    g.box({ at: [-w / 2, -d / 2, -h], size: [w, d, h], r, chamfer: o.chamfer ?? 3, material: o.material, color: o.color });
    if (inset) g.rect({ at: [-w / 2 + inset, -d / 2 + inset, 0], size: [w - 2 * inset, d - 2 * inset], r: Math.max(r - inset / 2, 2), line: 'ln-faint' });
    if (o.grid) g.grid({ at: [-w / 2 + inset, -d / 2 + inset, 0], size: [w - 2 * inset, d - 2 * inset], step: o.grid });
    if (o.screws) {
      const m = inset + 6;
      for (const [x, y] of [[-w / 2 + m, -d / 2 + m], [w / 2 - m, -d / 2 + m], [-w / 2 + m, d / 2 - m], [w / 2 - m, d / 2 - m]]) g.circle({ at: [x, y, 0], r: 1.6, line: 'ln-soft' });
    }
    if (o.label) g.text({ text: o.label, at: [-w / 2 + inset + 6, d / 2 - inset / 2 + 2, 0], plane: 'top', size: o.labelSize || 6, cls: 'tx tx-label tx-floor', spacing: o.labelSpacing ?? 1.6 });
    if (o.labelRight) g.text({ text: o.labelRight, at: [w / 2 - inset / 2 - 2, d / 2 - inset - 6, 0], plane: 'top-y', size: o.labelSize || 6, cls: 'tx tx-label tx-floor', spacing: o.labelSpacing ?? 1.6 });
  });

  /* Trees. kind: tiered (stacked discs) · pine · cone · round · bush · lollipop */
  define('tree', (g, o) => {
    const kind = o.kind || 'tiered', s = o.scale ?? 1, r = (o.r ?? 6) * s, h = (o.h ?? 20) * s;
    const trunkH = o.trunk ?? (kind === 'bush' ? 0 : h * 0.22);
    if (trunkH > 0) g.cylinder({ at: [0, 0, 0], r: Math.max(0.6, r * 0.13), h: trunkH + (kind === 'round' ? r * 0.5 : 0.5) });
    if (kind === 'tiered') {
      const n = o.tiers ?? 3, step = (h - trunkH) / (n + 0.4);
      for (let i = 0; i < n; i++) {
        const rr = r * (1 - i * (0.55 / n));
        g.cylinder({ at: [0, 0, trunkH + i * step], r: rr, rTop: rr * 0.86, h: step * 0.62, chamfer: Math.min(0.8, step * 0.2) });
      }
      g.cone({ at: [0, 0, trunkH + n * step], r: r * 0.22, h: step * 0.5 });
    } else if (kind === 'pine') {
      const n = o.tiers ?? 3;
      for (let i = 0; i < n; i++) g.cone({ at: [0, 0, trunkH + (i * (h - trunkH)) / (n + 1)], r: r * (1 - i * 0.22), h: ((h - trunkH) * 1.9) / (n + 1) });
    } else if (kind === 'cone') {
      g.cone({ at: [0, 0, trunkH], r, h: h - trunkH });
    } else if (kind === 'round') {
      g.sphere({ at: [0, 0, trunkH + r], r });
    } else if (kind === 'bush') {
      g.sphere({ at: [0, 0, r * 0.75], r });
    } else if (kind === 'lollipop') {
      g.cylinder({ at: [0, 0, trunkH], r, h: r * 0.35, chamfer: r * 0.08 });
    }
  }, { sort: 'none' });

  /* Scatter helper: trees (or any prefab) on a ring or in a rectangle, seeded. */
  define('forest', (g, o) => {
    const R = rng(o.seed ?? 3), n = o.count ?? 30, kinds = o.kinds || ['tiered'], s0 = o.minScale ?? 0.7, s1 = o.maxScale ?? 1.15;
    const pts = [];
    const minD = o.spacing ?? 9;
    for (let tries = 0; pts.length < n && tries < n * 40; tries++) {
      let x, y;
      if (o.ring) { const [ri, ro] = o.ring, a = R() * Math.PI * 2, rr = Math.sqrt(R() * (ro * ro - ri * ri) + ri * ri); x = Math.cos(a) * rr; y = Math.sin(a) * rr; }
      else { const [w, d] = o.size || [100, 100]; x = (R() - 0.5) * w; y = (R() - 0.5) * d; }
      if (o.avoid && o.avoid(x, y)) continue;
      if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < minD)) continue;
      pts.push([x, y]);
    }
    for (const [x, y] of pts) g.tree({ at: [x, y, 0], kind: R.pick(kinds), scale: R.range(s0, s1), r: o.r, h: o.h, material: o.material, class: o.treeClass || 'tree' });
  }, { flat: true });

  define('plant', (g, o) => {
    const r = o.r ?? 5, h = o.h ?? 8;
    g.cylinder({ at: [0, 0, 0], r: r * 0.78, rTop: r, h, chamfer: 0.6 });
    g.circle({ at: [0, 0, h], r: r - 1, fill: 'f-dark', line: null });
    const R = rng(o.seed ?? 5);
    for (let i = 0; i < (o.leaves ?? 4); i++) {
      const a = R() * Math.PI * 2, rr = R() * r * 0.4;
      g.sphere({ at: [Math.cos(a) * rr, Math.sin(a) * rr, h + r * (0.6 + i * 0.35)], r: r * (0.75 - i * 0.08) });
    }
  }, { sort: 'none' });

  define('lamp', (g, o) => {
    const h = o.h ?? 46;
    g.cylinder({ at: [0, 0, 0], r: 4, h: 2, chamfer: 0.6 });
    g.cylinder({ at: [0, 0, 2], r: 0.8, h: h - 6 });
    g.box({ center: [0, 0, h - 4], size: [9, 5, 3], r: 1.2 });
    g.box({ id: o.id ? o.id + '-bulb' : undefined, class: 'lamp-bulb', center: [0, 0, h - 4.6], size: [6, 3, 0.6], r: 0.8, material: o.on === false ? undefined : 'lit', glow: o.on !== false });
  }, { sort: 'none' });

  /* map marker: a bead on an inverted cone */
  define('pin', (g, o) => {
    const h = o.h ?? 18, r = o.r ?? 5;
    if (o.shadow !== false) g.circle({ at: [0, 0, 0], r: r * 0.7, fill: 'f-dark', line: 'ln-faint' });
    g.cylinder({ at: [0, 0, 0], r: 0.01, rTop: r * 0.62, h: h - r * 0.8 });
    g.sphere({ at: [0, 0, h], r, material: o.material || (o.lit ? 'lit' : undefined), glow: !!o.lit });
  }, { sort: 'none' });

  /* flat dashed region with a caption (diagram zones, plots) */
  define('zone', (g, o) => {
    const [w, d] = o.size || [120, 80], r = o.r ?? 8;
    g.rect({ at: [-w / 2, -d / 2, o.z || 0], size: [w, d], r, fill: o.fill === undefined ? null : o.fill, line: o.line || 'ln-soft', dash: o.dash ?? '4 4' });
    if (o.label) g.text({ text: o.label, at: [-w / 2 + 6, d / 2 - 6, o.z || 0], plane: 'top', size: o.labelSize || 6, cls: 'tx tx-label tx-floor', spacing: 1.4 });
  }, { sort: 'none', flatish: true });

  /* small plate lying on the floor with text */
  define('plaque', (g, o) => {
    const text = String(o.text || ''), size = o.size || 6, w = o.w ?? text.length * size * 0.62 + 10, d = o.d ?? size + 7;
    g.box({ at: [-w / 2, -d / 2, 0], size: [w, d, o.h ?? 1.5], r: 1.5, material: o.material });
    g.text({ text, at: [-w / 2 + 5, d / 2 - (d - size * 0.72) / 2, o.h ?? 1.5], plane: 'top', size, cls: o.cls || 'tx tx-label', spacing: 1 });
  }, { sort: 'none' });

  define('desk', (g, o) => {
    const [w, d] = o.size || [90, 46], h = o.h ?? 34, t = 3, leg = 2.4;
    for (const [x, y] of [[-w / 2 + 3, -d / 2 + 3], [w / 2 - 3 - leg, -d / 2 + 3], [-w / 2 + 3, d / 2 - 3 - leg], [w / 2 - 3 - leg, d / 2 - 3 - leg]]) g.box({ at: [x, y, 0], size: [leg, leg, h - t] });
    g.box({ at: [-w / 2, -d / 2, h - t], size: [w, d, t], r: 2, chamfer: 0.8, material: o.material });
  });

  /* small car along x (facing +x); wheels are dark blocks */
  define('car', (g, o) => {
    const L = o.length ?? 22, w = o.w ?? 11;
    for (const [x, y] of [[-L / 2 + 3, -w / 2 - 0.4], [L / 2 - 7, -w / 2 - 0.4], [-L / 2 + 3, w / 2 - 1.6], [L / 2 - 7, w / 2 - 1.6]]) g.box({ at: [x, y, 0], size: [4, 2, 3.4], r: 0.8, material: 'dark' });
    g.box({ at: [-L / 2, -w / 2, 1.4], size: [L, w, 4], r: 2.5, chamfer: 0.6, material: o.material, color: o.color });
    g.box({ at: [-L / 2 + 5, -w / 2 + 1, 5.4], size: [L * 0.5, w - 2, 3.4], r: 2, material: o.material, color: o.color,
      left: (f) => f.rect(1, 0.6, f.w - 2, f.h - 1.4, { r: 0.6, fill: 'f-screen', line: null }), right: (f) => f.rect(1, 0.6, f.w - 2, f.h - 1.4, { r: 0.6, fill: 'f-screen', line: null }) });
  });

  /* solar panel on a short post */
  define('solar', (g, o) => {
    const w = o.w ?? 22, d = o.d ?? 14;
    g.box({ center: [0, 0, 0], size: [2, 2, 4] });
    g.box({ at: [-w / 2, -d / 2, 4], size: [w, d, 1.2], r: 0.6, material: 'dark', top: (f) => f.grid(1, 1, w - 2, d - 2, 4, 3, { gap: 0.6, line: 'ln-faint' }) });
  });

  define('bench', (g, o) => {
    const w = o.w ?? 30;
    g.box({ at: [-w / 2 + 2, -3, 0], size: [2, 6, 5] });
    g.box({ at: [w / 2 - 4, -3, 0], size: [2, 6, 5] });
    g.box({ at: [-w / 2, -4, 5], size: [w, 8, 1.6], r: 0.8 });
  });
}
