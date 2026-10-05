/* Primitives. All geometry is in world units (1 unit ≈ 1 px at zoom 1).
   Conventions
   - box / slab / flat rect:  `at` = min corner [x, y, z]  (or `center` = [cx, cy, z] footprint centre)
   - cylinder / cone / tube / sphere:  `at` = centre of the base [cx, cy, z] (sphere: centre)
   - every shape accepts: id, material, color, class, glow, layer, hidden, style, anchor
   Faces of solids: top (+z), left (+y, screen-left), right (+x, screen-right). */
import { Node } from './node.js';
import { DEG, EPS, fmt, rrect, isConvex, signedArea, insetConvex, rotatePts, circlePts, v3, box3 } from './math.js';
import { applyFrame, frameVec } from './draw.js';

/* ───────────────────────── Face drawer ─────────────────────────
   2D drawing on a planar face: u → along U, v → along V (world unit vectors), origin o (world). */
export class Face {
  constructor(d, o, U, V, w, h) { this.d = d; this.o = o; this.U = U; this.V = V; this.w = w; this.h = h; }
  /* a face given in the node's local coordinates (applies the draw frame) */
  static local(d, o, U, V, w, h) { return new Face(d, d.w(o[0], o[1], o[2]), frameVec(d.frame, v3.norm(U)), frameVec(d.frame, v3.norm(V)), w, h); }
  pt(u, v) { const o = this.o, U = this.U, V = this.V; return [o[0] + U[0] * u + V[0] * v, o[1] + U[1] * u + V[1] * v, o[2] + U[2] * u + V[2] * v]; }
  _shape(pts, close, opt = {}) {
    const d = this.d, path = d.dw(pts.map((p) => this.pt(p[0], p[1])), close);
    const fill = opt.fill, line = opt.line === undefined ? 'ln-soft' : opt.line;
    if (fill) d.fill(path, fill);
    if (line) d.line(path, line, opt.dash ? ' stroke-dasharray="' + opt.dash + '"' : undefined);
    return this;
  }
  rect(u, v, w, h, opt = {}) { return this._shape(rrect(u, v, w, h, opt.r || 0), true, opt); }
  poly(pts, opt = {}) { return this._shape(pts, opt.close !== false, opt); }
  line(u1, v1, u2, v2, cls = 'ln-soft') { this.d.line(this.d.dw([this.pt(u1, v1), this.pt(u2, v2)]), cls); return this; }
  circle(u, v, r, opt = {}) { return this._shape(circlePts(u, v, r, opt.n || Math.max(12, Math.round(r * 3))), true, opt); }
  /* evenly spaced lines: vents, slits */
  hlines(u, v, w, h, n, cls = 'ln-soft') { for (let i = 0; i < n; i++) { const y = n === 1 ? v : v + (h * i) / (n - 1); this.line(u, y, u + w, y, cls); } return this; }
  vlines(u, v, w, h, n, cls = 'ln-soft') { for (let i = 0; i < n; i++) { const x = n === 1 ? u : u + (w * i) / (n - 1); this.line(x, v, x, v + h, cls); } return this; }
  /* a grid of cells (windows, keys, panels); fn(i, j) may return per-cell options or false */
  grid(u, v, w, h, cols, rows, opt = {}) {
    const gap = opt.gap ?? 2, cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let o = opt;
      if (opt.each) { const r = opt.each(i, j); if (r === false) continue; if (r) o = { ...opt, ...r }; }
      this.rect(u + i * (cw + gap), v + j * (ch + gap), cw, ch, o);
    }
    return this;
  }
  /* SVG text laid on the face */
  text(str, u, v, opt = {}) {
    const size = opt.size || 8, anchor = opt.anchor || 'start';
    const m = this.d.planeMatrix(this.pt(u, v), this.U, this.V);
    const ls = opt.spacing !== undefined ? ' letter-spacing="' + opt.spacing + '"' : '';
    const w = opt.weight ? ' font-weight="' + opt.weight + '"' : '';
    this.d.raw('<text class="' + (opt.cls || 'tx') + '" transform="' + m + '" font-size="' + fmt(size) + '" text-anchor="' + anchor + '"' + ls + w + (opt.attrs || '') + '>' + escText(str) + '</text>');
    return this;
  }
  /* raw SVG content in face units, optional extra transform (e.g. 'translate(4 4) scale(2)') */
  svg(markup, opt = {}) {
    const m = this.d.planeMatrix(this.pt(opt.u || 0, opt.v || 0), this.U, this.V);
    this.d.raw('<g transform="' + m + (opt.transform ? ' ' + opt.transform : '') + '"' + (opt.cls ? ' class="' + opt.cls + '"' : '') + '>' + markup + '</g>');
    return this;
  }
  /* sub-face offset by (u, v) */
  sub(u, v, w, h) { return new Face(this.d, this.pt(u, v), this.U, this.V, w ?? this.w - u, h ?? this.h - v); }
  /* matrix string for custom content */
  matrix(u = 0, v = 0) { return this.d.planeMatrix(this.pt(u, v), this.U, this.V); }
}

