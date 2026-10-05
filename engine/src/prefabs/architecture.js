/* Architecture & diagram prefabs: building, tower, gate, conveyor, stack, block. */
import { rng, fmt } from '../math.js';
import { ICONS } from './icons.js';

export default function install(define, Iso) {
  /* Building with a window grid on both visible faces. lit: fraction of lit windows (seeded). */
  define('building', (g, o) => {
    const w = o.w ?? 40, d = o.d ?? 32, h = o.h ?? 60, floors = o.floors ?? Math.max(2, Math.round(h / 10));
    const R = rng(o.seed ?? 11), lit = o.lit ?? 0.12, win = o.windows || 'grid';
    const each = () => (R() < lit ? { fill: 'f-lit' } : null);
    const facade = (f, cols) => {
      const top = 5, bot = o.door ? 9 : 4;
      if (win === 'bands') { for (let i = 0; i < floors; i++) { const v = top + (i * (f.h - top - bot)) / floors; f.rect(3, v + 1, f.w - 6, (f.h - top - bot) / floors - 3, { r: 0.6, fill: 'f-screen', line: 'ln-faint' }); } return; }
      f.grid(3, top, f.w - 6, f.h - top - bot, cols, floors, { gap: 1.6, r: 0.4, fill: 'f-screen', line: 'ln-faint', each });
      if (o.door) f.rect(f.w / 2 - 3, f.h - 8, 6, 8, { r: 0.8, fill: 'f-dark', line: 'ln-soft' });
    };
    g.box({
      at: [-w / 2, -d / 2, 0], size: [w, d, h], r: o.r ?? 1, chamfer: o.chamfer ?? 1, material: o.material, color: o.color,
      left: (f) => facade(f, Math.max(2, Math.round(w / 7))),
      right: (f) => facade(f, Math.max(2, Math.round(d / 7))),
      top: (f) => f.rect(2, 2, w - 4, d - 4, { r: 0.6, line: 'ln-faint' }),
    });
    if (o.roof !== false) {
      g.box({ at: [-w / 2 + w * 0.15, -d / 2 + d * 0.2, h], size: [w * 0.3, d * 0.28, 4], r: 0.8 });
      if (o.antenna) g.cylinder({ at: [w * 0.25, d * 0.2, h], r: 0.6, h: o.antenna });
    }
  }, { sort: 'none' });

  /* Cylindrical tower (water tanks, silos, round offices) */
  define('tower', (g, o) => {
    const r = o.r ?? 14, h = o.h ?? 50;
    g.cylinder({ at: [0, 0, 0], r, h, chamfer: 1, bands: o.bands || Array.from({ length: Math.max(1, Math.floor(h / 10) - 1) }, (_, i) => (i + 1) * 10), ribs: o.ribs ?? 24, material: o.material, color: o.color });
    if (o.cap !== false) g.cone({ at: [0, 0, h], r: r * 0.92, h: r * 0.45 });
  }, { sort: 'none' });

  /* Glass portal: two posts, a beam, a glass pane; axis 'x' spans along x (pane faces +y) */
  define('gate', (g, o) => {
    const w = o.w ?? 40, h = o.h ?? 46, t = o.t ?? 4, axis = o.axis || 'x';
    if (axis === 'x') {
      g.box({ at: [-w / 2, -t / 2, 0], size: [t, t, h], r: 0.8 });
      g.pane({ plane: 'left', at: [-w / 2 + t, 0, h - t], w: w - 2 * t, h: h - t, material: 'glass', fill: 'f-glass', line: 'ln-soft', draw: (f) => { f.line(f.w * 0.2, 4, f.w * 0.05, 18, 'ln-faint'); f.line(f.w * 0.32, 4, f.w * 0.12, 30, 'ln-faint'); } });
      g.box({ at: [w / 2 - t, -t / 2, 0], size: [t, t, h], r: 0.8 });
      g.box({ at: [-w / 2, -t / 2, h], size: [w, t, t], r: 0.8 });
    } else {
      g.box({ at: [-t / 2, w / 2 - t, 0], size: [t, t, h], r: 0.8 });
      g.pane({ plane: 'right', at: [0, w / 2 - t, h - t], w: w - 2 * t, h: h - t, material: 'glass', fill: 'f-glass', line: 'ln-soft', draw: (f) => { f.line(f.w * 0.2, 4, f.w * 0.05, 18, 'ln-faint'); f.line(f.w * 0.32, 4, f.w * 0.12, 30, 'ln-faint'); } });
      g.box({ at: [-t / 2, -w / 2, 0], size: [t, t, h], r: 0.8 });
      g.box({ at: [-t / 2, -w / 2, h], size: [t, w, t], r: 0.8 });
    }
  });

  /* Conveyor belt along x (or y). The belt surface is at z = h. track() → world Path along the belt. */
  /* Conveyor belt along x (or y). Belt surface at z = h. Tall belts (h > 10) stand on legs with side
     rails; the parts sort individually so boxes ride between the rails. track() → world path. */
  define('conveyor', (g, o) => {
    const L = o.length ?? 120, w = o.w ?? 18, h = o.h ?? 8, axis = o.axis || 'x', rollers = o.rollers ?? Math.round(L / 8);
    const legs = o.legs ?? h > 10, rails = o.rails ?? legs;
    const X = (a, b) => (axis === 'x' ? a : b); // pick by axis
    const rollerFace = (f) => {
      if (axis === 'x') for (let i = 0; i <= rollers; i++) { const u = 3 + (i * (L - 6)) / rollers; f.line(u, 2.5, u, w - 2.5, 'ln-faint'); }
      else for (let i = 0; i <= rollers; i++) { const v = 3 + (i * (L - 6)) / rollers; f.line(2.5, v, w - 2.5, v, 'ln-faint'); }
      if (axis === 'x') { f.line(0, 2.2, L, 2.2, 'ln-soft'); f.line(0, w - 2.2, L, w - 2.2, 'ln-soft'); }
      else { f.line(2.2, 0, 2.2, L, 'ln-soft'); f.line(w - 2.2, 0, w - 2.2, L, 'ln-soft'); }
    };
    if (!legs) {
      const size = X([L, w, h], [w, L, h]);
      g.box({ at: [-size[0] / 2, -size[1] / 2, 0], size, r: 1.5, chamfer: 0.8, material: o.material, top: rollerFace,
        left: (f) => f.hlines(4, f.h * 0.5, f.w - 8, 0, 1, 'ln-faint') });
    } else {
      const t = o.belt ?? 4, z0 = h - t, n = Math.max(2, Math.round(L / (o.legSpacing ?? 34)) + 1), p = 2;
      for (let i = 0; i < n; i++) {
        const s = -L / 2 + 3 + (i * (L - 6 - p)) / (n - 1);
        for (const side of [-1, 1]) {
          const q = side < 0 ? -w / 2 + 1 : w / 2 - 1 - p;
          g.box({ at: X([s, q, 0], [q, s, 0]), size: [p, p, z0], material: o.material });
        }
      }
      const size = X([L, w, t], [w, L, t]);
      g.box({ at: [-size[0] / 2, -size[1] / 2, z0], size, r: 1, chamfer: 0.5, material: o.material, top: rollerFace,
        left: axis === 'x' ? (f) => f.hlines(3, t / 2, f.w - 6, 0, 1, 'ln-faint') : undefined,
        right: axis === 'y' ? (f) => f.hlines(3, t / 2, f.w - 6, 0, 1, 'ln-faint') : undefined });
      if (rails) {
        const rh = o.railH ?? 2.6, rt = 1.2;
        for (const side of [-1, 1]) {
          const q = side < 0 ? -w / 2 : w / 2 - rt;
          g.box({ class: 'rail', at: X([-L / 2, q, h], [q, -L / 2, h]), size: X([L, rt, rh], [rt, L, rh]), r: 0.4, material: o.material });
        }
      }
    }
    return {
      track(lift = 0) {
        const at = this.opts.at || [0, 0, 0];
        const a = axis === 'x' ? [at[0] - L / 2 + 4, at[1], at[2] + h + lift] : [at[0], at[1] - L / 2 + 4, at[2] + h + lift];
        const b = axis === 'x' ? [at[0] + L / 2 - 4, at[1], at[2] + h + lift] : [at[0], at[1] + L / 2 - 4, at[2] + h + lift];
        return Iso.path.line(a, b);
      },
    };
  }, { flat: true });

  /* Layered stack (architecture "layer cake"). layers: [{label, material, color}] bottom → top */
  define('stack', (g, o) => {
    const [w, d] = o.size || [90, 70], t = o.t ?? 6, gap = o.gap ?? 14, layers = o.layers || [{ label: 'Layer' }];
    layers.forEach((L, i) => {
      const z = i * (t + gap);
      g.box({
        id: o.id ? o.id + '-' + i : undefined, class: 'layer', at: [-w / 2, -d / 2, z], size: [w, d, t], r: o.r ?? 6, chamfer: 1.2, material: L.material, color: L.color, glow: L.glow,
        top: L.icon ? (f) => f.svg('<path class="ln-strong" d="' + (ICONS[L.icon] || L.icon) + '"/>', { u: w / 2 - 9, v: d / 2 - 9, transform: 'scale(.75)' }) : undefined,
        left: L.label && o.labels === 'face' ? (f) => f.text(L.label, 8, t / 2 + 2, { size: Math.min(5, t * 0.8), cls: 'tx tx-label', spacing: 0.8 }) : undefined,
      });
      if (L.label && o.labels !== 'face') {
        /* callout to the left of the layer */
        const ax = -w / 2, ay = d / 2, az = z + t / 2, side = o.labelSide === 'right';
        const p0 = side ? [w / 2, -d / 2 + 4, az] : [ax + 4, ay, az];
        const p1 = side ? [w / 2 + 16, -d / 2 + 4, az] : [ax + 4, ay + 16, az];
        g.line({ points: [p0, p1], line: 'ln-soft' });
        g.text({ text: L.label, at: p1, size: o.labelSize || 6, anchor: side ? 'start' : 'end', dx: side ? 4 : -4, dy: 2, cls: 'tx tx-label' });
      }
    });
  });

  /* Diagram node: a rounded block with an icon on top and a label on the front face. */
  define('block', (g, o) => {
    const [w, d, h] = o.size || [36, 36, 12];
    g.box({
      at: [-w / 2, -d / 2, 0], size: [w, d, h], r: o.r ?? 5, chamfer: o.chamfer ?? 1.5, material: o.material, color: o.color, glow: o.glow,
      top: o.icon ? (f) => {
        const s = (o.iconSize ?? Math.min(w, d) * 0.5) / 24;
        f.svg('<path class="' + (o.material === 'lit' ? 'ln-strong' : o.iconClass || 'ln-strong') + '" d="' + (ICONS[o.icon] || o.icon) + '"/>', { u: (f.w - 24 * s) / 2, v: (f.h - 24 * s) / 2, transform: 'scale(' + fmt(s) + ')' });
      } : undefined,
      left: o.label ? (f) => {
        const size = o.labelSize || Math.min(5.5, h * 0.42, (f.w - 6) / (String(o.label).length * 0.72));
        f.text(o.label, f.w / 2, f.h / 2 + size * 0.36, { size, anchor: 'middle', cls: o.material === 'lit' || o.material === 'accent' ? 'tx tx-label tx-on-lit' : 'tx tx-label' });
      } : undefined,
    });
  });
}
