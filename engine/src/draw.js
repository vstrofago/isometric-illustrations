// SPDX-License-Identifier: Apache-2.0
/* Draw context: shapes emit an ordered list of SVG ops in screen space.
   Fill ops never stroke (CSS gives them a hairline of their own colour to hide seams);
   line ops never fill. Colour always comes from CSS classes → custom properties. */
import { DEG, fmt, cssClass } from './math.js';

export const IDENTITY = Object.freeze({ x: 0, y: 0, z: 0, rot: 0, c: 1, s: 0 });

export function makeFrame(x = 0, y = 0, z = 0, rot = 0) {
  return { x, y, z, rot, c: Math.cos(rot * DEG), s: Math.sin(rot * DEG) };
}

/* parent ∘ local */
export function compose(p, l) {
  if (!l || l === IDENTITY) return p;
  const x = p.x + l.x * p.c - l.y * p.s;
  const y = p.y + l.x * p.s + l.y * p.c;
  return makeFrame(x, y, p.z + l.z, p.rot + l.rot);
}

export function applyFrame(f, x, y, z = 0) {
  if (!f.rot) return [x + f.x, y + f.y, z + f.z];
  return [f.x + x * f.c - y * f.s, f.y + x * f.s + y * f.c, z + f.z];
}

export function frameVec(f, v) {
  if (!f.rot) return v;
  return [v[0] * f.c - v[1] * f.s, v[0] * f.s + v[1] * f.c, v[2]];
}

export class Draw {
  constructor(view, frame = IDENTITY) {
    this.view = view;
    this.frame = frame;
    this.ops = [];
    this.b = [Infinity, Infinity, -Infinity, -Infinity];
  }
  /* local → world */
  w(x, y, z = 0) { return applyFrame(this.frame, x, y, z); }
  /* world → screen (tracks bounds) */
  P(x, y, z = 0) {
    const q = this.view.P(x, y, z), b = this.b;
    if (q[0] < b[0]) b[0] = q[0]; if (q[1] < b[1]) b[1] = q[1];
    if (q[0] > b[2]) b[2] = q[0]; if (q[1] > b[3]) b[3] = q[1];
    return q;
  }
  /* local → screen */
  p(x, y, z = 0) { const w = this.w(x, y, z); return this.P(w[0], w[1], w[2]); }

  /* screen points → path data */
  d(pts, close) {
    let s = '';
    for (let i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + fmt(pts[i][0]) + ' ' + fmt(pts[i][1]);
    return close ? s + 'Z' : s;
  }
  /* world points → path data */
  dw(pts, close) { return this.d(pts.map((p) => this.P(p[0], p[1], p[2] || 0)), close); }
  /* local points → path data */
  dl(pts, close) { return this.d(pts.map((p) => this.p(p[0], p[1], p[2] || 0)), close); }

  fill(d, cls, extra) { if (d) this.ops.push({ k: 'f', d, cls, extra }); return this; }
  line(d, cls = 'ln', extra) { if (d) this.ops.push({ k: 'l', d, cls, extra }); return this; }
  both(d, fillCls, lineCls = 'ln', extra) { this.fill(d, fillCls, extra); this.line(d, lineCls); return this; }
  raw(markup) { if (markup) this.ops.push({ k: 'r', s: markup }); return this; }

  /* Horizontal circle (world centre) → ellipse in screen, axis aligned.
     Angle t is measured in plan from +x towards +y (clockwise on screen). */
  hpt(cx, cy, z, r, t) { return this.P(cx + r * Math.cos(t * DEG), cy + r * Math.sin(t * DEG), z); }
  /* Arc commands from angle t0 to t1 (t1 > t0 draws clockwise on screen). Current point must be at t0. */
  harc(cx, cy, z, r, t0, t1) {
    const { C, S } = this.view;
    const rx = r * Math.SQRT2 * C, ry = r * Math.SQRT2 * S;
    if (r < 1e-6) return '';
    let s = '', span = t1 - t0;
    const steps = Math.max(1, Math.ceil(Math.abs(span) / 170));
    for (let i = 1; i <= steps; i++) {
      const t = t0 + (span * i) / steps;
      const q = this.hpt(cx, cy, z, r, t);
      s += 'A' + fmt(rx) + ' ' + fmt(ry) + ' 0 0 ' + (span > 0 ? 1 : 0) + ' ' + fmt(q[0]) + ' ' + fmt(q[1]);
    }
    /* bounds: include extremes crossed */
    for (let a = Math.ceil((Math.min(t0, t1) + 45) / 90) * 90 - 45; a <= Math.max(t0, t1); a += 90) this.hpt(cx, cy, z, r, a);
    return s;
  }
  /* Full horizontal ellipse path. */
  hcircle(cx, cy, z, r) {
    const a = this.hpt(cx, cy, z, r, -45);
    return 'M' + fmt(a[0]) + ' ' + fmt(a[1]) + this.harc(cx, cy, z, r, -45, 315) + 'Z';
  }

  /* SVG matrix mapping 2D content (u →, v ↓, world units) onto a world plane through o spanned by unit vectors u, v. */
  planeMatrix(o, u, v) {
    const { C, S } = this.view;
    const pu = [(u[0] - u[1]) * C, (u[0] + u[1]) * S - u[2]];
    const pv = [(v[0] - v[1]) * C, (v[0] + v[1]) * S - v[2]];
    const po = this.P(o[0], o[1], o[2]);
    return 'matrix(' + [pu[0], pu[1], pv[0], pv[1], po[0], po[1]].map(fmt).join(' ') + ')';
  }

  toString() {
    let s = '', i = 0;
    const ops = this.ops;
    while (i < ops.length) {
      const o = ops[i];
      if (o.k === 'r') { s += o.s; i++; continue; }
      if (o.k === 'f') {
        s += '<path class="' + cssClass(o.cls) + '" d="' + o.d + '"' + (o.extra || '') + '/>';
        i++; continue;
      }
      /* merge consecutive strokes of the same class */
      let d = o.d, j = i + 1;
      while (j < ops.length && ops[j].k === 'l' && ops[j].cls === o.cls && ops[j].extra === o.extra) d += ops[j++].d;
      s += '<path class="' + cssClass(o.cls) + '" d="' + d + '"' + (o.extra || '') + '/>';
      i = j;
    }
    return s;
  }
}