export function escText(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

const TONES = { top: 'f-top', left: 'f-left', right: 'f-right', bevel: 'f-bevel' };
const tones = (o) => (o.tone ? { ...TONES, ...o.tone } : TONES);
const VIEW_N = (S) => [1, 1, 2 * S];

/* ───────────────────────── Prism (extruded plan polygon) ───────────────────────── */
export class Prism extends Node {
  get kind() { return 'prism'; }
  /* local plan polygon (with kinds), base z, height, chamfer */
  plan() {
    const o = this.opts, at = o.at || [0, 0, 0];
    const pts = (o.points || []).map((p) => [p[0] + at[0], p[1] + at[1]]);
    pts.kinds = o.kinds || pts.map(() => 'c');
    return { poly: pts, z: (o.z ?? at[2]) || 0, h: o.h ?? 10, c: o.chamfer || 0 };
  }
  lbox() {
    const { poly, z, h } = this.plan();
    const b = box3.empty();
    for (const p of poly) { box3.addPt(b, p[0], p[1], z); box3.addPt(b, p[0], p[1], z + h); }
    return b;
  }
  aabb(frame) {
    if (!frame.rot) return super.aabb(frame);
    const { poly, z, h } = this.plan(), b = box3.empty();
    for (const p of poly) { const w = applyFrame(frame, p[0], p[1], z); box3.addPt(b, w[0], w[1], w[2]); box3.addPt(b, w[0], w[1], w[2] + h); }
    return b;
  }
  /* inner top outline for the chamfer (world plan). Box overrides with a rounded inset. */
  insetPlan(W, c) { return insetConvex(W, c); }
  draw(d) {
    const { poly, z, h, c: c0 } = this.plan();
    if (poly.length < 3) return;
    const T = tones(this.opts);
    const W = poly.map((p) => { const w = d.w(p[0], p[1], z); return [w[0], w[1]]; });
    W.kinds = poly.kinds;
    const Z0 = d.w(0, 0, z)[2], Z1 = Z0 + h;
    const convex = isConvex(W);
    const c = convex ? Math.min(c0, h) : 0;
    const Zs = Z1 - c, N = W.length, ccw = signedArea(W) > 0;
    const kinds = W.kinds || [];
    const edges = [];
    for (let i = 0; i < N; i++) {
      const a = W[i], b = W[(i + 1) % N];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const nx = ccw ? dy : -dy, ny = ccw ? -dx : dx;
      edges.push({ i, visible: nx + ny > EPS * Math.hypot(dx, dy) * 10, right: nx > ny });
    }
    const P = (q, zz) => d.P(W[q][0], W[q][1], zz);
    if (h > EPS) {
      if (convex) {
        let start = -1;
        for (let i = 0; i < N; i++) if (edges[i].visible && !edges[(i + N - 1) % N].visible) { start = i; break; }
        if (start >= 0) {
          const run = [];
          for (let j = 0; j < N; j++) { const e = edges[(start + j) % N]; if (e.visible) run.push(e); else break; }
          const groups = []; let cur = null;
          for (const e of run) { if (!cur || cur.right !== e.right) groups.push((cur = { right: e.right, edges: [] })); cur.edges.push(e.i); }
          for (const g of groups) {
            const idx = g.edges.concat([(g.edges[g.edges.length - 1] + 1) % N]);
            const top = idx.map((q) => P(q, Zs)), bot = idx.map((q) => P(q, Z0)).reverse();
            d.fill(d.d(top.concat(bot), true), g.right ? T.right : T.left);
          }
          const chain = run.map((e) => e.i); chain.push((chain[chain.length - 1] + 1) % N);
          d.line(d.d(chain.map((q) => P(q, Z0))), 'ln');
          chain.forEach((q, ci) => {
            const end = ci === 0 || ci === chain.length - 1, k = kinds[q];
            if (end || k === 'c') d.line(d.d([P(q, Z0), P(q, Zs)]), 'ln');
            else if (k === 't') d.line(d.d([P(q, Z0), P(q, Zs)]), 'ln-soft');
          });
        }
      } else {
        const walls = edges.filter((e) => e.visible).map((e) => {
          const a = W[e.i], b = W[(e.i + 1) % N];
          return { e, key: a[0] + a[1] + b[0] + b[1] };
        }).sort((p, q) => p.key - q.key);
        for (const { e } of walls) {
          const i = e.i, j = (i + 1) % N;
          d.fill(d.d([P(i, Z1), P(j, Z1), P(j, Z0), P(i, Z0)], true), e.right ? T.right : T.left);
          d.line(d.d([P(i, Z0), P(j, Z0)]), 'ln');
          const prevVis = edges[(i + N - 1) % N].visible, nextVis = edges[j].visible;
          if (!prevVis || kinds[i] === 'c') d.line(d.d([P(i, Z0), P(i, Z1)]), 'ln');
          if (!nextVis || kinds[j] === 'c') d.line(d.d([P(j, Z0), P(j, Z1)]), 'ln');
        }
      }
    }
    let topPoly = W;
    if (c > EPS) {
      const inner = this.insetPlan(W, c);
      const outerD = d.d(W.map((p) => d.P(p[0], p[1], Zs)), true);
      const innerD = d.d(inner.map((p) => d.P(p[0], p[1], Z1)), true);
      d.fill(outerD + innerD, T.bevel, ' fill-rule="evenodd"');
      d.line(outerD, 'ln');
      topPoly = inner;
    }
    if (this.opts.top !== false) d.both(d.d(topPoly.map((p) => d.P(p[0], p[1], Z1)), true), T.top, 'ln');
    this.drawFaces(d);
  }
  drawFaces(_d) {}
}

/* ───────────────────────── Box ───────────────────────── */
export class Box extends Prism {
  get kind() { return 'box'; }
  dims() {
    const o = this.opts, s = o.size || [o.w ?? 20, o.d ?? 20, o.h ?? 20];
    let [x, y, z] = o.at || [0, 0, 0];
    if (o.center) { x = o.center[0] - s[0] / 2; y = o.center[1] - s[1] / 2; z = o.center[2] || 0; }
    if (o.z !== undefined) z = o.z;
    return { x, y, z, w: s[0], dd: s[1], h: s[2] };
  }
  plan() {
    const o = this.opts, { x, y, z, w, dd, h } = this.dims();
    let poly = rrect(x, y, w, dd, o.r || 0, o.n);
    if (o.rot) poly = rotatePts(poly, x + w / 2, y + dd / 2, o.rot);
    return { poly, z, h, c: o.chamfer || 0 };
  }
  insetPlan(W, c) {
    const o = this.opts;
    if (!o.r || o.rot) return insetConvex(W, c);
    const { x, y, w, dd } = this.dims();
    const f = this.frame;
    const inner = rrect(x + c, y + c, w - 2 * c, dd - 2 * c, Math.max((o.r || 0) - c, 0.6), o.n);
    return inner.map((p) => { const q = applyFrame(f, p[0], p[1], 0); return [q[0], q[1]]; });
  }
  /* face drawers in world space; available to callers via box.face(d, 'left') */
  face(d, which) {
    const { x, y, z, w, dd, h } = this.dims(), f = this.frame, o = this.opts;
    const rot = o.rot || 0;
    const L = (px, py, pz) => {
      let X = px, Y = py;
      if (rot) { const cx = x + w / 2, cy = y + dd / 2, c = Math.cos(rot * DEG), s = Math.sin(rot * DEG); X = cx + (px - cx) * c - (py - cy) * s; Y = cy + (px - cx) * s + (py - cy) * c; }
      return applyFrame(f, X, Y, pz);
    };
    const R = (v) => { let r = v; if (rot) { const c = Math.cos(rot * DEG), s = Math.sin(rot * DEG); r = [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; } return frameVec(f, r); };
    const top = z + h;
    if (which === 'left') return new Face(d, L(x, y + dd, top), R([1, 0, 0]), R([0, 0, -1]), w, h);
    if (which === 'right') return new Face(d, L(x + w, y + dd, top), R([0, -1, 0]), R([0, 0, -1]), dd, h);
    if (which === 'top') return new Face(d, L(x, y, top), R([1, 0, 0]), R([0, 1, 0]), w, dd);
    if (which === 'back-left') return new Face(d, L(x + w, y, top), R([-1, 0, 0]), R([0, 0, -1]), w, h);
    if (which === 'back-right') return new Face(d, L(x, y, top), R([0, 1, 0]), R([0, 0, -1]), dd, h);
    return null;
  }
  drawFaces(d) {
    const o = this.opts;
    for (const k of ['left', 'right', 'top']) if (typeof o[k] === 'function') o[k](this.face(d, k), this);
    if (typeof o.faces === 'function') o.faces((k) => this.face(d, k), this);
  }
}

/* ───────────────────────── Cylinder / cone / frustum ───────────────────────── */
export class Cylinder extends Node {
  get kind() { return 'cylinder'; }
  g() {
    const o = this.opts, at = o.at || [0, 0, 0];
    const r = o.r ?? 10, rt = o.rTop ?? r;
    return { cx: at[0], cy: at[1], z: (o.z ?? at[2]) || 0, r, rt, h: o.h ?? 10, c: o.chamfer || 0 };
  }
  lbox() { const { cx, cy, z, r, rt, h } = this.g(), R = Math.max(r, rt); return [cx - R, cy - R, z, cx + R, cy + R, z + h]; }
  draw(d) {
    const { cx: lx, cy: ly, z, r, rt, h } = this.g();
    const T = tones(this.opts), o = this.opts;
    const [cx, cy, Z0] = d.w(lx, ly, z);
    const c = Math.min(this.g().c, rt * 0.9, h);
    const Z1 = Z0 + h, Zs = Z1 - c;
    const S = d.view.S;
    const q = h > EPS ? (-2 * S * (r - rt)) / (h * Math.SQRT2) : (r > rt ? -2 : 2);
    let t1 = -45, t2 = 135, full = false;
    if (q <= -1) full = true;
    else if (q < 1) { const a = Math.asin(q) / DEG; t1 = a - 45; t2 = 135 - a; }
    const rS = rt + (r - rt) * (c / (h || 1)); // radius at Zs on a frustum
    const pt = (rr, zz, t) => d.hpt(cx, cy, zz, rr, t);
    const M = (p) => 'M' + fmt(p[0]) + ' ' + fmt(p[1]);
    const Lp = (p) => 'L' + fmt(p[0]) + ' ' + fmt(p[1]);
    if (h > EPS && q < 1) {
      if (full) {
        /* flat cone/frustum seen from above: the whole flank shows; two tones split through the apex */
        const top = rS > EPS ? null : d.P(cx, cy, Z1);
        for (const [a, b, cls] of [[-135, 45, T.right], [45, 225, T.left]]) {
          let s = M(pt(r, Z0, a)) + d.harc(cx, cy, Z0, r, a, b);
          s += top ? Lp(top) + 'Z' : Lp(pt(rS, Zs, b)) + d.harc(cx, cy, Zs, rS, b, a) + 'Z';
          d.fill(s, cls);
        }
        d.line(d.hcircle(cx, cy, Z0, r), 'ln');
        if (top) { d.line(d.d([pt(r, Z0, -45), top]), 'ln-soft'); d.line(d.d([pt(r, Z0, 135), top]), 'ln-soft'); }
      } else {
        /* two tones split where the surface faces the viewer (45°) */
        const parts = [[t1, Math.min(45, t2), T.right], [Math.max(45, t1), t2, T.left]];
        for (const [a, b, cls] of parts) {
          if (b - a < 0.01) continue;
          let s = M(pt(r, Z0, a)) + d.harc(cx, cy, Z0, r, a, b);
          if (rS > EPS) s += Lp(pt(rS, Zs, b)) + d.harc(cx, cy, Zs, rS, b, a) + 'Z'; else s += Lp(d.P(cx, cy, Z1)) + 'Z';
          d.fill(s, cls);
        }
        d.line(M(pt(r, Z0, t1)) + d.harc(cx, cy, Z0, r, t1, t2), 'ln');
        const apex = rS > EPS ? null : d.P(cx, cy, Z1);
        d.line(d.d([pt(r, Z0, t1), apex || pt(rS, Zs, t1)]), 'ln');
        d.line(d.d([pt(r, Z0, t2), apex || pt(rS, Zs, t2)]), 'ln');
        /* horizontal bands and vertical ribs on the visible side */
        if (o.bands) for (const bz of o.bands) {
          const f = (bz - z) / h, rb = r + (rt - r) * f;
          d.line(M(pt(rb, Z0 + bz - z, t1)) + d.harc(cx, cy, Z0 + bz - z, rb, t1, t2), o.bandClass || 'ln-soft');
        }
        if (o.ribs) {
          const n = o.ribs, a0 = o.ribStart || 0;
          for (let i = 0; i < n; i++) {
            let a = a0 + (360 * i) / n; a = ((a - t1) % 360 + 360) % 360 + t1;
            if (a > t1 + 0.5 && a < t2 - 0.5) d.line(d.d([pt(r, Z0 + (o.ribFrom ?? 0), a), pt(r + (rt - r) * ((o.ribTo ?? h) / h), Z0 + (o.ribTo ?? h), a)]), o.ribClass || 'ln-soft');
          }
        }
      }
    }
    if (rt > EPS) {
      if (c > EPS) {
        d.fill(d.hcircle(cx, cy, Zs, rS) + d.hcircle(cx, cy, Z1, rt - c), T.bevel, ' fill-rule="evenodd"');
        d.line(d.hcircle(cx, cy, Zs, rS), 'ln');
        if (o.top !== false) d.both(d.hcircle(cx, cy, Z1, rt - c), T.top, 'ln');
      } else if (o.top !== false) d.both(d.hcircle(cx, cy, Z1, rt), T.top, 'ln');
      if (o.rings) for (const rr of o.rings) d.line(d.hcircle(cx, cy, Z1, rr), 'ln-soft');
    }
    if (typeof o.topFace === 'function') {
      const f = new Face(d, [cx, cy, Z1], [1, 0, 0], [0, 1, 0], rt * 2, rt * 2);
      o.topFace(f, this);
    }
  }
}

/* ───────────────────────── Tube segment (ring wall) ─────────────────────────
   One angular piece of a hollow cylinder. `tube()` splits a ring into segments so that
   objects inside the courtyard sort correctly between its far and near halves. */
function rangeIntersect(a0, a1, v0, v1) {
  /* intersect [a0,a1] with the periodic interval [v0,v1] (degrees); returns [start, end, period shift] */
  const out = [];
  for (const k of [-360, 0, 360]) {
    const s = Math.max(a0, v0 + k), e = Math.min(a1, v1 + k);
    if (e - s > 0.01) out.push([s, e, k]);
  }
  return out;
}
export class TubeSegment extends Node {
  get kind() { return 'tube-segment'; }
  g() {
    const o = this.opts, at = o.at || [0, 0, 0];
    return { cx: at[0], cy: at[1], z: at[2] || 0, r: o.r, ri: o.ri, h: o.h, a0: o.a0, a1: o.a1 };
  }
  lbox() {
    const { cx, cy, z, r, ri, h, a0, a1 } = this.g();
    const b = box3.empty();
    const angs = [a0, a1];
    for (let a = Math.ceil(a0 / 90) * 90; a <= a1; a += 90) angs.push(a);
    for (const a of angs) for (const rr of [r, ri]) box3.addPt(b, cx + rr * Math.cos(a * DEG), cy + rr * Math.sin(a * DEG), z);
    b[5] = z + h;
    return b;
  }
  draw(d) {
    const { cx: lx, cy: ly, z, r, ri, h, a0, a1 } = this.g(), o = this.opts, T = tones(o);
    const [cx, cy, Z0] = d.w(lx, ly, z), Z1 = Z0 + h;
    const pt = (rr, zz, t) => d.hpt(cx, cy, zz, rr, t);
    const M = (p) => 'M' + fmt(p[0]) + ' ' + fmt(p[1]);
    const Lp = (p) => 'L' + fmt(p[0]) + ' ' + fmt(p[1]);
    const wall = (rr, s, e, cls) => M(pt(rr, Z0, s)) + d.harc(cx, cy, Z0, rr, s, e) + Lp(pt(rr, Z1, e)) + d.harc(cx, cy, Z1, rr, e, s) + 'Z';
    /* inner wall: the far half faces the viewer */
    if (ri > EPS) for (const [s, e, k] of rangeIntersect(a0, a1, 135, 315)) {
      for (const [s2, e2, cls] of [[s, Math.min(e, 225 + k), T.right], [Math.max(s, 225 + k), e, T.left]]) {
        if (e2 - s2 > 0.01) d.fill(wall(ri, s2, e2), cls);
      }
      d.line(M(pt(ri, Z0, s)) + d.harc(cx, cy, Z0, ri, s, e), 'ln-soft');
      for (const sil of [135, 315, 135 + 360, 315 - 360]) if (sil > a0 + 0.01 && sil < a1 - 0.01) d.line(d.d([pt(ri, Z0, sil), pt(ri, Z1, sil)]), 'ln');
      if (o.innerBands) for (const bz of o.innerBands) d.line(M(pt(ri, Z0 + bz, s)) + d.harc(cx, cy, Z0 + bz, ri, s, e), 'ln-soft');
    }
    /* outer wall: the near half */
    for (const [s, e, k] of rangeIntersect(a0, a1, -45, 135)) {
      for (const [s2, e2, cls] of [[s, Math.min(e, 45 + k), T.right], [Math.max(s, 45 + k), e, T.left]]) {
        if (e2 - s2 > 0.01) d.fill(wall(r, s2, e2), cls);
      }
      d.line(M(pt(r, Z0, s)) + d.harc(cx, cy, Z0, r, s, e), 'ln');
      for (const sil of [-45, 135, 315, 495]) if (sil > a0 + 0.01 && sil < a1 - 0.01) d.line(d.d([pt(r, Z0, sil), pt(r, Z1, sil)]), 'ln');
      if (o.bands) for (const bz of o.bands) d.line(M(pt(r, Z0 + bz, s)) + d.harc(cx, cy, Z0 + bz, r, s, e), o.bandClass || 'ln-soft');
      if (o.ribs) {
        const step = 360 / o.ribs;
        for (let a = Math.ceil(s / step) * step; a < e; a += step) if (a > s + 0.3) d.line(d.d([pt(r, Z0 + (o.ribFrom ?? 0), a), pt(r, Z0 + (o.ribTo ?? h), a)]), o.ribClass || 'ln-soft');
      }
    }
    /* top annulus piece: fill without radial seams, arcs stroked */
    const top = M(pt(r, Z1, a0)) + d.harc(cx, cy, Z1, r, a0, a1) + (ri > EPS ? Lp(pt(ri, Z1, a1)) + d.harc(cx, cy, Z1, ri, a1, a0) : Lp(d.P(cx, cy, Z1))) + 'Z';
    d.fill(top, T.top);
    d.line(M(pt(r, Z1, a0)) + d.harc(cx, cy, Z1, r, a0, a1), 'ln');
    if (ri > EPS) d.line(M(pt(ri, Z1, a0)) + d.harc(cx, cy, Z1, ri, a0, a1), 'ln');
    if (o.topRings) for (const rr of o.topRings) d.line(M(pt(rr, Z1, a0)) + d.harc(cx, cy, Z1, rr, a0, a1), 'ln-soft');
    if (o.topRadials) {
      const step = 360 / o.topRadials;
      for (let a = Math.ceil(a0 / step) * step; a < a1; a += step) d.line(d.d([pt(ri, Z1, a), pt(r, Z1, a)]), 'ln-soft');
    }
  }
}

/* ───────────────────────── Sphere ───────────────────────── */
export class Sphere extends Node {
  get kind() { return 'sphere'; }
  lbox() { const o = this.opts, [x, y, z] = o.at || [0, 0, 0], r = o.r ?? 10; return [x - r, y - r, z - r, x + r, y + r, z + r]; }
  draw(d) {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], r = o.r ?? 10, T = tones(o);
    const w = d.w(x, y, z), c = d.P(w[0], w[1], w[2]);
    const { C, S } = d.view, rx = r * Math.SQRT2 * C, ry = r * Math.sqrt(2 * S * S + 1);
    d.P(w[0], w[1], w[2] + r); d.P(w[0] + r, w[1] - r, w[2]); d.P(w[0] - r, w[1] + r, w[2]); d.P(w[0], w[1], w[2] - r);
    const circ = (k, dx = 0, dy = 0) => {
      const a = rx * k, b = ry * k, X = c[0] + dx, Y = c[1] + dy;
      return 'M' + fmt(X - a) + ' ' + fmt(Y) + 'A' + fmt(a) + ' ' + fmt(b) + ' 0 1 0 ' + fmt(X + a) + ' ' + fmt(Y) + 'A' + fmt(a) + ' ' + fmt(b) + ' 0 1 0 ' + fmt(X - a) + ' ' + fmt(Y) + 'Z';
    };
    d.fill(circ(1), T.right);
    /* soft lit cap toward the top-left */
    d.fill(circ(0.78, -rx * 0.14, -ry * 0.16), T.top, ' opacity=".7"');
    d.line(circ(1), 'ln');
    if (o.equator) d.line('M' + fmt(c[0] - rx) + ' ' + fmt(c[1]) + d.harc(w[0], w[1], w[2], r, 135, 315), 'ln-soft');
  }
}

/* ───────────────────────── Convex polyhedron ───────────────────────── */
export class Hull extends Node {
  get kind() { return 'hull'; }
  verts() { const o = this.opts, at = o.at || [0, 0, 0]; return (o.vertices || []).map((v) => [v[0] + at[0], v[1] + at[1], v[2] + at[2]]); }
  lbox() { const b = box3.empty(); for (const v of this.verts()) box3.addPt(b, v[0], v[1], v[2]); return b; }
  aabb(frame) {
    const b = box3.empty();
    for (const v of this.verts()) { const w = applyFrame(frame, v[0], v[1], v[2]); box3.addPt(b, w[0], w[1], w[2]); }
    return b;
  }
  draw(d) {
    const o = this.opts, T = tones(o);
    const V = this.verts().map((v) => d.w(v[0], v[1], v[2]));
    const cen = V.reduce((a, v) => v3.add(a, v), [0, 0, 0]).map((s) => s / V.length);
    const view = VIEW_N(d.view.S);
    const all = (o.faces || []).map((f, fi) => {
      const p = f.map((i) => V[i]);
      let n = [0, 0, 0];
      for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; n = v3.add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]); }
      const fc = p.reduce((a, v) => v3.add(a, v), [0, 0, 0]).map((s) => s / p.length);
      if (v3.dot(n, v3.sub(fc, cen)) < 0) n = v3.mul(n, -1);
      n = v3.norm(n);
      const visible = v3.dot(n, view) > 1e-6;
      const cls = n[2] >= Math.max(n[0], n[1]) - 1e-6 ? T.top : n[1] > n[0] ? T.left : T.right;
      return { f, p, cls, fi, n, visible };
    });
    const faces = all.filter((f) => f.visible);
    for (const f of faces) d.fill(d.dw(f.p, true), (o.faceTones && o.faceTones[f.fi]) || f.cls);
    /* outlines: silhouette edges and sharp creases only, so rounded profiles read as smooth */
    const edges = new Map();
    all.forEach((F) => F.f.forEach((a, i) => {
      const b = F.f[(i + 1) % F.f.length], k = a < b ? a + ',' + b : b + ',' + a;
      const e = edges.get(k); if (e) e.push(F); else edges.set(k, [F]);
    }));
    const crease = Math.cos(((o.crease ?? 28) * Math.PI) / 180);
    let ln = '';
    for (const [k, fs] of edges) {
      const vis = fs.filter((F) => F.visible);
      if (!vis.length) continue;
      const sharp = fs.length < 2 || vis.length === 1 || v3.dot(fs[0].n, fs[1].n) < crease;
      if (!sharp) continue;
      const [a, b] = k.split(',').map(Number);
      ln += d.dw([V[a], V[b]]);
    }
    d.line(ln, 'ln');
    if (typeof o.onFaces === 'function') o.onFaces(d, faces);
  }
}

