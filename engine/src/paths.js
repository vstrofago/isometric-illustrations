/* World-space paths with arc-length parameterisation, for motion and for drawing.
   Angles are measured in plan from +x towards +y (clockwise on screen). */
import { DEG, v3, rrect } from './math.js';
import { filletPolyline } from './shapes.js';

export class Path {
  constructor(points, closed = false) {
    this.points = points.map((p) => [p[0], p[1], p[2] || 0]);
    this.closed = closed;
    if (closed && this.points.length > 1) {
      const a = this.points[0], b = this.points[this.points.length - 1];
      if (v3.len(v3.sub(a, b)) > 1e-6) this.points.push(a.slice());
    }
    this.cum = [0];
    for (let i = 1; i < this.points.length; i++) this.cum.push(this.cum[i - 1] + v3.len(v3.sub(this.points[i], this.points[i - 1])));
    this.length = this.cum[this.cum.length - 1];
  }
  _seg(u) {
    let s = this.closed ? ((u % 1) + 1) % 1 : Math.max(0, Math.min(1, u));
    const L = s * this.length, c = this.cum;
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] <= L) lo = m; else hi = m; }
    const seg = c[hi] - c[lo] || 1;
    return { i: lo, t: (L - c[lo]) / seg };
  }
  /* point at normalised arc length u ∈ [0, 1] (wraps when closed) */
  at(u) { const { i, t } = this._seg(u), p = this.points; return v3.lerp(p[i], p[Math.min(i + 1, p.length - 1)], t); }
  tangent(u) {
    const { i } = this._seg(u), p = this.points;
    const a = p[i], b = p[Math.min(i + 1, p.length - 1)];
    return v3.norm(v3.sub(b, a));
  }
  /* heading in plan, degrees */
  heading(u) { const t = this.tangent(u); return Math.atan2(t[1], t[0]) / DEG; }
  reverse() { return new Path(this.points.slice().reverse(), false); }
  offset(dx = 0, dy = 0, dz = 0) { return new Path(this.points.map((p) => [p[0] + dx, p[1] + dy, p[2] + dz]), false); }
}

export const path = {
  line: (a, b) => new Path([a, b]),
  polyline: (pts, opt = {}) => new Path(opt.radius ? filletPolyline(pts.map((p) => [p[0], p[1], p[2] || 0]), opt.radius) : pts, !!opt.closed),
  /* circle: {center:[x,y,z], r, start=0, ccw=false, n} */
  circle(o) {
    const [x, y, z] = o.center || [0, 0, 0], r = o.r || 10, n = o.n || 96, s = o.start || 0, dir = o.ccw ? -1 : 1;
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = (s + dir * (360 * i) / n) * DEG; pts.push([x + r * Math.cos(a), y + r * Math.sin(a), z || 0]); }
    return new Path(pts, true);
  },
  arc(o) {
    const [x, y, z] = o.center || [0, 0, 0], r = o.r || 10, a0 = o.from ?? 0, a1 = o.to ?? 90;
    const n = o.n || Math.max(8, Math.ceil(Math.abs(a1 - a0) / 4)), pts = [];
    for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * DEG; pts.push([x + r * Math.cos(a), y + r * Math.sin(a), z || 0]); }
    return new Path(pts);
  },
  /* cubic bezier in 3D */
  bezier(p0, p1, p2, p3, n = 48) {
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, m = 1 - t;
      pts.push([0, 1, 2].map((k) => m * m * m * p0[k] + 3 * m * m * t * p1[k] + 3 * m * t * t * p2[k] + t * t * t * p3[k]));
    }
    return new Path(pts);
  },
  /* a hop between two points: up, across, down (parcel arcs, data hops) */
  hop(a, b, height = 20, n = 32) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; const p = v3.lerp(a, b, t); p[2] += Math.sin(Math.PI * t) * height; pts.push(p); }
    return new Path(pts);
  },
  /* rounded rectangle loop on a plane: {at:[x,y,z], size:[w,d], r} (clockwise from the back corner) */
  rect(o) {
    const [x, y, z] = o.at || [0, 0, 0], [w, d] = o.size || [100, 100];
    return new Path(rrect(x, y, w, d, o.r || 0, 8).map((p) => [p[0], p[1], z || 0]), true);
  },
  join(...paths) { return new Path(paths.flatMap((p, i) => (i ? p.points.slice(1) : p.points))); },
};