/* A slab with a rounded-rectangle profile standing on a plane: phones, screens, doors, signs.
   plane 'left': the front faces +y, width runs +x, height +z, thickness goes −y.
   plane 'right': the front faces +x, width runs −y, height +z, thickness goes −x.
   plane 'top': lying flat, front faces +z, width +x, depth +y, thickness goes −z.
   at = bottom-left corner of the front face (for 'top': the back-left corner of the top face). */
const PANEL_AXES = {
  left: { U: [1, 0, 0], V: [0, 0, -1], N: [0, 1, 0] },
  right: { U: [0, -1, 0], V: [0, 0, -1], N: [1, 0, 0] },
  top: { U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1] },
};
export class Panel extends Hull {
  get kind() { return 'panel'; }
  geo() {
    const o = this.opts, ax = PANEL_AXES[o.plane || 'left'], at = o.at || [0, 0, 0];
    const w = o.w ?? 20, h = o.h ?? 30, t = o.t ?? 2;
    const tl = o.plane === 'top' ? at : [at[0], at[1], at[2] + h];
    return { ax, w, h, t, tl };
  }
  verts() {
    const o = this.opts, { ax, w, h, t, tl } = this.geo();
    const prof = rrect(0, 0, w, h, o.r ?? 2, o.n || 4);
    const P = (u, v, k) => [tl[0] + ax.U[0] * u + ax.V[0] * v - ax.N[0] * k, tl[1] + ax.U[1] * u + ax.V[1] * v - ax.N[1] * k, tl[2] + ax.U[2] * u + ax.V[2] * v - ax.N[2] * k];
    return prof.map((p) => P(p[0], p[1], 0)).concat(prof.map((p) => P(p[0], p[1], t)));
  }
  draw(d) {
    const o = this.opts, n = rrect(0, 0, this.geo().w, this.geo().h, o.r ?? 2, o.n || 4).length;
    const faces = [Array.from({ length: n }, (_, i) => i), Array.from({ length: n }, (_, i) => 2 * n - 1 - i)];
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n + ((i + 1) % n), n + i]);
    this.opts.faces = faces;
    super.draw(d);
    if (typeof o.front === 'function') o.front(this.face(d), this);
  }
  /* Face drawer on the front, (0,0) at the top-left corner */
  face(d) {
    const { ax, w, h, tl } = this.geo();
    return new Face(d, d.w(...tl), frameVec(d.frame, ax.U), frameVec(d.frame, ax.V), w, h);
  }
}

/* Parallelepiped from an origin and three edge vectors (tilted slabs: laptop lids, signs, ramps). */
export function slabVertices(origin, u, v, w) {
  const o = origin, A = (...vs) => vs.reduce((s, x) => v3.add(s, x), o);
  return [A(), A(u), A(u, v), A(v), A(w), A(u, w), A(u, v, w), A(v, w)];
}
export const SLAB_FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];

/* ───────────────────────── Flat shapes on a horizontal plane ───────────────────────── */
export class Flat extends Node {
  get kind() { return 'flat'; }
  g() {
    const o = this.opts, at = o.at || [0, 0, 0];
    return { x: at[0], y: at[1], z: (o.z ?? at[2]) || 0 };
  }
  outline() {
    const o = this.opts, { x, y } = this.g();
    if (o.shape === 'poly') return (o.points || []).map((p) => [p[0] + x, p[1] + y]);
    const s = o.size || [o.w ?? 20, o.d ?? 20];
    let pts = rrect(x, y, s[0], s[1], o.r || 0, o.n);
    if (o.rot) pts = rotatePts(pts, x + s[0] / 2, y + s[1] / 2, o.rot);
    return pts;
  }
  lbox() {
    const o = this.opts, { x, y, z } = this.g();
    if (o.shape === 'circle' || o.shape === 'ring') { const r = o.r ?? 10; return [x - r, y - r, z, x + r, y + r, z]; }
    const b = box3.empty(); for (const p of this.outline()) box3.addPt(b, p[0], p[1], z); return b;
  }
  draw(d) {
    const o = this.opts, { x, y, z } = this.g();
    const fill = o.fill === undefined ? null : o.fill, line = o.line === undefined ? 'ln-soft' : o.line;
    const dash = o.dash ? ' stroke-dasharray="' + o.dash + '"' : undefined;
    let path;
    if (o.shape === 'circle' || o.shape === 'ring') {
      const [cx, cy, Z] = d.w(x, y, z);
      path = d.hcircle(cx, cy, Z, o.r ?? 10);
      if (o.shape === 'ring') {
        const inner = d.hcircle(cx, cy, Z, o.ri ?? (o.r ?? 10) / 2);
        if (fill) d.fill(path + inner, fill, ' fill-rule="evenodd"');
        if (line) { d.line(path, line, dash); d.line(inner, line, dash); }
        return;
      }
    } else path = d.dl(this.outline().map((p) => [p[0], p[1], z]), true);
    if (fill) d.fill(path, fill);
    if (line) d.line(path, line, dash);
  }
}

/* ───────────────────────── Lines, arrows, helices ───────────────────────── */
function arrowHead(d, a, b, size, cls) {
  /* triangle lying in the plane that contains the segment and is most visible */
  let dir = v3.sub(b, a); const L = v3.len(dir); if (L < EPS) return;
  dir = v3.mul(dir, 1 / L);
  let perp = Math.abs(dir[2]) > 0.9 ? v3.norm([1, -1, 0]) : v3.norm([-dir[1], dir[0], 0]);
  const base = v3.sub(b, v3.mul(dir, size));
  const p1 = v3.add(base, v3.mul(perp, size * 0.45)), p2 = v3.sub(base, v3.mul(perp, size * 0.45));
  d.fill(d.dw([b, p1, p2], true), cls);
}

export class Line extends Node {
  get kind() { return 'line'; }
  pts() {
    const o = this.opts, at = o.at || [0, 0, 0];
    let pts = o.path ? o.path.points : o.points || [];
    return pts.map((p) => [p[0] + at[0], p[1] + at[1], (p[2] || 0) + at[2]]);
  }
  lbox() { const b = box3.empty(); for (const p of this.pts()) box3.addPt(b, p[0], p[1], p[2]); return box3.valid(b) ? b : null; }
  aabb(frame) { const b = box3.empty(); for (const p of this.pts()) { const w = applyFrame(frame, p[0], p[1], p[2]); box3.addPt(b, w[0], w[1], w[2]); } return box3.valid(b) ? b : null; }
  draw(d) {
    const o = this.opts, pts = this.pts().map((p) => d.w(p[0], p[1], p[2]));
    if (pts.length < 2) return;
    const cls = o.line || o.cls || 'ln';
    let extra = '';
    if (o.dash) extra += ' stroke-dasharray="' + o.dash + '"';
    if (o.flow) extra += ' data-flow="' + o.flow + '"';
    if (o.width) extra += ' stroke-width="' + o.width + '"';
    if (o.reveal !== undefined && o.reveal < 1) extra += ' pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + fmt(1 - Math.max(0, o.reveal)) + '"';
    d.line(d.dw(pts, o.closed), cls, extra || undefined);
    if (o.reveal !== undefined && o.reveal < 1) return;
    const as = o.arrowSize || 5;
    if (o.arrow === 'end' || o.arrow === 'both' || o.arrow === true) arrowHead(d, pts[pts.length - 2], pts[pts.length - 1], as, o.arrowClass || 'f-ink');
    if (o.arrow === 'start' || o.arrow === 'both') arrowHead(d, pts[1], pts[0], as, o.arrowClass || 'f-ink');
    if (o.dots) for (const p of [pts[0], pts[pts.length - 1]]) d.both(d.hcircle(p[0], p[1], p[2], o.dots), 'f-ink', null);
  }
}

/* Orthogonal route on a horizontal plane with rounded corners. */
export function routePoints(from, to, opt = {}) {
  const z = opt.z || 0, r = opt.radius ?? 6, mode = opt.route || 'auto';
  const [x0, y0] = from, [x1, y1] = to;
  let pts;
  if (Array.isArray(mode)) pts = [[x0, y0], ...mode, [x1, y1]];
  else if (mode === 'straight' || (Math.abs(x1 - x0) < EPS || Math.abs(y1 - y0) < EPS)) pts = [[x0, y0], [x1, y1]];
  else {
    const xf = mode === 'x' ? true : mode === 'y' ? false : mode === 'xyx' || mode === 'yxy' ? null : Math.abs(x1 - x0) >= Math.abs(y1 - y0);
    if (mode === 'xyx') { const mx = (x0 + x1) / 2; pts = [[x0, y0], [mx, y0], [mx, y1], [x1, y1]]; }
    else if (mode === 'yxy') { const my = (y0 + y1) / 2; pts = [[x0, y0], [x0, my], [x1, my], [x1, y1]]; }
    else pts = xf ? [[x0, y0], [x1, y0], [x1, y1]] : [[x0, y0], [x0, y1], [x1, y1]];
  }
  return filletPolyline(pts.map((p) => [p[0], p[1], p[2] ?? z]), r);
}

/* Round the corners of a polyline with arcs of radius r (in 3D, works in any plane). */
export function filletPolyline(pts, r, closed = false) {
  if (r <= 0 || pts.length < 3) return pts.map((p) => p.slice());
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const u = v3.sub(a, b), w = v3.sub(c, b), lu = v3.len(u), lw = v3.len(w);
    if (lu < EPS || lw < EPS) continue;
    const un = v3.mul(u, 1 / lu), wn = v3.mul(w, 1 / lw);
    const cos = clampN(v3.dot(un, wn), -1, 1), ang = Math.acos(cos);
    if (ang > Math.PI - 1e-3) { out.push(b.slice()); continue; }
    const t = Math.min(r / Math.tan(ang / 2), lu / 2, lw / 2);
    const p0 = v3.add(b, v3.mul(un, t)), p1 = v3.add(b, v3.mul(wn, t));
    const n = 8;
    for (let k = 0; k <= n; k++) {
      const s = k / n;
      /* quadratic bezier approximates the fillet well enough at these sizes */
      const q = v3.add(v3.add(v3.mul(p0, (1 - s) * (1 - s)), v3.mul(b, 2 * s * (1 - s))), v3.mul(p1, s * s));
      out.push(q);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

/* Flat strip along a polyline (roads, paths, belts). */
export class Ribbon extends Node {
  get kind() { return 'ribbon'; }
  pts() { const o = this.opts; return (o.path ? o.path.points : o.points || []).map((p) => [p[0], p[1], p[2] ?? o.z ?? 0]); }
  outline() {
    const o = this.opts, P = this.pts(), hw = (o.width ?? 10) / 2, L = [], R = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      L.push([P[i][0] - dy * hw, P[i][1] + dx * hw, P[i][2]]);
      R.push([P[i][0] + dy * hw, P[i][1] - dx * hw, P[i][2]]);
    }
    return { L, R };
  }
  lbox() { const b = box3.empty(), { L, R } = this.outline(); for (const p of L.concat(R)) box3.addPt(b, p[0], p[1], p[2]); return box3.valid(b) ? b : null; }
  aabb(frame) { const b = box3.empty(), { L, R } = this.outline(); for (const p of L.concat(R)) { const w = applyFrame(frame, p[0], p[1], p[2]); box3.addPt(b, w[0], w[1], w[2]); } return box3.valid(b) ? b : null; }
  draw(d) {
    const o = this.opts, { L, R } = this.outline();
    if (L.length < 2) return;
    d.fill(d.dl(L.concat(R.slice().reverse()), true), o.fill || 'f-road');
    if (o.line !== false) { d.line(d.dl(L), o.line || 'ln-soft'); d.line(d.dl(R), o.line || 'ln-soft'); }
    if (o.center) d.line(d.dl(this.pts()), 'ln-soft', ' stroke-dasharray="' + (o.center === true ? '4 4' : o.center) + '"' + (o.flow ? ' data-flow="' + o.flow + '"' : ''));
  }
}

export class Helix extends Node {
  get kind() { return 'helix'; }
  lbox() { const o = this.opts, b = box3.empty(); for (const p of [o.a, o.b]) box3.addPt(b, p[0], p[1], p[2]); return [b[0] - o.r, b[1] - o.r, b[2] - o.r, b[3] + o.r, b[4] + o.r, b[5] + o.r]; }
  draw(d) {
    const o = this.opts, a = d.w(...o.a), b = d.w(...o.b);
    let dd = v3.sub(b, a); const L = v3.len(dd); dd = v3.mul(dd, 1 / L);
    let e1 = v3.norm([dd[1], -dd[0], 0]);
    if (!isFinite(e1[0]) || v3.len([dd[1], -dd[0], 0]) < 1e-6) e1 = [1, 0, 0];
    const e2 = v3.cross(dd, e1);
    const n = o.n || Math.round(o.turns * 12), pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, th = o.turns * 2 * Math.PI * t;
      pts.push(v3.add(v3.add(a, v3.mul(dd, L * t)), v3.add(v3.mul(e1, o.r * Math.cos(th)), v3.mul(e2, o.r * Math.sin(th)))));
    }
    d.line(d.dw(pts), o.line || 'ln');
  }
}

/* ───────────────────────── Text and 2D content on a plane ───────────────────────── */
const PLANES = {
  top: [[1, 0, 0], [0, 1, 0]],
  left: [[1, 0, 0], [0, 0, -1]],   // the +y facing plane, reads left → right going down-right
  right: [[0, -1, 0], [0, 0, -1]], // the +x facing plane, reads left → right going up-right
  'top-y': [[0, -1, 0], [1, 0, 0]], // top plane, text running along −y (up-right)
};
export class Text extends Node {
  get kind() { return 'text'; }
  lbox() {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], size = o.size || 8;
    const len = String(o.text ?? '').length * size * 0.62;
    const pl = PLANES[o.plane || 'screen'];
    if (!pl) return [x, y, z, x, y, z];
    const [U] = pl, b = box3.empty();
    const s = o.anchor === 'middle' ? -0.5 : o.anchor === 'end' ? -1 : 0;
    box3.addPt(b, x + U[0] * len * s, y + U[1] * len * s, z);
    box3.addPt(b, x + U[0] * len * (s + 1), y + U[1] * len * (s + 1), z);
    return b;
  }
  draw(d) {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], size = o.size || 8;
    const pl = PLANES[o.plane || 'screen'];
    const cls = o.cls || (o.plane === 'screen' || !o.plane ? 'tx tx-label' : 'tx');
    const anchor = o.anchor || 'start';
    const ls = o.spacing !== undefined ? ' letter-spacing="' + o.spacing + '"' : '';
    const wt = o.weight ? ' font-weight="' + o.weight + '"' : '';
    let str = String(o.text ?? '');
    if (o.chars !== undefined) str = str.slice(0, Math.max(0, Math.round(o.chars)));
    const lines = str.split('\n');
    const lh = (o.lineHeight || 1.3) * size;
    let tsp = lines.length === 1 ? escText(lines[0]) : lines.map((l, i) => '<tspan x="0" dy="' + (i ? fmt(lh) : 0) + '">' + escText(l) + '</tspan>').join('');
    if (!pl) {
      const w = d.w(x, y, z), p = d.P(w[0], w[1], w[2]);
      const dx = o.dx || 0, dy = o.dy || 0;
      /* estimate the text box so fitting includes it (mono ≈ 0.62em per char, labels are tracked) */
      const tw = Math.max(...lines.map((l) => l.length)) * size * (cls.includes('tx-label') ? 0.72 : 0.62);
      const x0 = p[0] + dx - (anchor === 'middle' ? tw / 2 : anchor === 'end' ? tw : 0), y1 = p[1] + dy;
      const b = d.b;
      b[0] = Math.min(b[0], x0); b[2] = Math.max(b[2], x0 + tw); b[1] = Math.min(b[1], y1 - size); b[3] = Math.max(b[3], y1 + lh * (lines.length - 1) + size * 0.3);
      d.raw('<text class="' + cls + '" transform="translate(' + fmt(p[0] + dx) + ' ' + fmt(p[1] + dy) + ')" font-size="' + fmt(size) + '" text-anchor="' + anchor + '"' + ls + wt + '>' + tsp + '</text>');
      return;
    }
    const U = frameVec(d.frame, pl[0]), V = frameVec(d.frame, pl[1]);
    const f = new Face(d, d.w(x, y, z), U, V, 0, 0);
    const m = f.matrix(0, 0);
    d.raw('<text class="' + cls + '" transform="' + m + '" font-size="' + fmt(size) + '" text-anchor="' + anchor + '"' + ls + wt + '>' + tsp + '</text>');
    d.P(...f.pt(String(o.text).length * size * 0.6, 0));
  }
}

/* A rectangle of 2D content on a plane: panes of glass, signs, screens, decals.
   draw(face) receives a Face whose (0,0) is `at` and whose size is w × h. */
export class Pane extends Node {
  get kind() { return 'pane'; }
  basis(frame) {
    const o = this.opts, pl = PLANES[o.plane || 'left'];
    return { U: frameVec(frame, o.u || pl[0]), V: frameVec(frame, o.v || pl[1]) };
  }
  corners() {
    const o = this.opts, at = o.at || [0, 0, 0], pl = PLANES[o.plane || 'left'];
    const U = o.u || pl[0], V = o.v || pl[1], w = o.w ?? 20, h = o.h ?? 20;
    const pt = (u, v) => [at[0] + U[0] * u + V[0] * v, at[1] + U[1] * u + V[1] * v, at[2] + U[2] * u + V[2] * v];
    return [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)];
  }
  lbox() { const b = box3.empty(); for (const p of this.corners()) box3.addPt(b, p[0], p[1], p[2]); return b; }
  aabb(frame) { const b = box3.empty(); for (const p of this.corners()) { const w = applyFrame(frame, p[0], p[1], p[2]); box3.addPt(b, w[0], w[1], w[2]); } return b; }
  draw(d) {
    const o = this.opts, at = o.at || [0, 0, 0], { U, V } = this.basis(d.frame);
    const f = new Face(d, d.w(at[0], at[1], at[2]), U, V, o.w ?? 20, o.h ?? 20);
    if (o.fill !== false || o.line !== false) {
      f.rect(0, 0, f.w, f.h, { r: o.r || 0, fill: o.fill === undefined ? 'f-glass' : o.fill, line: o.line === undefined ? 'ln' : o.line });
    }
    if (typeof o.draw === 'function') o.draw(f, this);
  }
}

/* Lines on the floor. */
export class Grid extends Node {
  get kind() { return 'grid'; }
  lbox() { const o = this.opts, [x, y, z] = o.at || [0, 0, 0], [w, dd] = o.size || [100, 100]; return [x, y, z, x + w, y + dd, z]; }
  draw(d) {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], [w, dd] = o.size || [100, 100], st = o.step || 10;
    const cls = o.line || 'ln-faint';
    for (let i = 0; i <= w + 1e-6; i += st) d.line(d.dl([[x + i, y, z], [x + i, y + dd, z]]), cls);
    for (let j = 0; j <= dd + 1e-6; j += st) d.line(d.dl([[x, y + j, z], [x + w, y + j, z]]), cls);
  }
}

/* Escape hatch: draw anything with the Draw context. fn(d, node) */
export class Custom extends Node {
  get kind() { return 'custom'; }
  lbox() { return this.opts.bounds || null; }
  draw(d) { if (this.opts.draw) this.opts.draw(d, this); }
}
