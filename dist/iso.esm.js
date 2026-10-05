/*! Iso 0.1.0 — isometric illustration engine · MIT */
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// engine/src/math.js
var math_exports = {};
__export(math_exports, {
  DEG: () => DEG,
  EPS: () => EPS,
  box3: () => box3,
  circlePts: () => circlePts,
  clamp: () => clamp,
  fmt: () => fmt,
  insetConvex: () => insetConvex,
  isConvex: () => isConvex,
  lerp: () => lerp,
  makeView: () => makeView,
  regularPolygon: () => regularPolygon,
  rng: () => rng,
  rotatePts: () => rotatePts,
  rrect: () => rrect,
  signedArea: () => signedArea,
  v3: () => v3
});
var DEG = Math.PI / 180;
var EPS = 1e-6;
var clamp = (v, a, b) => v < a ? a : v > b ? b : v;
var lerp = (a, b, t) => a + (b - a) * t;
var fmt = (n) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? "0" : String(v);
};
function makeView(angle = 30) {
  const C = Math.cos(angle * DEG);
  const S = Math.sin(angle * DEG);
  const P = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z];
  const ZS = 1 / (2 * S);
  return { angle, C, S, ZS, P };
}
function rrect(x, y, w, h, r = 0, n) {
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  let pts, kinds;
  if (r < 1e-3) {
    pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    kinds = ["c", "c", "c", "c"];
  } else {
    n = n || clamp(Math.round(r / 1.6), 3, 12);
    pts = [];
    kinds = [];
    const cs = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]];
    for (const [cx, cy, a0] of cs) {
      for (let i = 0; i <= n; i++) {
        const a = (a0 + 90 * i / n) * DEG;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        kinds.push(i === 0 || i === n ? "t" : "s");
      }
    }
  }
  return dedupe(pts, kinds);
}
function circlePts(cx, cy, r, n = 32, a0 = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (a0 + 360 * i / n) * DEG;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  pts.kinds = pts.map(() => "s");
  return pts;
}
function regularPolygon(cx, cy, r, sides, a0 = -90) {
  const p = circlePts(cx, cy, r, sides, a0);
  p.kinds = p.map(() => "c");
  return p;
}
function dedupe(pts, kinds) {
  const out = [], ok = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = out[out.length - 1];
    if (b && Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) {
      if (kinds[i] === "c") ok[ok.length - 1] = "c";
      continue;
    }
    out.push(a);
    ok.push(kinds[i]);
  }
  const f = out[0], l = out[out.length - 1];
  if (out.length > 1 && Math.abs(f[0] - l[0]) < 1e-6 && Math.abs(f[1] - l[1]) < 1e-6) {
    out.pop();
    ok.pop();
  }
  out.kinds = ok;
  return out;
}
function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}
function isConvex(poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = poly[(i + 2) % poly.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) < 1e-9) continue;
    const s = Math.sign(cr);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}
function insetConvex(poly, d) {
  const n = poly.length, ccw = signedArea(poly) > 0, lines = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L;
    dy /= L;
    const nx = ccw ? -dy : dy, ny = ccw ? dx : -dx;
    lines.push([a[0] + nx * d, a[1] + ny * d, dx, dy]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i + n - 1) % n], l2 = lines[i];
    const den = l1[2] * l2[3] - l1[3] * l2[2];
    if (Math.abs(den) < 1e-9) {
      out.push([l2[0], l2[1]]);
      continue;
    }
    const t = ((l2[0] - l1[0]) * l2[3] - (l2[1] - l1[1]) * l2[2]) / den;
    out.push([l1[0] + l1[2] * t, l1[1] + l1[3] * t]);
  }
  out.kinds = poly.kinds ? poly.kinds.slice() : out.map(() => "c");
  return out;
}
function rotatePts(pts, cx, cy, deg) {
  if (!deg) return pts;
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  const out = pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
  out.kinds = pts.kinds;
  return out;
}
var v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => {
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / l, a[1] / l, a[2] / l];
  },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
};
function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  next.range = (a0, b0) => a0 + (b0 - a0) * next();
  next.int = (a0, b0) => Math.floor(a0 + (b0 - a0 + 1) * next());
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}
var box3 = {
  empty: () => [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity],
  addPt(b, x, y, z) {
    if (x < b[0]) b[0] = x;
    if (y < b[1]) b[1] = y;
    if (z < b[2]) b[2] = z;
    if (x > b[3]) b[3] = x;
    if (y > b[4]) b[4] = y;
    if (z > b[5]) b[5] = z;
    return b;
  },
  union(a, b) {
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5])];
  },
  shift: (b, x, y, z) => [b[0] + x, b[1] + y, b[2] + z, b[3] + x, b[4] + y, b[5] + z],
  valid: (b) => b[0] <= b[3] && b[1] <= b[4] && b[2] <= b[5]
};

// engine/src/draw.js
var IDENTITY = Object.freeze({ x: 0, y: 0, z: 0, rot: 0, c: 1, s: 0 });
function makeFrame(x = 0, y = 0, z = 0, rot = 0) {
  return { x, y, z, rot, c: Math.cos(rot * DEG), s: Math.sin(rot * DEG) };
}
function compose(p, l) {
  if (!l || l === IDENTITY) return p;
  const x = p.x + l.x * p.c - l.y * p.s;
  const y = p.y + l.x * p.s + l.y * p.c;
  return makeFrame(x, y, p.z + l.z, p.rot + l.rot);
}
function applyFrame(f, x, y, z = 0) {
  if (!f.rot) return [x + f.x, y + f.y, z + f.z];
  return [f.x + x * f.c - y * f.s, f.y + x * f.s + y * f.c, z + f.z];
}
function frameVec(f, v) {
  if (!f.rot) return v;
  return [v[0] * f.c - v[1] * f.s, v[0] * f.s + v[1] * f.c, v[2]];
}
var Draw = class {
  constructor(view, frame = IDENTITY) {
    this.view = view;
    this.frame = frame;
    this.ops = [];
    this.b = [Infinity, Infinity, -Infinity, -Infinity];
  }
  /* local → world */
  w(x, y, z = 0) {
    return applyFrame(this.frame, x, y, z);
  }
  /* world → screen (tracks bounds) */
  P(x, y, z = 0) {
    const q = this.view.P(x, y, z), b = this.b;
    if (q[0] < b[0]) b[0] = q[0];
    if (q[1] < b[1]) b[1] = q[1];
    if (q[0] > b[2]) b[2] = q[0];
    if (q[1] > b[3]) b[3] = q[1];
    return q;
  }
  /* local → screen */
  p(x, y, z = 0) {
    const w = this.w(x, y, z);
    return this.P(w[0], w[1], w[2]);
  }
  /* screen points → path data */
  d(pts, close) {
    let s = "";
    for (let i = 0; i < pts.length; i++) s += (i ? "L" : "M") + fmt(pts[i][0]) + " " + fmt(pts[i][1]);
    return close ? s + "Z" : s;
  }
  /* world points → path data */
  dw(pts, close) {
    return this.d(pts.map((p) => this.P(p[0], p[1], p[2] || 0)), close);
  }
  /* local points → path data */
  dl(pts, close) {
    return this.d(pts.map((p) => this.p(p[0], p[1], p[2] || 0)), close);
  }
  fill(d, cls, extra) {
    if (d) this.ops.push({ k: "f", d, cls, extra });
    return this;
  }
  line(d, cls = "ln", extra) {
    if (d) this.ops.push({ k: "l", d, cls, extra });
    return this;
  }
  both(d, fillCls, lineCls = "ln", extra) {
    this.fill(d, fillCls, extra);
    this.line(d, lineCls);
    return this;
  }
  raw(markup) {
    if (markup) this.ops.push({ k: "r", s: markup });
    return this;
  }
  /* Horizontal circle (world centre) → ellipse in screen, axis aligned.
     Angle t is measured in plan from +x towards +y (clockwise on screen). */
  hpt(cx, cy, z, r, t) {
    return this.P(cx + r * Math.cos(t * DEG), cy + r * Math.sin(t * DEG), z);
  }
  /* Arc commands from angle t0 to t1 (t1 > t0 draws clockwise on screen). Current point must be at t0. */
  harc(cx, cy, z, r, t0, t1) {
    const { C, S } = this.view;
    const rx = r * Math.SQRT2 * C, ry = r * Math.SQRT2 * S;
    if (r < 1e-6) return "";
    let s = "", span = t1 - t0;
    const steps = Math.max(1, Math.ceil(Math.abs(span) / 170));
    for (let i = 1; i <= steps; i++) {
      const t = t0 + span * i / steps;
      const q = this.hpt(cx, cy, z, r, t);
      s += "A" + fmt(rx) + " " + fmt(ry) + " 0 0 " + (span > 0 ? 1 : 0) + " " + fmt(q[0]) + " " + fmt(q[1]);
    }
    for (let a = Math.ceil((Math.min(t0, t1) + 45) / 90) * 90 - 45; a <= Math.max(t0, t1); a += 90) this.hpt(cx, cy, z, r, a);
    return s;
  }
  /* Full horizontal ellipse path. */
  hcircle(cx, cy, z, r) {
    const a = this.hpt(cx, cy, z, r, -45);
    return "M" + fmt(a[0]) + " " + fmt(a[1]) + this.harc(cx, cy, z, r, -45, 315) + "Z";
  }
  /* SVG matrix mapping 2D content (u →, v ↓, world units) onto a world plane through o spanned by unit vectors u, v. */
  planeMatrix(o, u, v) {
    const { C, S } = this.view;
    const pu = [(u[0] - u[1]) * C, (u[0] + u[1]) * S - u[2]];
    const pv = [(v[0] - v[1]) * C, (v[0] + v[1]) * S - v[2]];
    const po = this.P(o[0], o[1], o[2]);
    return "matrix(" + [pu[0], pu[1], pv[0], pv[1], po[0], po[1]].map(fmt).join(" ") + ")";
  }
  toString() {
    let s = "", i = 0;
    const ops = this.ops;
    while (i < ops.length) {
      const o = ops[i];
      if (o.k === "r") {
        s += o.s;
        i++;
        continue;
      }
      if (o.k === "f") {
        s += '<path class="' + o.cls + '" d="' + o.d + '"' + (o.extra || "") + "/>";
        i++;
        continue;
      }
      let d = o.d, j = i + 1;
      while (j < ops.length && ops[j].k === "l" && ops[j].cls === o.cls && ops[j].extra === o.extra) d += ops[j++].d;
      s += '<path class="' + o.cls + '" d="' + d + '"' + (o.extra || "") + "/>";
      i = j;
    }
    return s;
  }
};

// engine/src/sort.js
var E = 1e-3;
function hexOf(b, zs) {
  return [b[0] - b[4], b[3] - b[1], b[0] - b[5] * zs, b[3] - b[2] * zs, b[1] - b[5] * zs, b[4] - b[2] * zs];
}
function hexOverlap(h1, h2) {
  return h1[0] < h2[1] - E && h2[0] < h1[1] - E && h1[2] < h2[3] - E && h2[2] < h1[3] - E && h1[4] < h2[5] - E && h2[4] < h1[5] - E;
}
function behind(a, b) {
  return a[3] <= b[0] + E || a[4] <= b[1] + E || a[5] <= b[2] + E;
}
function compareItems(a, b) {
  if (a.layer !== b.layer) return a.layer < b.layer ? -1 : 1;
  const ab = behind(a.box, b.box), ba = behind(b.box, a.box);
  if (ab && !ba) return -1;
  if (ba && !ab) return 1;
  if (ab && ba) {
    return a.order <= b.order ? -1 : 1;
  }
  const A = a.box, B = b.box;
  let best = Infinity, res = 0;
  for (let k = 0; k < 3; k++) {
    const p1 = A[k + 3] - B[k], p2 = B[k + 3] - A[k];
    const p = Math.min(p1, p2);
    if (p < best - E) {
      best = p;
      res = p1 < p2 ? -1 : p2 < p1 ? 1 : 0;
    }
  }
  if (res) return res;
  if (Math.abs(a.key - b.key) > E) return a.key < b.key ? -1 : 1;
  return a.order <= b.order ? -1 : 1;
}
function makeItem(node, box, zs, order) {
  const key = box ? (box[0] + box[3]) / 2 + (box[1] + box[4]) / 2 + (box[2] + box[5]) / 2 * zs : 0;
  return { node, box, hex: box ? hexOf(box, zs) : null, layer: node.layer || 0, order, key };
}
function depthSort(items) {
  const n = items.length;
  if (n < 2) return items.slice();
  const succ = Array.from({ length: n }, () => []);
  const indeg = new Int32Array(n);
  const idx = [];
  for (let i = 0; i < n; i++) if (items[i].hex) idx.push(i);
  idx.sort((p, q) => items[p].hex[0] - items[q].hex[0]);
  for (let a = 0; a < idx.length; a++) {
    const i = idx[a], hi = items[i].hex;
    for (let b = a + 1; b < idx.length; b++) {
      const j = idx[b], hj = items[j].hex;
      if (hj[0] >= hi[1] - E) break;
      if (!hexOverlap(hi, hj)) continue;
      const c = compareItems(items[i], items[j]);
      if (c < 0) {
        succ[i].push(j);
        indeg[j]++;
      } else if (c > 0) {
        succ[j].push(i);
        indeg[i]++;
      }
    }
  }
  const pri = (i) => items[i];
  const less = (p, q) => {
    const A = pri(p), B = pri(q);
    if (A.layer !== B.layer) return A.layer < B.layer;
    if (Math.abs(A.key - B.key) > E) return A.key < B.key;
    return A.order < B.order;
  };
  const heap = [];
  const push = (i) => {
    heap.push(i);
    let k = heap.length - 1;
    while (k) {
      const p = k - 1 >> 1;
      if (less(heap[k], heap[p])) {
        [heap[k], heap[p]] = [heap[p], heap[k]];
        k = p;
      } else break;
    }
  };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (; ; ) {
        const l = 2 * k + 1, r = l + 1;
        let m = k;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === k) break;
        [heap[k], heap[m]] = [heap[m], heap[k]];
        k = m;
      }
    }
    return top;
  };
  for (let i = 0; i < n; i++) if (!indeg[i]) push(i);
  const out = [], done = new Uint8Array(n);
  while (out.length < n) {
    if (!heap.length) {
      let best = -1;
      for (let i2 = 0; i2 < n; i2++) if (!done[i2] && (best < 0 || less(i2, best))) best = i2;
      indeg[best] = 0;
      push(best);
    }
    const i = pop();
    if (done[i]) continue;
    done[i] = 1;
    out.push(items[i]);
    for (const j of succ[i]) if (!done[j] && --indeg[j] === 0) push(j);
  }
  return out;
}
var Placer = class {
  constructor(statics, cell = 96) {
    this.statics = statics;
    this.cell = cell;
    this.grid = /* @__PURE__ */ new Map();
    statics.forEach((it, i) => {
      it.index = i;
      if (!it.hex) return;
      this._cells(it.hex, (k) => {
        let a = this.grid.get(k);
        if (!a) this.grid.set(k, a = []);
        a.push(it);
      });
    });
  }
  _cells(h, fn) {
    const c = this.cell;
    const h0 = Math.floor(h[0] / c), h1 = Math.floor(h[1] / c), u0 = Math.floor(h[2] / c), u1 = Math.floor(h[3] / c);
    for (let i = h0; i <= h1; i++) for (let j = u0; j <= u1; j++) fn(i + "," + j);
  }
  slot(d) {
    let lo = -1, hi = this.statics.length;
    if (!d.hex) return lo;
    const seen = /* @__PURE__ */ new Set();
    this._cells(d.hex, (k) => {
      const a = this.grid.get(k);
      if (!a) return;
      for (const s of a) {
        if (seen.has(s)) continue;
        seen.add(s);
        if (!hexOverlap(s.hex, d.hex)) continue;
        const c = compareItems(s, d);
        if (c < 0) {
          if (s.index > lo) lo = s.index;
        } else if (c > 0) {
          if (s.index < hi) hi = s.index;
        }
      }
    });
    return lo;
  }
};

// engine/src/node.js
var UID = 0;
var TRANSFORM_KEYS = ["x", "y", "z", "scale", "opacity"];
var Node = class {
  constructor(opts = {}) {
    this.uid = ++UID;
    this.opts = { ...opts };
    this.id = opts.id || null;
    this.parent = null;
    this.t = { x: 0, y: 0, z: 0, scale: 1, opacity: 1 };
    this.a = { x: 0, y: 0, z: 0, scale: 1, opacity: 1 };
    this.el = null;
    this.handlers = null;
    this.layer = opts.layer || 0;
    this.order = 0;
    this.dirty = true;
    this.moved = true;
    this.frame = IDENTITY;
    this.rest = null;
    this.sb = null;
    this.hidden = !!opts.hidden;
  }
  get kind() {
    return "node";
  }
  get scene() {
    let n = this;
    while (n.parent) n = n.parent;
    return n._scene || null;
  }
  get isGroup() {
    return false;
  }
  /* ── geometry (override) ── */
  draw(_d) {
  }
  /* local AABB before the frame; override */
  lbox() {
    return null;
  }
  /* world AABB at rest for a frame */
  aabb(frame) {
    const b = this.lbox();
    if (!b) return null;
    if (!frame.rot) return box3.shift(b, frame.x, frame.y, frame.z);
    const out = box3.empty();
    for (const x of [b[0], b[3]]) for (const y of [b[1], b[4]]) {
      const w = applyFrame(frame, x, y, 0);
      box3.addPt(out, w[0], w[1], b[2] + frame.z);
      box3.addPt(out, w[0], w[1], b[5] + frame.z);
    }
    return out;
  }
  /* ── state ── */
  get(key) {
    if (TRANSFORM_KEYS.includes(key)) return this.t[key];
    const v = this.opts[key];
    return v;
  }
  set(key, value) {
    if (typeof key === "object") {
      for (const k in key) this.set(k, key[k]);
      return this;
    }
    if (TRANSFORM_KEYS.includes(key)) {
      if (this.t[key] !== value) {
        this.t[key] = value;
        this.moved = true;
        this._wake();
      }
    } else if (this.opts[key] !== value) {
      this.opts[key] = value;
      if (key === "material" || key === "class" || key === "color" || key === "style" || key === "pressed" || key === "label" || key === "interactive" || key === "glow") this.restyle = true;
      else this.dirty = true;
      if (key === "hidden") {
        this.hidden = !!value;
        this.restyle = true;
      }
      this._wake();
    }
    return this;
  }
  /* Total offset relative to the nearest atomic container (includes flat ancestors). */
  offset() {
    let x = this.t.x + this.a.x, y = this.t.y + this.a.y, z = this.t.z + this.a.z;
    let p = this.parent;
    while (p && p.flat) {
      x += p.t.x + p.a.x;
      y += p.t.y + p.a.y;
      z += p.t.z + p.a.z;
      p = p.parent;
    }
    return [x, y, z];
  }
  opacity() {
    let o = this.t.opacity * this.a.opacity, p = this.parent;
    while (p && p.flat) {
      o *= p.t.opacity * p.a.opacity;
      p = p.parent;
    }
    return o;
  }
  /* AABB used for depth sorting within the container. */
  sortBox() {
    if (!this.rest) return null;
    const o = this.offset();
    return box3.shift(this.rest, o[0], o[1], o[2]);
  }
  _wake() {
    const s = this.scene;
    if (s) s._touch(this);
  }
  /* ── animation sugar (delegates to the scene) ── */
  to(props, opts) {
    return this.scene.to(this, props, opts);
  }
  on(evt, fn) {
    (this.handlers || (this.handlers = {}))[evt] = (this.handlers[evt] || []).concat(fn);
    this.restyle = true;
    this._wake();
    return this;
  }
  emit(evt, e) {
    const hs = this.handlers && this.handlers[evt];
    if (hs) hs.forEach((h) => h.call(this, e, this));
  }
  remove() {
    if (this.parent) this.parent.removeChild(this);
  }
  /* ── rendering ── */
  classes() {
    const o = this.opts, c = ["iso-n"];
    if (o.material) c.push("m-" + o.material);
    if (o.color) c.push("m-tint");
    if (o.class) c.push(o.class);
    if (o.glow) c.push("glow");
    if (this.interactive()) c.push("hit");
    return c.join(" ");
  }
  interactive() {
    return !!(this.handlers && (this.handlers.click || this.handlers.press)) || !!this.opts.interactive;
  }
  styleAttr() {
    const o = this.opts, s = [];
    if (o.color) s.push("--iso-tint:" + o.color);
    if (o.style) for (const k in o.style) s.push(k + ":" + o.style[k]);
    const op = this.opacity();
    if (op !== 1) s.push("opacity:" + fmt(op));
    if (this.hidden) s.push("display:none");
    return s.length ? ' style="' + s.join(";") + '"' : "";
  }
  transformAttr(view) {
    const [x, y, z] = this.offset();
    const sc = this.t.scale * this.a.scale;
    let tr = "";
    if (x || y || z) {
      const q = view.P(x, y, z);
      tr = "translate(" + fmt(q[0]) + " " + fmt(q[1]) + ")";
    }
    if (sc !== 1 && this.rest) {
      const b = this.rest, an = this.opts.anchor || "bottom";
      const ax = (b[0] + b[3]) / 2, ay = (b[1] + b[4]) / 2;
      const az = an === "center" ? (b[2] + b[5]) / 2 : an === "top" ? b[5] : b[2];
      const q = view.P(ax, ay, az);
      tr += " translate(" + fmt(q[0]) + " " + fmt(q[1]) + ") scale(" + fmt(sc) + ") translate(" + fmt(-q[0]) + " " + fmt(-q[1]) + ")";
    }
    return tr;
  }
  attrs(view) {
    let s = ' class="' + this.classes() + '" data-uid="' + this.uid + '"';
    if (this.id) s += ' data-id="' + esc(this.id) + '"';
    const tr = this.transformAttr(view);
    if (tr) s += ' transform="' + tr + '"';
    s += this.styleAttr();
    if (this.interactive()) {
      const o = this.opts;
      s += ' tabindex="0" role="' + (o.role || "button") + '"';
      if (o.label) s += ' aria-label="' + esc(o.label) + '"';
      if (o.pressed !== void 0) s += ' aria-pressed="' + !!o.pressed + '"';
    }
    return s;
  }
  /* Draw this node's content in `frame`; updates rest/sb. */
  content(view, frame) {
    this.frame = frame;
    const d = new Draw(view, frame);
    if (!this.hidden || true) this.draw(d);
    this.rest = this.aabb(frame);
    this.sb = d.b;
    let s = d.toString();
    if (this.interactive()) s += focusRing(view, this.rest);
    this.dirty = false;
    return s;
  }
  markup(view, frame) {
    const c = this.content(view, frame);
    this.moved = false;
    this.restyle = false;
    return "<g" + this.attrs(view) + ">" + c + "</g>";
  }
  /* Apply transform/style changes to the live element. */
  sync(view) {
    if (!this.el) return;
    const tr = this.transformAttr(view);
    if (tr) this.el.setAttribute("transform", tr);
    else this.el.removeAttribute("transform");
    const op = this.opacity();
    this.el.style.opacity = op === 1 ? "" : fmt(op);
    if (this.restyle) {
      this.el.setAttribute("class", this.classes());
      this.el.style.display = this.hidden ? "none" : "";
      if (this.opts.color) this.el.style.setProperty("--iso-tint", this.opts.color);
      if (this.opts.style) for (const k in this.opts.style) this.el.style.setProperty(k, this.opts.style[k]);
      if (this.opts.pressed !== void 0) this.el.setAttribute("aria-pressed", !!this.opts.pressed);
      if (this.opts.label) this.el.setAttribute("aria-label", this.opts.label);
      if (this.interactive() && !this.el.hasAttribute("tabindex")) {
        this.el.setAttribute("tabindex", "0");
        this.el.setAttribute("role", this.opts.role || "button");
      }
      this.restyle = false;
    }
  }
};
var Group = class extends Node {
  constructor(opts = {}) {
    super(opts);
    this.children = [];
    this.flat = !!opts.flat;
    this.sortMode = opts.sort || "auto";
    this._seq = 0;
  }
  get kind() {
    return "group";
  }
  get isGroup() {
    return true;
  }
  childFrame(frame) {
    const o = this.opts, at = o.at || [0, 0, 0];
    if (!at[0] && !at[1] && !at[2] && !o.rot) return frame;
    return compose(frame, makeFrame(at[0] || 0, at[1] || 0, at[2] || 0, o.rot || 0));
  }
  add(child) {
    if (Array.isArray(child)) {
      child.forEach((c) => this.add(c));
      return child;
    }
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    child.order = this._seq++;
    this.children.push(child);
    const s = this.scene;
    if (s) {
      s._register(child);
      s._structure();
    }
    return child;
  }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parent = null;
    const s = this.scene;
    if (s) {
      s._unregister(child);
      s._structure();
    }
  }
  clear() {
    this.children.slice().forEach((c) => this.removeChild(c));
  }
  /* all descendants, depth first */
  each(fn) {
    for (const c of this.children) {
      fn(c);
      if (c.isGroup) c.each(fn);
    }
  }
  find(pred) {
    let r = null;
    this.each((c) => {
      if (!r && pred(c)) r = c;
    });
    return r;
  }
  findAll(pred) {
    const r = [];
    this.each((c) => {
      if (pred(c)) r.push(c);
    });
    return r;
  }
  get(key) {
    return key in this.t ? this.t[key] : this.opts[key];
  }
  /* Items that sort in this container: children, with flat groups expanded. */
  items() {
    const out = [];
    const walk = (g) => {
      for (const c of g.children) {
        if (c.isGroup && c.flat) walk(c);
        else out.push(c);
      }
    };
    walk(this);
    return out;
  }
  aabb() {
    let b = null;
    for (const c of this.items()) {
      if (c.hidden) continue;
      const cb = c.sortBox();
      if (cb) b = b ? box3.union(b, cb) : cb;
    }
    return b;
  }
  /* Render children (flat groups expanded, each in its own frame), order them, concatenate. */
  content(view, frame) {
    this.frame = frame;
    const parts = [];
    const walk = (g, f) => {
      const cf = g.childFrame(f);
      if (g !== this) g.frame = f;
      for (const c of g.children) {
        if (c.isGroup && c.flat) walk(c, cf);
        else parts.push({ node: c, s: c.markup(view, cf) });
      }
      if (g !== this) {
        g.rest = g.aabb();
        g.dirty = false;
        g.moved = false;
      }
    };
    walk(this, frame);
    const zs = view.ZS;
    let ordered;
    if (this.sortMode === "none") ordered = parts.map((p, i) => ({ ...makeItem(p.node, p.node.sortBox(), zs, i), s: p.s }));
    else ordered = depthSort(parts.map((p, i) => ({ ...makeItem(p.node, p.node.sortBox(), zs, i), s: p.s })));
    this.sorted = ordered.map((it) => it.node);
    this.rest = this.aabb();
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const it of ordered) {
      const n = it.node, sb = n.sb;
      if (!sb || !isFinite(sb[0])) continue;
      const o = n.offset(), q = view.P(o[0], o[1], o[2]);
      b[0] = Math.min(b[0], sb[0] + q[0]);
      b[1] = Math.min(b[1], sb[1] + q[1]);
      b[2] = Math.max(b[2], sb[2] + q[0]);
      b[3] = Math.max(b[3], sb[3] + q[1]);
    }
    this.sb = b;
    this.dirty = false;
    let s = ordered.map((it) => it.s).join("");
    if (this.interactive()) s += focusRing(view, this.rest);
    return s;
  }
};
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
function focusRing(view, b) {
  if (!b) return "";
  const m = 3;
  const [x0, y0, z0, x1, y1, z1] = [b[0] - m, b[1] - m, b[2] - 1, b[3] + m, b[4] + m, b[5] + m];
  const pts = [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]].map((p) => view.P(p[0], p[1], p[2]));
  return '<path class="focus-ring" d="M' + pts.map((p) => fmt(p[0]) + " " + fmt(p[1])).join("L") + 'Z"/>';
}

// engine/src/shapes.js
var Face = class _Face {
  constructor(d, o, U, V, w, h) {
    this.d = d;
    this.o = o;
    this.U = U;
    this.V = V;
    this.w = w;
    this.h = h;
  }
  /* a face given in the node's local coordinates (applies the draw frame) */
  static local(d, o, U, V, w, h) {
    return new _Face(d, d.w(o[0], o[1], o[2]), frameVec(d.frame, v3.norm(U)), frameVec(d.frame, v3.norm(V)), w, h);
  }
  pt(u, v) {
    const o = this.o, U = this.U, V = this.V;
    return [o[0] + U[0] * u + V[0] * v, o[1] + U[1] * u + V[1] * v, o[2] + U[2] * u + V[2] * v];
  }
  _shape(pts, close, opt = {}) {
    const d = this.d, path2 = d.dw(pts.map((p) => this.pt(p[0], p[1])), close);
    const fill = opt.fill, line = opt.line === void 0 ? "ln-soft" : opt.line;
    if (fill) d.fill(path2, fill);
    if (line) d.line(path2, line, opt.dash ? ' stroke-dasharray="' + opt.dash + '"' : void 0);
    return this;
  }
  rect(u, v, w, h, opt = {}) {
    return this._shape(rrect(u, v, w, h, opt.r || 0), true, opt);
  }
  poly(pts, opt = {}) {
    return this._shape(pts, opt.close !== false, opt);
  }
  line(u1, v1, u2, v2, cls = "ln-soft") {
    this.d.line(this.d.dw([this.pt(u1, v1), this.pt(u2, v2)]), cls);
    return this;
  }
  circle(u, v, r, opt = {}) {
    return this._shape(circlePts(u, v, r, opt.n || Math.max(12, Math.round(r * 3))), true, opt);
  }
  /* evenly spaced lines: vents, slits */
  hlines(u, v, w, h, n, cls = "ln-soft") {
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? v : v + h * i / (n - 1);
      this.line(u, y, u + w, y, cls);
    }
    return this;
  }
  vlines(u, v, w, h, n, cls = "ln-soft") {
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? u : u + w * i / (n - 1);
      this.line(x, v, x, v + h, cls);
    }
    return this;
  }
  /* a grid of cells (windows, keys, panels); fn(i, j) may return per-cell options or false */
  grid(u, v, w, h, cols, rows, opt = {}) {
    const gap = opt.gap ?? 2, cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let o = opt;
      if (opt.each) {
        const r = opt.each(i, j);
        if (r === false) continue;
        if (r) o = { ...opt, ...r };
      }
      this.rect(u + i * (cw + gap), v + j * (ch + gap), cw, ch, o);
    }
    return this;
  }
  /* SVG text laid on the face */
  text(str, u, v, opt = {}) {
    const size = opt.size || 8, anchor = opt.anchor || "start";
    const m = this.d.planeMatrix(this.pt(u, v), this.U, this.V);
    const ls = opt.spacing !== void 0 ? ' letter-spacing="' + opt.spacing + '"' : "";
    const w = opt.weight ? ' font-weight="' + opt.weight + '"' : "";
    this.d.raw('<text class="' + (opt.cls || "tx") + '" transform="' + m + '" font-size="' + fmt(size) + '" text-anchor="' + anchor + '"' + ls + w + (opt.attrs || "") + ">" + escText(str) + "</text>");
    return this;
  }
  /* raw SVG content in face units, optional extra transform (e.g. 'translate(4 4) scale(2)') */
  svg(markup, opt = {}) {
    const m = this.d.planeMatrix(this.pt(opt.u || 0, opt.v || 0), this.U, this.V);
    this.d.raw('<g transform="' + m + (opt.transform ? " " + opt.transform : "") + '"' + (opt.cls ? ' class="' + opt.cls + '"' : "") + ">" + markup + "</g>");
    return this;
  }
  /* sub-face offset by (u, v) */
  sub(u, v, w, h) {
    return new _Face(this.d, this.pt(u, v), this.U, this.V, w ?? this.w - u, h ?? this.h - v);
  }
  /* matrix string for custom content */
  matrix(u = 0, v = 0) {
    return this.d.planeMatrix(this.pt(u, v), this.U, this.V);
  }
};
function escText(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}
var TONES = { top: "f-top", left: "f-left", right: "f-right", bevel: "f-bevel" };
var tones = (o) => o.tone ? { ...TONES, ...o.tone } : TONES;
var VIEW_N = (S) => [1, 1, 2 * S];
var Prism = class extends Node {
  get kind() {
    return "prism";
  }
  /* local plan polygon (with kinds), base z, height, chamfer */
  plan() {
    const o = this.opts, at = o.at || [0, 0, 0];
    const pts = (o.points || []).map((p) => [p[0] + at[0], p[1] + at[1]]);
    pts.kinds = o.kinds || pts.map(() => "c");
    return { poly: pts, z: (o.z ?? at[2]) || 0, h: o.h ?? 10, c: o.chamfer || 0 };
  }
  lbox() {
    const { poly, z, h } = this.plan();
    const b = box3.empty();
    for (const p of poly) {
      box3.addPt(b, p[0], p[1], z);
      box3.addPt(b, p[0], p[1], z + h);
    }
    return b;
  }
  aabb(frame) {
    if (!frame.rot) return super.aabb(frame);
    const { poly, z, h } = this.plan(), b = box3.empty();
    for (const p of poly) {
      const w = applyFrame(frame, p[0], p[1], z);
      box3.addPt(b, w[0], w[1], w[2]);
      box3.addPt(b, w[0], w[1], w[2] + h);
    }
    return b;
  }
  /* inner top outline for the chamfer (world plan). Box overrides with a rounded inset. */
  insetPlan(W, c) {
    return insetConvex(W, c);
  }
  draw(d) {
    const { poly, z, h, c: c0 } = this.plan();
    if (poly.length < 3) return;
    const T = tones(this.opts);
    const W = poly.map((p) => {
      const w = d.w(p[0], p[1], z);
      return [w[0], w[1]];
    });
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
        for (let i = 0; i < N; i++) if (edges[i].visible && !edges[(i + N - 1) % N].visible) {
          start = i;
          break;
        }
        if (start >= 0) {
          const run = [];
          for (let j = 0; j < N; j++) {
            const e = edges[(start + j) % N];
            if (e.visible) run.push(e);
            else break;
          }
          const groups = [];
          let cur = null;
          for (const e of run) {
            if (!cur || cur.right !== e.right) groups.push(cur = { right: e.right, edges: [] });
            cur.edges.push(e.i);
          }
          for (const g of groups) {
            const idx = g.edges.concat([(g.edges[g.edges.length - 1] + 1) % N]);
            const top = idx.map((q) => P(q, Zs)), bot = idx.map((q) => P(q, Z0)).reverse();
            d.fill(d.d(top.concat(bot), true), g.right ? T.right : T.left);
          }
          const chain = run.map((e) => e.i);
          chain.push((chain[chain.length - 1] + 1) % N);
          d.line(d.d(chain.map((q) => P(q, Z0))), "ln");
          chain.forEach((q, ci) => {
            const end = ci === 0 || ci === chain.length - 1, k = kinds[q];
            if (end || k === "c") d.line(d.d([P(q, Z0), P(q, Zs)]), "ln");
            else if (k === "t") d.line(d.d([P(q, Z0), P(q, Zs)]), "ln-soft");
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
          d.line(d.d([P(i, Z0), P(j, Z0)]), "ln");
          const prevVis = edges[(i + N - 1) % N].visible, nextVis = edges[j].visible;
          if (!prevVis || kinds[i] === "c") d.line(d.d([P(i, Z0), P(i, Z1)]), "ln");
          if (!nextVis || kinds[j] === "c") d.line(d.d([P(j, Z0), P(j, Z1)]), "ln");
        }
      }
    }
    let topPoly = W;
    if (c > EPS) {
      const inner = this.insetPlan(W, c);
      const outerD = d.d(W.map((p) => d.P(p[0], p[1], Zs)), true);
      const innerD = d.d(inner.map((p) => d.P(p[0], p[1], Z1)), true);
      d.fill(outerD + innerD, T.bevel, ' fill-rule="evenodd"');
      d.line(outerD, "ln");
      topPoly = inner;
    }
    if (this.opts.top !== false) d.both(d.d(topPoly.map((p) => d.P(p[0], p[1], Z1)), true), T.top, "ln");
    this.drawFaces(d);
  }
  drawFaces(_d) {
  }
};
var Box = class extends Prism {
  get kind() {
    return "box";
  }
  dims() {
    const o = this.opts, s = o.size || [o.w ?? 20, o.d ?? 20, o.h ?? 20];
    let [x, y, z] = o.at || [0, 0, 0];
    if (o.center) {
      x = o.center[0] - s[0] / 2;
      y = o.center[1] - s[1] / 2;
      z = o.center[2] || 0;
    }
    if (o.z !== void 0) z = o.z;
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
    return inner.map((p) => {
      const q = applyFrame(f, p[0], p[1], 0);
      return [q[0], q[1]];
    });
  }
  /* face drawers in world space; available to callers via box.face(d, 'left') */
  face(d, which) {
    const { x, y, z, w, dd, h } = this.dims(), f = this.frame, o = this.opts;
    const rot = o.rot || 0;
    const L = (px, py, pz) => {
      let X = px, Y = py;
      if (rot) {
        const cx = x + w / 2, cy = y + dd / 2, c = Math.cos(rot * DEG), s = Math.sin(rot * DEG);
        X = cx + (px - cx) * c - (py - cy) * s;
        Y = cy + (px - cx) * s + (py - cy) * c;
      }
      return applyFrame(f, X, Y, pz);
    };
    const R = (v) => {
      let r = v;
      if (rot) {
        const c = Math.cos(rot * DEG), s = Math.sin(rot * DEG);
        r = [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]];
      }
      return frameVec(f, r);
    };
    const top = z + h;
    if (which === "left") return new Face(d, L(x, y + dd, top), R([1, 0, 0]), R([0, 0, -1]), w, h);
    if (which === "right") return new Face(d, L(x + w, y + dd, top), R([0, -1, 0]), R([0, 0, -1]), dd, h);
    if (which === "top") return new Face(d, L(x, y, top), R([1, 0, 0]), R([0, 1, 0]), w, dd);
    if (which === "back-left") return new Face(d, L(x + w, y, top), R([-1, 0, 0]), R([0, 0, -1]), w, h);
    if (which === "back-right") return new Face(d, L(x, y, top), R([0, 1, 0]), R([0, 0, -1]), dd, h);
    return null;
  }
  drawFaces(d) {
    const o = this.opts;
    for (const k of ["left", "right", "top"]) if (typeof o[k] === "function") o[k](this.face(d, k), this);
    if (typeof o.faces === "function") o.faces((k) => this.face(d, k), this);
  }
};
var Cylinder = class extends Node {
  get kind() {
    return "cylinder";
  }
  g() {
    const o = this.opts, at = o.at || [0, 0, 0];
    const r = o.r ?? 10, rt = o.rTop ?? r;
    return { cx: at[0], cy: at[1], z: (o.z ?? at[2]) || 0, r, rt, h: o.h ?? 10, c: o.chamfer || 0 };
  }
  lbox() {
    const { cx, cy, z, r, rt, h } = this.g(), R = Math.max(r, rt);
    return [cx - R, cy - R, z, cx + R, cy + R, z + h];
  }
  draw(d) {
    const { cx: lx, cy: ly, z, r, rt, h } = this.g();
    const T = tones(this.opts), o = this.opts;
    const [cx, cy, Z0] = d.w(lx, ly, z);
    const c = Math.min(this.g().c, rt * 0.9, h);
    const Z1 = Z0 + h, Zs = Z1 - c;
    const S = d.view.S;
    const q = h > EPS ? -2 * S * (r - rt) / (h * Math.SQRT2) : r > rt ? -2 : 2;
    let t1 = -45, t2 = 135, full = false;
    if (q <= -1) full = true;
    else if (q < 1) {
      const a = Math.asin(q) / DEG;
      t1 = a - 45;
      t2 = 135 - a;
    }
    const rS = rt + (r - rt) * (c / (h || 1));
    const pt = (rr, zz, t) => d.hpt(cx, cy, zz, rr, t);
    const M2 = (p) => "M" + fmt(p[0]) + " " + fmt(p[1]);
    const Lp = (p) => "L" + fmt(p[0]) + " " + fmt(p[1]);
    if (h > EPS && q < 1) {
      if (full) {
        const top = rS > EPS ? null : d.P(cx, cy, Z1);
        for (const [a, b, cls] of [[-135, 45, T.right], [45, 225, T.left]]) {
          let s = M2(pt(r, Z0, a)) + d.harc(cx, cy, Z0, r, a, b);
          s += top ? Lp(top) + "Z" : Lp(pt(rS, Zs, b)) + d.harc(cx, cy, Zs, rS, b, a) + "Z";
          d.fill(s, cls);
        }
        d.line(d.hcircle(cx, cy, Z0, r), "ln");
        if (top) {
          d.line(d.d([pt(r, Z0, -45), top]), "ln-soft");
          d.line(d.d([pt(r, Z0, 135), top]), "ln-soft");
        }
      } else {
        const parts = [[t1, Math.min(45, t2), T.right], [Math.max(45, t1), t2, T.left]];
        for (const [a, b, cls] of parts) {
          if (b - a < 0.01) continue;
          let s = M2(pt(r, Z0, a)) + d.harc(cx, cy, Z0, r, a, b);
          if (rS > EPS) s += Lp(pt(rS, Zs, b)) + d.harc(cx, cy, Zs, rS, b, a) + "Z";
          else s += Lp(d.P(cx, cy, Z1)) + "Z";
          d.fill(s, cls);
        }
        d.line(M2(pt(r, Z0, t1)) + d.harc(cx, cy, Z0, r, t1, t2), "ln");
        const apex = rS > EPS ? null : d.P(cx, cy, Z1);
        d.line(d.d([pt(r, Z0, t1), apex || pt(rS, Zs, t1)]), "ln");
        d.line(d.d([pt(r, Z0, t2), apex || pt(rS, Zs, t2)]), "ln");
        if (o.bands) for (const bz of o.bands) {
          const f = (bz - z) / h, rb = r + (rt - r) * f;
          d.line(M2(pt(rb, Z0 + bz - z, t1)) + d.harc(cx, cy, Z0 + bz - z, rb, t1, t2), o.bandClass || "ln-soft");
        }
        if (o.ribs) {
          const n = o.ribs, a0 = o.ribStart || 0;
          for (let i = 0; i < n; i++) {
            let a = a0 + 360 * i / n;
            a = ((a - t1) % 360 + 360) % 360 + t1;
            if (a > t1 + 0.5 && a < t2 - 0.5) d.line(d.d([pt(r, Z0 + (o.ribFrom ?? 0), a), pt(r + (rt - r) * ((o.ribTo ?? h) / h), Z0 + (o.ribTo ?? h), a)]), o.ribClass || "ln-soft");
          }
        }
      }
    }
    if (rt > EPS) {
      if (c > EPS) {
        d.fill(d.hcircle(cx, cy, Zs, rS) + d.hcircle(cx, cy, Z1, rt - c), T.bevel, ' fill-rule="evenodd"');
        d.line(d.hcircle(cx, cy, Zs, rS), "ln");
        if (o.top !== false) d.both(d.hcircle(cx, cy, Z1, rt - c), T.top, "ln");
      } else if (o.top !== false) d.both(d.hcircle(cx, cy, Z1, rt), T.top, "ln");
      if (o.rings) for (const rr of o.rings) d.line(d.hcircle(cx, cy, Z1, rr), "ln-soft");
    }
    if (typeof o.topFace === "function") {
      const f = new Face(d, [cx, cy, Z1], [1, 0, 0], [0, 1, 0], rt * 2, rt * 2);
      o.topFace(f, this);
    }
  }
};
function rangeIntersect(a0, a1, v0, v1) {
  const out = [];
  for (const k of [-360, 0, 360]) {
    const s = Math.max(a0, v0 + k), e = Math.min(a1, v1 + k);
    if (e - s > 0.01) out.push([s, e, k]);
  }
  return out;
}
var TubeSegment = class extends Node {
  get kind() {
    return "tube-segment";
  }
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
    const M2 = (p) => "M" + fmt(p[0]) + " " + fmt(p[1]);
    const Lp = (p) => "L" + fmt(p[0]) + " " + fmt(p[1]);
    const wall = (rr, s, e, cls) => M2(pt(rr, Z0, s)) + d.harc(cx, cy, Z0, rr, s, e) + Lp(pt(rr, Z1, e)) + d.harc(cx, cy, Z1, rr, e, s) + "Z";
    if (ri > EPS) for (const [s, e, k] of rangeIntersect(a0, a1, 135, 315)) {
      for (const [s2, e2, cls] of [[s, Math.min(e, 225 + k), T.right], [Math.max(s, 225 + k), e, T.left]]) {
        if (e2 - s2 > 0.01) d.fill(wall(ri, s2, e2), cls);
      }
      d.line(M2(pt(ri, Z0, s)) + d.harc(cx, cy, Z0, ri, s, e), "ln-soft");
      for (const sil of [135, 315, 135 + 360, 315 - 360]) if (sil > a0 + 0.01 && sil < a1 - 0.01) d.line(d.d([pt(ri, Z0, sil), pt(ri, Z1, sil)]), "ln");
      if (o.innerBands) for (const bz of o.innerBands) d.line(M2(pt(ri, Z0 + bz, s)) + d.harc(cx, cy, Z0 + bz, ri, s, e), "ln-soft");
    }
    for (const [s, e, k] of rangeIntersect(a0, a1, -45, 135)) {
      for (const [s2, e2, cls] of [[s, Math.min(e, 45 + k), T.right], [Math.max(s, 45 + k), e, T.left]]) {
        if (e2 - s2 > 0.01) d.fill(wall(r, s2, e2), cls);
      }
      d.line(M2(pt(r, Z0, s)) + d.harc(cx, cy, Z0, r, s, e), "ln");
      for (const sil of [-45, 135, 315, 495]) if (sil > a0 + 0.01 && sil < a1 - 0.01) d.line(d.d([pt(r, Z0, sil), pt(r, Z1, sil)]), "ln");
      if (o.bands) for (const bz of o.bands) d.line(M2(pt(r, Z0 + bz, s)) + d.harc(cx, cy, Z0 + bz, r, s, e), o.bandClass || "ln-soft");
      if (o.ribs) {
        const step = 360 / o.ribs;
        for (let a = Math.ceil(s / step) * step; a < e; a += step) if (a > s + 0.3) d.line(d.d([pt(r, Z0 + (o.ribFrom ?? 0), a), pt(r, Z0 + (o.ribTo ?? h), a)]), o.ribClass || "ln-soft");
      }
    }
    const top = M2(pt(r, Z1, a0)) + d.harc(cx, cy, Z1, r, a0, a1) + (ri > EPS ? Lp(pt(ri, Z1, a1)) + d.harc(cx, cy, Z1, ri, a1, a0) : Lp(d.P(cx, cy, Z1))) + "Z";
    d.fill(top, T.top);
    d.line(M2(pt(r, Z1, a0)) + d.harc(cx, cy, Z1, r, a0, a1), "ln");
    if (ri > EPS) d.line(M2(pt(ri, Z1, a0)) + d.harc(cx, cy, Z1, ri, a0, a1), "ln");
    if (o.topRings) for (const rr of o.topRings) d.line(M2(pt(rr, Z1, a0)) + d.harc(cx, cy, Z1, rr, a0, a1), "ln-soft");
    if (o.topRadials) {
      const step = 360 / o.topRadials;
      for (let a = Math.ceil(a0 / step) * step; a < a1; a += step) d.line(d.d([pt(ri, Z1, a), pt(r, Z1, a)]), "ln-soft");
    }
  }
};
var Sphere = class extends Node {
  get kind() {
    return "sphere";
  }
  lbox() {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], r = o.r ?? 10;
    return [x - r, y - r, z - r, x + r, y + r, z + r];
  }
  draw(d) {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], r = o.r ?? 10, T = tones(o);
    const w = d.w(x, y, z), c = d.P(w[0], w[1], w[2]);
    const { C, S } = d.view, rx = r * Math.SQRT2 * C, ry = r * Math.sqrt(2 * S * S + 1);
    d.P(w[0], w[1], w[2] + r);
    d.P(w[0] + r, w[1] - r, w[2]);
    d.P(w[0] - r, w[1] + r, w[2]);
    d.P(w[0], w[1], w[2] - r);
    const circ = (k, dx = 0, dy = 0) => {
      const a = rx * k, b = ry * k, X = c[0] + dx, Y = c[1] + dy;
      return "M" + fmt(X - a) + " " + fmt(Y) + "A" + fmt(a) + " " + fmt(b) + " 0 1 0 " + fmt(X + a) + " " + fmt(Y) + "A" + fmt(a) + " " + fmt(b) + " 0 1 0 " + fmt(X - a) + " " + fmt(Y) + "Z";
    };
    d.fill(circ(1), T.right);
    d.fill(circ(0.78, -rx * 0.14, -ry * 0.16), T.top, ' opacity=".7"');
    d.line(circ(1), "ln");
    if (o.equator) d.line("M" + fmt(c[0] - rx) + " " + fmt(c[1]) + d.harc(w[0], w[1], w[2], r, 135, 315), "ln-soft");
  }
};
var Hull = class extends Node {
  get kind() {
    return "hull";
  }
  verts() {
    const o = this.opts, at = o.at || [0, 0, 0];
    return (o.vertices || []).map((v) => [v[0] + at[0], v[1] + at[1], v[2] + at[2]]);
  }
  lbox() {
    const b = box3.empty();
    for (const v of this.verts()) box3.addPt(b, v[0], v[1], v[2]);
    return b;
  }
  aabb(frame) {
    const b = box3.empty();
    for (const v of this.verts()) {
      const w = applyFrame(frame, v[0], v[1], v[2]);
      box3.addPt(b, w[0], w[1], w[2]);
    }
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
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        n = v3.add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
      }
      const fc = p.reduce((a, v) => v3.add(a, v), [0, 0, 0]).map((s) => s / p.length);
      if (v3.dot(n, v3.sub(fc, cen)) < 0) n = v3.mul(n, -1);
      n = v3.norm(n);
      const visible = v3.dot(n, view) > 1e-6;
      const cls = n[2] >= Math.max(n[0], n[1]) - 1e-6 ? T.top : n[1] > n[0] ? T.left : T.right;
      return { f, p, cls, fi, n, visible };
    });
    const faces = all.filter((f) => f.visible);
    for (const f of faces) d.fill(d.dw(f.p, true), o.faceTones && o.faceTones[f.fi] || f.cls);
    const edges = /* @__PURE__ */ new Map();
    all.forEach((F) => F.f.forEach((a, i) => {
      const b = F.f[(i + 1) % F.f.length], k = a < b ? a + "," + b : b + "," + a;
      const e = edges.get(k);
      if (e) e.push(F);
      else edges.set(k, [F]);
    }));
    const crease = Math.cos((o.crease ?? 28) * Math.PI / 180);
    let ln = "";
    for (const [k, fs] of edges) {
      const vis = fs.filter((F) => F.visible);
      if (!vis.length) continue;
      const sharp = fs.length < 2 || vis.length === 1 || v3.dot(fs[0].n, fs[1].n) < crease;
      if (!sharp) continue;
      const [a, b] = k.split(",").map(Number);
      ln += d.dw([V[a], V[b]]);
    }
    d.line(ln, "ln");
    if (typeof o.onFaces === "function") o.onFaces(d, faces);
  }
};
var PANEL_AXES = {
  left: { U: [1, 0, 0], V: [0, 0, -1], N: [0, 1, 0] },
  right: { U: [0, -1, 0], V: [0, 0, -1], N: [1, 0, 0] },
  top: { U: [1, 0, 0], V: [0, 1, 0], N: [0, 0, 1] }
};
var Panel = class extends Hull {
  get kind() {
    return "panel";
  }
  geo() {
    const o = this.opts, ax = PANEL_AXES[o.plane || "left"], at = o.at || [0, 0, 0];
    const w = o.w ?? 20, h = o.h ?? 30, t = o.t ?? 2;
    const tl = o.plane === "top" ? at : [at[0], at[1], at[2] + h];
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
    for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n + (i + 1) % n, n + i]);
    this.opts.faces = faces;
    super.draw(d);
    if (typeof o.front === "function") o.front(this.face(d), this);
  }
  /* Face drawer on the front, (0,0) at the top-left corner */
  face(d) {
    const { ax, w, h, tl } = this.geo();
    return new Face(d, d.w(...tl), frameVec(d.frame, ax.U), frameVec(d.frame, ax.V), w, h);
  }
};
function slabVertices(origin, u, v, w) {
  const o = origin, A = (...vs) => vs.reduce((s, x) => v3.add(s, x), o);
  return [A(), A(u), A(u, v), A(v), A(w), A(u, w), A(u, v, w), A(v, w)];
}
var SLAB_FACES = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [3, 2, 6, 7], [0, 3, 7, 4], [1, 2, 6, 5]];
var Flat = class extends Node {
  get kind() {
    return "flat";
  }
  g() {
    const o = this.opts, at = o.at || [0, 0, 0];
    return { x: at[0], y: at[1], z: (o.z ?? at[2]) || 0 };
  }
  outline() {
    const o = this.opts, { x, y } = this.g();
    if (o.shape === "poly") return (o.points || []).map((p) => [p[0] + x, p[1] + y]);
    const s = o.size || [o.w ?? 20, o.d ?? 20];
    let pts = rrect(x, y, s[0], s[1], o.r || 0, o.n);
    if (o.rot) pts = rotatePts(pts, x + s[0] / 2, y + s[1] / 2, o.rot);
    return pts;
  }
  lbox() {
    const o = this.opts, { x, y, z } = this.g();
    if (o.shape === "circle" || o.shape === "ring") {
      const r = o.r ?? 10;
      return [x - r, y - r, z, x + r, y + r, z];
    }
    const b = box3.empty();
    for (const p of this.outline()) box3.addPt(b, p[0], p[1], z);
    return b;
  }
  draw(d) {
    const o = this.opts, { x, y, z } = this.g();
    const fill = o.fill === void 0 ? null : o.fill, line = o.line === void 0 ? "ln-soft" : o.line;
    const dash = o.dash ? ' stroke-dasharray="' + o.dash + '"' : void 0;
    let path2;
    if (o.shape === "circle" || o.shape === "ring") {
      const [cx, cy, Z] = d.w(x, y, z);
      path2 = d.hcircle(cx, cy, Z, o.r ?? 10);
      if (o.shape === "ring") {
        const inner = d.hcircle(cx, cy, Z, o.ri ?? (o.r ?? 10) / 2);
        if (fill) d.fill(path2 + inner, fill, ' fill-rule="evenodd"');
        if (line) {
          d.line(path2, line, dash);
          d.line(inner, line, dash);
        }
        return;
      }
    } else path2 = d.dl(this.outline().map((p) => [p[0], p[1], z]), true);
    if (fill) d.fill(path2, fill);
    if (line) d.line(path2, line, dash);
  }
};
function arrowHead(d, a, b, size, cls) {
  let dir = v3.sub(b, a);
  const L = v3.len(dir);
  if (L < EPS) return;
  dir = v3.mul(dir, 1 / L);
  let perp = Math.abs(dir[2]) > 0.9 ? v3.norm([1, -1, 0]) : v3.norm([-dir[1], dir[0], 0]);
  const base = v3.sub(b, v3.mul(dir, size));
  const p1 = v3.add(base, v3.mul(perp, size * 0.45)), p2 = v3.sub(base, v3.mul(perp, size * 0.45));
  d.fill(d.dw([b, p1, p2], true), cls);
}
var Line = class extends Node {
  get kind() {
    return "line";
  }
  pts() {
    const o = this.opts, at = o.at || [0, 0, 0];
    let pts = o.path ? o.path.points : o.points || [];
    return pts.map((p) => [p[0] + at[0], p[1] + at[1], (p[2] || 0) + at[2]]);
  }
  lbox() {
    const b = box3.empty();
    for (const p of this.pts()) box3.addPt(b, p[0], p[1], p[2]);
    return box3.valid(b) ? b : null;
  }
  aabb(frame) {
    const b = box3.empty();
    for (const p of this.pts()) {
      const w = applyFrame(frame, p[0], p[1], p[2]);
      box3.addPt(b, w[0], w[1], w[2]);
    }
    return box3.valid(b) ? b : null;
  }
  draw(d) {
    const o = this.opts, pts = this.pts().map((p) => d.w(p[0], p[1], p[2]));
    if (pts.length < 2) return;
    const cls = o.line || o.cls || "ln";
    let extra = "";
    if (o.dash) extra += ' stroke-dasharray="' + o.dash + '"';
    if (o.flow) extra += ' data-flow="' + o.flow + '"';
    if (o.width) extra += ' stroke-width="' + o.width + '"';
    if (o.reveal !== void 0 && o.reveal < 1) extra += ' pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="' + fmt(1 - Math.max(0, o.reveal)) + '"';
    d.line(d.dw(pts, o.closed), cls, extra || void 0);
    if (o.reveal !== void 0 && o.reveal < 1) return;
    const as = o.arrowSize || 5;
    if (o.arrow === "end" || o.arrow === "both" || o.arrow === true) arrowHead(d, pts[pts.length - 2], pts[pts.length - 1], as, o.arrowClass || "f-ink");
    if (o.arrow === "start" || o.arrow === "both") arrowHead(d, pts[1], pts[0], as, o.arrowClass || "f-ink");
    if (o.dots) for (const p of [pts[0], pts[pts.length - 1]]) d.both(d.hcircle(p[0], p[1], p[2], o.dots), "f-ink", null);
  }
};
function routePoints(from, to, opt = {}) {
  const z = opt.z || 0, r = opt.radius ?? 6, mode = opt.route || "auto";
  const [x0, y0] = from, [x1, y1] = to;
  let pts;
  if (Array.isArray(mode)) pts = [[x0, y0], ...mode, [x1, y1]];
  else if (mode === "straight" || (Math.abs(x1 - x0) < EPS || Math.abs(y1 - y0) < EPS)) pts = [[x0, y0], [x1, y1]];
  else {
    const xf = mode === "x" ? true : mode === "y" ? false : mode === "xyx" || mode === "yxy" ? null : Math.abs(x1 - x0) >= Math.abs(y1 - y0);
    if (mode === "xyx") {
      const mx = (x0 + x1) / 2;
      pts = [[x0, y0], [mx, y0], [mx, y1], [x1, y1]];
    } else if (mode === "yxy") {
      const my = (y0 + y1) / 2;
      pts = [[x0, y0], [x0, my], [x1, my], [x1, y1]];
    } else pts = xf ? [[x0, y0], [x1, y0], [x1, y1]] : [[x0, y0], [x0, y1], [x1, y1]];
  }
  return filletPolyline(pts.map((p) => [p[0], p[1], p[2] ?? z]), r);
}
function filletPolyline(pts, r, closed = false) {
  if (r <= 0 || pts.length < 3) return pts.map((p) => p.slice());
  const out = [pts[0].slice()];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const u = v3.sub(a, b), w = v3.sub(c, b), lu = v3.len(u), lw = v3.len(w);
    if (lu < EPS || lw < EPS) continue;
    const un = v3.mul(u, 1 / lu), wn = v3.mul(w, 1 / lw);
    const cos = clampN(v3.dot(un, wn), -1, 1), ang = Math.acos(cos);
    if (ang > Math.PI - 1e-3) {
      out.push(b.slice());
      continue;
    }
    const t = Math.min(r / Math.tan(ang / 2), lu / 2, lw / 2);
    const p0 = v3.add(b, v3.mul(un, t)), p1 = v3.add(b, v3.mul(wn, t));
    const n = 8;
    for (let k = 0; k <= n; k++) {
      const s = k / n;
      const q = v3.add(v3.add(v3.mul(p0, (1 - s) * (1 - s)), v3.mul(b, 2 * s * (1 - s))), v3.mul(p1, s * s));
      out.push(q);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}
var clampN = (v, a, b) => Math.max(a, Math.min(b, v));
var Ribbon = class extends Node {
  get kind() {
    return "ribbon";
  }
  pts() {
    const o = this.opts;
    return (o.path ? o.path.points : o.points || []).map((p) => [p[0], p[1], p[2] ?? o.z ?? 0]);
  }
  outline() {
    const o = this.opts, P = this.pts(), hw = (o.width ?? 10) / 2, L = [], R = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      L.push([P[i][0] - dy * hw, P[i][1] + dx * hw, P[i][2]]);
      R.push([P[i][0] + dy * hw, P[i][1] - dx * hw, P[i][2]]);
    }
    return { L, R };
  }
  lbox() {
    const b = box3.empty(), { L, R } = this.outline();
    for (const p of L.concat(R)) box3.addPt(b, p[0], p[1], p[2]);
    return box3.valid(b) ? b : null;
  }
  aabb(frame) {
    const b = box3.empty(), { L, R } = this.outline();
    for (const p of L.concat(R)) {
      const w = applyFrame(frame, p[0], p[1], p[2]);
      box3.addPt(b, w[0], w[1], w[2]);
    }
    return box3.valid(b) ? b : null;
  }
  draw(d) {
    const o = this.opts, { L, R } = this.outline();
    if (L.length < 2) return;
    d.fill(d.dl(L.concat(R.slice().reverse()), true), o.fill || "f-road");
    if (o.line !== false) {
      d.line(d.dl(L), o.line || "ln-soft");
      d.line(d.dl(R), o.line || "ln-soft");
    }
    if (o.center) d.line(d.dl(this.pts()), "ln-soft", ' stroke-dasharray="' + (o.center === true ? "4 4" : o.center) + '"' + (o.flow ? ' data-flow="' + o.flow + '"' : ""));
  }
};
var Helix = class extends Node {
  get kind() {
    return "helix";
  }
  lbox() {
    const o = this.opts, b = box3.empty();
    for (const p of [o.a, o.b]) box3.addPt(b, p[0], p[1], p[2]);
    return [b[0] - o.r, b[1] - o.r, b[2] - o.r, b[3] + o.r, b[4] + o.r, b[5] + o.r];
  }
  draw(d) {
    const o = this.opts, a = d.w(...o.a), b = d.w(...o.b);
    let dd = v3.sub(b, a);
    const L = v3.len(dd);
    dd = v3.mul(dd, 1 / L);
    let e1 = v3.norm([dd[1], -dd[0], 0]);
    if (!isFinite(e1[0]) || v3.len([dd[1], -dd[0], 0]) < 1e-6) e1 = [1, 0, 0];
    const e2 = v3.cross(dd, e1);
    const n = o.n || Math.round(o.turns * 12), pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, th = o.turns * 2 * Math.PI * t;
      pts.push(v3.add(v3.add(a, v3.mul(dd, L * t)), v3.add(v3.mul(e1, o.r * Math.cos(th)), v3.mul(e2, o.r * Math.sin(th)))));
    }
    d.line(d.dw(pts), o.line || "ln");
  }
};
var PLANES = {
  top: [[1, 0, 0], [0, 1, 0]],
  left: [[1, 0, 0], [0, 0, -1]],
  // the +y facing plane, reads left → right going down-right
  right: [[0, -1, 0], [0, 0, -1]],
  // the +x facing plane, reads left → right going up-right
  "top-y": [[0, -1, 0], [1, 0, 0]]
  // top plane, text running along −y (up-right)
};
var Text = class extends Node {
  get kind() {
    return "text";
  }
  lbox() {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], size = o.size || 8;
    const len = String(o.text ?? "").length * size * 0.62;
    const pl = PLANES[o.plane || "screen"];
    if (!pl) return [x, y, z, x, y, z];
    const [U] = pl, b = box3.empty();
    const s = o.anchor === "middle" ? -0.5 : o.anchor === "end" ? -1 : 0;
    box3.addPt(b, x + U[0] * len * s, y + U[1] * len * s, z);
    box3.addPt(b, x + U[0] * len * (s + 1), y + U[1] * len * (s + 1), z);
    return b;
  }
  draw(d) {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], size = o.size || 8;
    const pl = PLANES[o.plane || "screen"];
    const cls = o.cls || (o.plane === "screen" || !o.plane ? "tx tx-label" : "tx");
    const anchor = o.anchor || "start";
    const ls = o.spacing !== void 0 ? ' letter-spacing="' + o.spacing + '"' : "";
    const wt = o.weight ? ' font-weight="' + o.weight + '"' : "";
    let str = String(o.text ?? "");
    if (o.chars !== void 0) str = str.slice(0, Math.max(0, Math.round(o.chars)));
    const lines = str.split("\n");
    const lh = (o.lineHeight || 1.3) * size;
    let tsp = lines.length === 1 ? escText(lines[0]) : lines.map((l, i) => '<tspan x="0" dy="' + (i ? fmt(lh) : 0) + '">' + escText(l) + "</tspan>").join("");
    if (!pl) {
      const w = d.w(x, y, z), p = d.P(w[0], w[1], w[2]);
      const dx = o.dx || 0, dy = o.dy || 0;
      const tw = Math.max(...lines.map((l) => l.length)) * size * (cls.includes("tx-label") ? 0.72 : 0.62);
      const x0 = p[0] + dx - (anchor === "middle" ? tw / 2 : anchor === "end" ? tw : 0), y1 = p[1] + dy;
      const b = d.b;
      b[0] = Math.min(b[0], x0);
      b[2] = Math.max(b[2], x0 + tw);
      b[1] = Math.min(b[1], y1 - size);
      b[3] = Math.max(b[3], y1 + lh * (lines.length - 1) + size * 0.3);
      d.raw('<text class="' + cls + '" transform="translate(' + fmt(p[0] + dx) + " " + fmt(p[1] + dy) + ')" font-size="' + fmt(size) + '" text-anchor="' + anchor + '"' + ls + wt + ">" + tsp + "</text>");
      return;
    }
    const U = frameVec(d.frame, pl[0]), V = frameVec(d.frame, pl[1]);
    const f = new Face(d, d.w(x, y, z), U, V, 0, 0);
    const m = f.matrix(0, 0);
    d.raw('<text class="' + cls + '" transform="' + m + '" font-size="' + fmt(size) + '" text-anchor="' + anchor + '"' + ls + wt + ">" + tsp + "</text>");
    d.P(...f.pt(String(o.text).length * size * 0.6, 0));
  }
};
var Pane = class extends Node {
  get kind() {
    return "pane";
  }
  basis(frame) {
    const o = this.opts, pl = PLANES[o.plane || "left"];
    return { U: frameVec(frame, o.u || pl[0]), V: frameVec(frame, o.v || pl[1]) };
  }
  corners() {
    const o = this.opts, at = o.at || [0, 0, 0], pl = PLANES[o.plane || "left"];
    const U = o.u || pl[0], V = o.v || pl[1], w = o.w ?? 20, h = o.h ?? 20;
    const pt = (u, v) => [at[0] + U[0] * u + V[0] * v, at[1] + U[1] * u + V[1] * v, at[2] + U[2] * u + V[2] * v];
    return [pt(0, 0), pt(w, 0), pt(w, h), pt(0, h)];
  }
  lbox() {
    const b = box3.empty();
    for (const p of this.corners()) box3.addPt(b, p[0], p[1], p[2]);
    return b;
  }
  aabb(frame) {
    const b = box3.empty();
    for (const p of this.corners()) {
      const w = applyFrame(frame, p[0], p[1], p[2]);
      box3.addPt(b, w[0], w[1], w[2]);
    }
    return b;
  }
  draw(d) {
    const o = this.opts, at = o.at || [0, 0, 0], { U, V } = this.basis(d.frame);
    const f = new Face(d, d.w(at[0], at[1], at[2]), U, V, o.w ?? 20, o.h ?? 20);
    if (o.fill !== false || o.line !== false) {
      f.rect(0, 0, f.w, f.h, { r: o.r || 0, fill: o.fill === void 0 ? "f-glass" : o.fill, line: o.line === void 0 ? "ln" : o.line });
    }
    if (typeof o.draw === "function") o.draw(f, this);
  }
};
var Grid = class extends Node {
  get kind() {
    return "grid";
  }
  lbox() {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], [w, dd] = o.size || [100, 100];
    return [x, y, z, x + w, y + dd, z];
  }
  draw(d) {
    const o = this.opts, [x, y, z] = o.at || [0, 0, 0], [w, dd] = o.size || [100, 100], st = o.step || 10;
    const cls = o.line || "ln-faint";
    for (let i = 0; i <= w + 1e-6; i += st) d.line(d.dl([[x + i, y, z], [x + i, y + dd, z]]), cls);
    for (let j = 0; j <= dd + 1e-6; j += st) d.line(d.dl([[x, y + j, z], [x + w, y + j, z]]), cls);
  }
};
var Custom = class extends Node {
  get kind() {
    return "custom";
  }
  lbox() {
    return this.opts.bounds || null;
  }
  draw(d) {
    if (this.opts.draw) this.opts.draw(d, this);
  }
};

// engine/src/style.js
var THEMES = {
  dark: { bg: "#111214", fg: "#ecebe6", top: 6.5, left: 3.2, right: 1.2, bevel: 10, line: 30, soft: 15, faint: 7, strong: 60, text: 50, dark: "#060607", road: 3.2 },
  light: { bg: "#f7f6f2", fg: "#121211", top: 0, left: 4.5, right: 8, bevel: 2.5, line: 42, soft: 20, faint: 9, strong: 72, text: 55, dark: "#d9d7d0", road: 3 },
  paper: { bg: "#efe9dd", fg: "#2a241b", top: 1, left: 6, right: 11, bevel: 3, line: 48, soft: 24, faint: 10, strong: 75, text: 60, dark: "#d6ccb9", road: 4 },
  blueprint: { bg: "#0d2a4a", fg: "#d8ecff", top: 9, left: 5, right: 2.5, bevel: 13, line: 55, soft: 26, faint: 10, strong: 80, text: 70, dark: "#081d35", road: 5 },
  terminal: { bg: "#07110b", fg: "#9dffbf", top: 7, left: 3.5, right: 1.5, bevel: 11, line: 42, soft: 20, faint: 8, strong: 70, text: 60, dark: "#030805", road: 3 }
};
function themeVars(t) {
  const mix = (p, base = "var(--iso-bg)") => `color-mix(in oklab, var(--iso-fg) ${p}%, ${base})`;
  const a = (p) => `color-mix(in oklab, var(--iso-fg) ${p}%, transparent)`;
  return `--iso-bg:${t.bg};--iso-fg:${t.fg};` + derived(t, mix, a);
}
function derived(t, mix, a) {
  return `--iso-top:${mix(t.top)};--iso-left:${mix(t.left)};--iso-right:${mix(t.right)};--iso-bevel:${mix(t.bevel)};--iso-line:${a(t.line)};--iso-line-soft:${a(t.soft)};--iso-line-faint:${a(t.faint)};--iso-line-strong:${a(t.strong)};--iso-text:${a(t.text)};--iso-ink:${mix(t.strong)};--iso-road:${mix(t.road)};--iso-dark:${t.dark};--iso-screen:color-mix(in oklab, ${t.dark} 70%, var(--iso-bg));--iso-screen-on:${mix(t.top + 3)};--iso-key:${mix(t.top + 1)};--iso-lit:var(--iso-fg);--iso-glow:${a(55)};--iso-glow-soft:${a(22)};--iso-glass:${a(7)};--iso-glass-edge:${a(t.line)};--iso-accent:var(--iso-fg);--iso-focus:var(--iso-fg);`;
}
var M = (top, left, right, bevel, line, soft) => `--iso-top:${top};--iso-left:${left};--iso-right:${right};--iso-bevel:${bevel};` + (line ? `--iso-line:${line};` : "") + (soft ? `--iso-line-soft:${soft};` : "");
var mixF = (c, p, base = "var(--iso-bg)") => `color-mix(in oklab, ${c} ${p}%, ${base})`;
var MATERIALS = {
  /* matte: the default (theme tones) */
  lit: M("var(--iso-lit)", mixF("var(--iso-lit)", 82), mixF("var(--iso-lit)", 68), mixF("var(--iso-lit)", 92), mixF("var(--iso-lit)", 70, "transparent"), mixF("var(--iso-bg)", 30, "transparent")),
  screen: M("var(--iso-screen)", "var(--iso-screen)", "var(--iso-screen)", "var(--iso-screen)"),
  dark: M(mixF("var(--iso-dark)", 55), mixF("var(--iso-dark)", 70), mixF("var(--iso-dark)", 80), mixF("var(--iso-dark)", 45)),
  glass: M(mixF("var(--iso-fg)", 9, "transparent"), mixF("var(--iso-fg)", 6, "transparent"), mixF("var(--iso-fg)", 4, "transparent"), mixF("var(--iso-fg)", 10, "transparent"), "var(--iso-glass-edge)"),
  wire: M("transparent", "transparent", "transparent", "transparent"),
  ghost: M("transparent", "transparent", "transparent", "transparent", mixF("var(--iso-fg)", 12, "transparent"), mixF("var(--iso-fg)", 7, "transparent")),
  solid: M("var(--iso-ink)", mixF("var(--iso-ink)", 85), mixF("var(--iso-ink)", 72), "var(--iso-ink)", mixF("var(--iso-fg)", 75, "transparent")),
  paper: M(mixF("var(--iso-fg)", 14), mixF("var(--iso-fg)", 9), mixF("var(--iso-fg)", 6), mixF("var(--iso-fg)", 18)),
  accent: M("var(--iso-accent)", mixF("var(--iso-accent)", 78), mixF("var(--iso-accent)", 62), mixF("var(--iso-accent)", 90), mixF("var(--iso-accent)", 70, "transparent")),
  tint: M(mixF("var(--iso-tint)", 26), mixF("var(--iso-tint)", 17), mixF("var(--iso-tint)", 11), mixF("var(--iso-tint)", 34), mixF("var(--iso-tint)", 60, "transparent"), mixF("var(--iso-tint)", 32, "transparent"))
};
function css() {
  let s = "";
  s += `.iso{${themeVars(THEMES.dark)}--iso-font:ui-monospace,"Geist Mono","SF Mono","JetBrains Mono",Menlo,Consolas,monospace;display:block;width:100%;height:auto;overflow:visible;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}`;
  for (const k in THEMES) s += `.iso.iso-${k}{${themeVars(THEMES[k])}}`;
  s += `.iso.iso-inherit{--iso-bg:var(--bg,#111214);--iso-fg:var(--fg,#ecebe6);${derived(THEMES.dark, (p) => `color-mix(in oklab, var(--iso-fg) ${p}%, var(--iso-bg))`, (p) => `color-mix(in oklab, var(--iso-fg) ${p}%, transparent)`)}}`;
  for (const k in MATERIALS) s += `.iso .m-${k}{${MATERIALS[k]}}`;
  s += `.iso path,.iso rect,.iso circle,.iso ellipse,.iso line,.iso polyline{fill:none;stroke:none;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}`;
  const fills = { top: "top", left: "left", right: "right", bevel: "bevel", dark: "dark", screen: "screen", "screen-on": "screen-on", key: "key", lit: "lit", glass: "glass", ink: "ink", road: "road", bg: "bg", accent: "accent", soft: "line-faint" };
  for (const k in fills) s += `.iso .f-${k}{fill:var(--iso-${fills[k]});stroke:var(--iso-${fills[k]});stroke-width:.6}`;
  s += `.iso .f-glass,.iso .m-glass [class^="f-"],.iso .m-wire [class^="f-"],.iso .m-ghost [class^="f-"]{stroke:none}`;
  s += `.iso .f-ink{stroke:none}`;
  s += `.iso .ln{stroke:var(--iso-line);stroke-width:1}.iso .ln-soft{stroke:var(--iso-line-soft);stroke-width:1}.iso .ln-faint{stroke:var(--iso-line-faint);stroke-width:1}.iso .ln-strong{stroke:var(--iso-line-strong);stroke-width:1}`;
  s += `.iso .ln-lit{stroke:var(--iso-lit);stroke-width:1.25}.iso .ln-accent{stroke:var(--iso-accent);stroke-width:1.25}.iso .ln-bold{stroke:var(--iso-line-strong);stroke-width:1.6}`;
  s += `.iso .tx{fill:var(--iso-text);stroke:none;font-family:var(--iso-font);font-weight:400}.iso .tx-label{letter-spacing:.08em;text-transform:uppercase}.iso .tx-lit{fill:var(--iso-lit);stroke:none;font-family:var(--iso-font)}.iso .tx-strong{fill:var(--iso-line-strong);stroke:none;font-family:var(--iso-font)}.iso .tx-on-lit{fill:color-mix(in oklab, var(--iso-bg) 72%, transparent)}`;
  s += `.iso .glow{filter:drop-shadow(0 0 2px var(--iso-glow)) drop-shadow(0 0 9px var(--iso-glow-soft))}`;
  s += `.iso .hit{cursor:pointer;outline:none}.iso .focus-ring{fill:none;stroke:none;pointer-events:none}.iso .hit:focus-visible>.focus-ring{stroke:var(--iso-focus);stroke-width:1.25;stroke-dasharray:3 3}`;
  s += `.iso [data-flow]{stroke-dasharray:3 5}`;
  s += `.iso-fig{--iso-fig-bg:#151618;--iso-fig-border:rgba(255,255,255,.06);--iso-fig-cap:rgba(236,235,230,.38);--iso-fig-cap-strong:rgba(236,235,230,.62);position:relative;margin:0;border:1px solid var(--iso-fig-border);border-radius:14px;background:var(--iso-fig-bg);padding:64px 32px;overflow:hidden;box-sizing:border-box;font-family:ui-monospace,"Geist Mono","SF Mono",Menlo,monospace}`;
  s += `.iso-fig.iso-light{--iso-fig-bg:#fbfaf7;--iso-fig-border:rgba(0,0,0,.08);--iso-fig-cap:rgba(18,18,17,.45);--iso-fig-cap-strong:rgba(18,18,17,.7)}`;
  s += `.iso-fig.iso-paper{--iso-fig-bg:#f3eee4;--iso-fig-border:rgba(42,36,27,.12);--iso-fig-cap:rgba(42,36,27,.5);--iso-fig-cap-strong:rgba(42,36,27,.75)}`;
  s += `.iso-fig.iso-blueprint{--iso-fig-bg:#0f2f52;--iso-fig-border:rgba(216,236,255,.12);--iso-fig-cap:rgba(216,236,255,.5);--iso-fig-cap-strong:rgba(216,236,255,.8)}`;
  s += `.iso-fig.iso-terminal{--iso-fig-bg:#08140d;--iso-fig-border:rgba(157,255,191,.1);--iso-fig-cap:rgba(157,255,191,.45);--iso-fig-cap-strong:rgba(157,255,191,.75)}`;
  s += `.iso-fig .iso-cap{position:absolute;margin:0;font-size:11px;line-height:1;letter-spacing:.08em;color:var(--iso-fig-cap);pointer-events:none;white-space:nowrap}`;
  s += `.iso-fig .iso-cap-tl{top:22px;left:24px}.iso-fig .iso-cap-tr{top:22px;right:24px;text-transform:uppercase}.iso-fig .iso-cap-bl{bottom:22px;left:24px;text-transform:uppercase}.iso-fig .iso-cap-br{bottom:22px;right:24px;color:var(--iso-fig-cap-strong)}`;
  s += `@media (max-width:520px){.iso-fig{padding:52px 12px}.iso-fig .iso-cap-bl{display:none}}`;
  s += `.iso-stage{position:relative}`;
  return s;
}
var injected = false;
function injectCSS(doc = typeof document !== "undefined" ? document : null) {
  if (!doc || injected || doc.getElementById("iso-engine-css")) {
    injected = true;
    return;
  }
  const el = doc.createElement("style");
  el.id = "iso-engine-css";
  el.textContent = css();
  doc.head.appendChild(el);
  injected = true;
}

// engine/src/anim.js
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1;
    if (Math.abs(sx(t) - x) > 1e-4) {
      t = x;
      for (let i = 0; i < 30; i++) {
        const v = sx(t);
        if (Math.abs(v - x) < 1e-5) break;
        if (v < x) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sy(t);
  };
}
var outBounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
var c1 = 1.70158;
var c3 = c1 + 1;
var c2 = c1 * 1.525;
var ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  inQuart: (t) => t ** 4,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2,
  inExpo: (t) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  outExpo: (t) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: (t) => t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inSine: (t) => 1 - Math.cos(t * Math.PI / 2),
  outSine: (t) => Math.sin(t * Math.PI / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inBack: (t) => c3 * t * t * t - c1 * t * t,
  outBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  inOutBack: (t) => t < 0.5 ? Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2,
  outElastic: (t) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1,
  outBounce,
  /* design-system curves */
  out: bezier(0.16, 1, 0.3, 1),
  standard: bezier(0.2, 0, 0, 1),
  smooth: bezier(0.45, 0, 0.2, 1),
  bezier,
  steps: (n) => (t) => Math.min(1, Math.floor(t * n) / n),
  /* critically-damped-ish spring settling at 1 */
  spring: (k = 1) => (t) => 1 - Math.exp(-6 * t * k) * Math.cos(9 * t * k)
};
function getEase(e) {
  if (typeof e === "function") return e;
  if (Array.isArray(e)) return bezier(...e);
  return ease[e] || ease.inOutCubic;
}
var lerpV = (a, b, t) => Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * t) : typeof a === "number" ? a + (b - a) * t : t < 1 ? a : b;
var clone = (v) => Array.isArray(v) ? v.slice() : v;
var Timeline = class {
  constructor(scene2, opt = {}) {
    this.scene = scene2;
    this.repeat = opt.repeat ?? 0;
    this.yoyo = !!opt.yoyo;
    this.repeatDelay = opt.repeatDelay || 0;
    this.delay = opt.delay || 0;
    this.start = opt.start ?? (scene2 ? scene2.time : 0);
    this.tracks = /* @__PURE__ */ new Map();
    this.calls = [];
    this.cursor = 0;
    this.prevStart = 0;
    this.duration = 0;
    this.lastT = null;
    this.iteration = -1;
    this.done = false;
    this.paused = false;
    this.reactive = !!opt.reactive;
    this.onComplete = opt.onComplete;
    this.label = opt.label;
  }
  _pos(position, d) {
    if (position === void 0 || position === null) return this.cursor;
    if (typeof position === "number") return position;
    if (position === "<") return this.prevStart;
    if (position === ">") return this.cursor;
    const m = /^([<>]?)([+-]=)?(-?[\d.]+)$/.exec(position);
    if (m) {
      const base = m[1] === "<" ? this.prevStart : this.cursor;
      const n = parseFloat(m[3]);
      if (m[2] === "+=") return base + n;
      if (m[2] === "-=") return base - n;
      return m[1] ? base + n : n;
    }
    return this.cursor;
  }
  _add(target, props, opt, position, mode) {
    const nodes = this.scene ? this.scene.resolve(target) : [].concat(target);
    const dur = opt.duration ?? 0.6, e = getEase(opt.ease ?? "inOutCubic");
    const t0 = this._pos(position, dur);
    const st = staggerFn(opt.stagger, nodes, this.scene);
    let end = t0;
    nodes.forEach((node, i) => {
      const s = t0 + st(i);
      for (const prop in props) {
        if (prop === "duration" || prop === "ease") continue;
        const key = node.uid + ":" + prop;
        let tr = this.tracks.get(key);
        if (!tr) this.tracks.set(key, tr = { node, prop, base: clone(node.get(prop)), entries: [] });
        const prev = tr.entries[tr.entries.length - 1];
        const cur = prev ? prev.to : tr.base;
        let from, to;
        if (mode === "from") {
          from = props[prop];
          to = cur;
        } else if (mode === "fromTo") {
          from = opt.from[prop];
          to = props[prop];
        } else {
          from = cur;
          to = props[prop];
        }
        if (typeof to === "string" && /^[+-]=/.test(to)) to = cur + parseFloat(to.replace("=", ""));
        if (typeof to === "function") to = to(i, node);
        if (typeof from === "function") from = from(i, node);
        tr.entries.push({ start: s, dur: mode === "set" ? 0 : dur, from: clone(from), to: clone(to), ease: e, explicit: mode === "from" || mode === "fromTo" });
        tr.entries.sort((a, b) => a.start - b.start);
      }
      end = Math.max(end, s + (mode === "set" ? 0 : dur));
    });
    this.prevStart = t0;
    this.cursor = Math.max(this.cursor, end);
    this.duration = Math.max(this.duration, end);
    return this;
  }
  to(target, props, opt = {}, position) {
    return this._add(target, props, opt, position, "to");
  }
  from(target, props, opt = {}, position) {
    return this._add(target, props, opt, position, "from");
  }
  fromTo(target, from, to, opt = {}, position) {
    return this._add(target, to, { ...opt, from }, position, "fromTo");
  }
  set(target, props, position) {
    return this._add(target, props, { duration: 0 }, position, "set");
  }
  call(fn, position) {
    const t = this._pos(position);
    this.calls.push({ t, fn });
    this.calls.sort((a, b) => a.t - b.t);
    this.duration = Math.max(this.duration, t);
    this.cursor = Math.max(this.cursor, t);
    return this;
  }
  wait(d) {
    this.cursor += d;
    this.duration = Math.max(this.duration, this.cursor);
    return this;
  }
  /* nest another timeline's tracks (built with a fresh Timeline) at a position */
  add(tl, position) {
    const off = this._pos(position);
    for (const [k, tr] of tl.tracks) {
      let mine = this.tracks.get(k);
      if (!mine) this.tracks.set(k, mine = { node: tr.node, prop: tr.prop, base: tr.base, entries: [] });
      for (const e of tr.entries) mine.entries.push({ ...e, start: e.start + off });
      mine.entries.sort((a, b) => a.start - b.start);
    }
    for (const c of tl.calls) this.calls.push({ t: c.t + off, fn: c.fn });
    this.calls.sort((a, b) => a.t - b.t);
    this.prevStart = off;
    this.cursor = Math.max(this.cursor, off + tl.duration);
    this.duration = Math.max(this.duration, off + tl.duration);
    return this;
  }
  get total() {
    return this.repeat < 0 ? Infinity : this.delay + this.duration * (this.repeat + 1) + this.repeatDelay * this.repeat;
  }
  /* local time τ within the current iteration, or null before start */
  local(time) {
    let t = time - this.start - this.delay;
    if (t < 0) return { tau: 0, before: true, iter: 0 };
    const cycle = this.duration + this.repeatDelay;
    let iter = 0;
    if (this.repeat !== 0 && cycle > 0) {
      iter = Math.floor(t / cycle);
      if (this.repeat > 0 && iter > this.repeat) return { tau: this.yoyo && this.repeat % 2 === 1 ? 0 : this.duration, end: true, iter: this.repeat };
      t -= iter * cycle;
      if (t > this.duration) t = this.duration;
    } else if (t > this.duration) return { tau: this.duration, end: true, iter: 0 };
    if (this.yoyo && iter % 2 === 1) t = this.duration - t;
    return { tau: t, iter };
  }
  apply(time) {
    if (this.paused || this.done) return;
    const L = this.local(time);
    for (const tr of this.tracks.values()) {
      const es = tr.entries;
      let v;
      if (L.before) {
        if (!es[0].explicit) continue;
        v = es[0].from;
      } else {
        let e = null;
        for (let i = es.length - 1; i >= 0; i--) if (es[i].start <= L.tau + 1e-9) {
          e = es[i];
          break;
        }
        if (!e) {
          if (!es[0].explicit) {
            v = tr.base;
          } else v = es[0].from;
        } else if (e.dur <= 0 || L.tau >= e.start + e.dur) v = e.to;
        else v = lerpV(e.from, e.to, e.ease((L.tau - e.start) / e.dur));
      }
      tr.node.set(tr.prop, clone(v));
    }
    this._fire(L);
    if (L.end) {
      this.done = true;
      if (this.onComplete) this.onComplete(this);
      if (this._resolve) this._resolve(this);
    }
  }
  _fire(L) {
    if (!this.calls.length || L.before) {
      this.lastT = null;
      return;
    }
    const prevIter = this.iteration, prevT = this.lastT;
    const fireRange = (a, b) => {
      for (const c of this.calls) if (c.t > a && c.t <= b + 1e-9) c.fn(this.scene, this);
    };
    if (prevT === null) fireRange(-1, L.tau);
    else if (L.iter !== prevIter) {
      fireRange(prevT, this.duration);
      for (let k = prevIter + 1; k < L.iter; k++) fireRange(-1, this.duration);
      fireRange(-1, L.tau);
    } else if (L.tau >= prevT) fireRange(prevT, L.tau);
    this.lastT = L.tau;
    this.iteration = L.iter;
  }
  /* promise-like */
  then(res, rej) {
    if (this.done) return Promise.resolve(this).then(res, rej);
    return new Promise((r) => {
      const prev = this._resolve;
      this._resolve = (x) => {
        if (prev) prev(x);
        r(x);
      };
    }).then(res, rej);
  }
  kill() {
    this.done = true;
    if (this.scene) this.scene._removeTimeline(this);
  }
  reset() {
    this.done = false;
    this.lastT = null;
    this.iteration = -1;
  }
  play() {
    this.paused = false;
    return this;
  }
  pause() {
    this.paused = true;
    return this;
  }
  restart() {
    this.start = this.scene.time;
    this.reset();
    return this;
  }
};
function staggerFn(st, nodes, scene2) {
  if (!st) return () => 0;
  const o = typeof st === "number" ? { each: st } : st;
  const n = nodes.length;
  const each = o.amount !== void 0 ? o.amount / Math.max(1, n - 1) : o.each || 0;
  let rank = nodes.map((_, i) => i);
  if (o.from === "end") rank = rank.map((i) => n - 1 - i);
  else if (o.from === "center") rank = rank.map((i) => Math.abs(i - (n - 1) / 2));
  else if (o.from === "random") {
    let s = o.seed || 7;
    rank = rank.map(() => (s = s * 16807 % 2147483647) / 2147483647 * (n - 1));
  } else if (o.from === "depth" || o.from === "front") {
    const key = (nd) => {
      const b = nd.sortBox ? nd.sortBox() : null;
      return b ? (b[0] + b[3]) / 2 + (b[1] + b[4]) / 2 + b[2] : 0;
    };
    const sorted = nodes.map((nd, i) => [key(nd), i]).sort((a, b) => o.from === "front" ? b[0] - a[0] : a[0] - b[0]);
    sorted.forEach(([, i], r) => {
      rank[i] = r;
    });
  }
  return (i) => rank[i] * each;
}

// engine/src/scene.js
var clock = {
  scenes: /* @__PURE__ */ new Set(),
  manual: typeof window !== "undefined" && (!!window.__ISO_MANUAL__ || /[?&]iso-manual\b/.test(window.location ? window.location.search : "")),
  raf: 0,
  last: 0,
  add(s) {
    this.scenes.add(s);
    this.kick();
  },
  remove(s) {
    this.scenes.delete(s);
  },
  kick() {
    if (this.manual || this.raf || typeof requestAnimationFrame === "undefined") return;
    this.last = 0;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  },
  frame(ts) {
    this.raf = 0;
    const dt = this.last ? Math.min(0.1, (ts - this.last) / 1e3) : 1 / 60;
    this.last = ts;
    let again = false;
    for (const s of this.scenes) {
      if (s._wantsFrame()) {
        s.tick(dt);
        again = again || s._wantsFrame();
      }
    }
    if (again) {
      this.raf = requestAnimationFrame((t) => this.frame(t));
      this.last = ts;
    } else this.last = 0;
  },
  /* manual stepping (export, tests) */
  advance(dt) {
    for (const s of this.scenes) s.tick(dt);
  }
};
var reducedQuery = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
var Scene = class {
  constructor(host, opts = {}) {
    if (host && !(typeof host === "string" || typeof Element !== "undefined" && host instanceof Element)) {
      opts = host;
      host = opts.host;
    }
    this.opts = { theme: "dark", angle: 30, padding: 24, autoplay: true, reducedMotion: "static", ...opts };
    this.view = makeView(this.opts.angle);
    this.root = new Group({ sort: this.opts.sort || "auto" });
    this.root._scene = this;
    this.byUid = /* @__PURE__ */ new Map();
    this.time = 0;
    this.timeScale = 1;
    this.playing = this.opts.autoplay !== false;
    this.timelines = [];
    this.behaviors = [];
    this.pending = /* @__PURE__ */ new Set();
    this.touchedA = /* @__PURE__ */ new Set();
    this.visible = true;
    this.built = false;
    this.listeners = {};
    this.host = typeof host === "string" ? document.querySelector(host) : host || null;
    this.reduced = this.opts.reducedMotion !== "ignore" && reducedQuery();
    this._byUid(this.root);
    if (typeof document !== "undefined") injectCSS(document);
    clock.add(this);
    if (this.host && this.opts.autoRender !== false && typeof queueMicrotask !== "undefined") queueMicrotask(() => {
      if (!this.built && !this.destroyed) this.render();
    });
  }
  /* ── tree ── */
  _byUid(n) {
    this.byUid.set(n.uid, n);
  }
  _register(n) {
    const mount = (x) => {
      this._byUid(x);
      if (x.onMount && !x._mounted) {
        x._mounted = true;
        x.onMount(this);
      }
    };
    mount(n);
    if (n.isGroup) n.each(mount);
  }
  _unregister(n) {
    this.byUid.delete(n.uid);
    if (n.isGroup) n.each((c) => this.byUid.delete(c.uid));
    if (n.el && n.el.parentNode) n.el.parentNode.removeChild(n.el);
  }
  _structure() {
    if (this.built) {
      this.needsRender = true;
      this._wake();
    }
  }
  add(node, opts) {
    if (typeof node === "string") return this.root[node](opts);
    return this.root.add(node);
  }
  group(opts, fn) {
    return this.root.group(opts, fn);
  }
  get(id) {
    if (id instanceof Node) return id;
    return this.root.find((n) => n.id === id) || null;
  }
  find(pred) {
    return this.root.find(pred);
  }
  all(pred = () => true) {
    return this.root.findAll(pred);
  }
  /* target: node | id | '.class' | '#id' | 'prefix*' | array | predicate */
  resolve(target) {
    if (!target) return [];
    if (Array.isArray(target)) return target.flatMap((t) => this.resolve(t));
    if (target instanceof Node) return [target];
    if (typeof target === "function") return this.all(target);
    if (typeof target === "string") {
      if (target[0] === ".") {
        const c = target.slice(1);
        return this.all((n2) => (" " + (n2.opts.class || "") + " ").includes(" " + c + " "));
      }
      const id = target[0] === "#" ? target.slice(1) : target;
      if (id.endsWith("*")) {
        const p = id.slice(0, -1);
        return this.all((n2) => n2.id && n2.id.startsWith(p));
      }
      const n = this.get(id);
      return n ? [n] : [];
    }
    if (target.node) return [target.node];
    return [];
  }
  /* ── layout without DOM (bounds for staggers, fitting) ── */
  measure() {
    this.root.content(this.view, IDENTITY);
    this.measured = true;
    return this.root.sb;
  }
  /* ── DOM ── */
  render() {
    const v = this.view, html = this.root.content(v, IDENTITY);
    this.measured = true;
    if (!this.vb || this.opts.refit) this.vb = this._viewBox();
    const o = this.opts, vb = this.vb;
    const label = o.label || o.title || "Isometric illustration";
    const css2 = [];
    if (o.height) css2.push("height:" + o.height + (typeof o.height === "number" ? "px" : ""), "width:100%");
    if (o.colors) for (const k in o.colors) css2.push("--iso-" + k + ":" + o.colors[k]);
    const svgOpen = '<svg xmlns="http://www.w3.org/2000/svg" class="iso iso-' + o.theme + (o.class ? " " + o.class : "") + '" viewBox="' + vb.map(fmt).join(" ") + '" role="img" aria-label="' + escAttr(label) + '"' + (css2.length ? ' style="' + escAttr(css2.join(";")) + '"' : "") + ' preserveAspectRatio="xMidYMid meet">';
    const markup = svgOpen + (o.title ? "<title>" + escAttr(o.title) + "</title>" : "") + '<g class="iso-root">' + html + "</g></svg>";
    if (!this.host || typeof document === "undefined") {
      this._markup = markup;
      return markup;
    }
    if (this.svg && this.svg.parentNode === this.host) {
      const tmp = document.createElement("div");
      tmp.innerHTML = markup;
      const fresh = tmp.firstChild;
      this.host.replaceChild(fresh, this.svg);
      this.svg = fresh;
    } else {
      const tmp = document.createElement("div");
      tmp.innerHTML = markup;
      this.svg = tmp.firstChild;
      if (o.replace !== false) {
        const old = this.host.querySelector(":scope > svg.iso");
        if (old) old.remove();
      }
      this.host.appendChild(this.svg);
    }
    this.rootEl = this.svg.querySelector(".iso-root");
    this.root.el = this.rootEl;
    this._mapEls(this.svg);
    this._containers = /* @__PURE__ */ new Map();
    this._bindEvents();
    this._observe();
    this.built = true;
    this.needsRender = false;
    if (this.reduced && !this.reducedApplied) {
      this.reducedApplied = true;
      this.playing = false;
      this.seek(o.restTime ?? this.settleTime());
    } else this.update(0);
    this.emit("render");
    clock.kick();
    return this;
  }
  _viewBox() {
    const o = this.opts;
    if (o.view) return o.view.slice();
    const b = this.root.sb, p = o.padding;
    if (!b || !isFinite(b[0])) return [0, 0, 100, 100];
    const ex = o.extend || [0, 0, 0, 0];
    let x = b[0] - p - ex[3], y = b[1] - p - ex[0], w = b[2] - b[0] + 2 * p + ex[1] + ex[3], h = b[3] - b[1] + 2 * p + ex[0] + ex[2];
    if (o.aspect) {
      const a = o.aspect;
      if (w / h > a) {
        const nh = w / a;
        y -= (nh - h) / 2;
        h = nh;
      } else {
        const nw = h * a;
        x -= (nw - w) / 2;
        w = nw;
      }
    }
    if (o.zoom && o.zoom !== 1) {
      const cx = x + w / 2, cy = y + h / 2;
      w /= o.zoom;
      h /= o.zoom;
      x = cx - w / 2;
      y = cy - h / 2;
    }
    return [x, y, w, h];
  }
  refit() {
    this.measure();
    this.vb = this._viewBox();
    if (this.svg) this.svg.setAttribute("viewBox", this.vb.map(fmt).join(" "));
    return this;
  }
  _mapEls(scope) {
    const els = scope.querySelectorAll("[data-uid]");
    for (const el of els) {
      const n = this.byUid.get(+el.getAttribute("data-uid"));
      if (n) n.el = el;
    }
    this.flows = Array.from(this.svg.querySelectorAll("[data-flow]"));
  }
  /* SVG markup of the scene at rest (works without a DOM) */
  toString() {
    if (this.svg) return this.svg.outerHTML;
    const host = this.host;
    this.host = null;
    const m = this.render();
    this.host = host;
    return m;
  }
  /* ── events (delegated) ── */
  _nodeFrom(el, evt) {
    while (el && el !== this.svg) {
      if (el.hasAttribute && el.hasAttribute("data-uid")) {
        const n = this.byUid.get(+el.getAttribute("data-uid"));
        if (n && n.handlers && (n.handlers[evt] || evt === "click" && n.handlers.press)) return n;
      }
      el = el.parentNode;
    }
    return null;
  }
  _bindEvents() {
    const svg = this.svg;
    svg.addEventListener("click", (e) => {
      const n = this._nodeFrom(e.target, "click");
      if (n) {
        n.emit("click", e);
        n.emit("press", e);
      }
    });
    svg.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const n = this._nodeFrom(e.target, "click");
      if (n && e.target.getAttribute("data-uid") == n.uid) {
        e.preventDefault();
        n.emit("click", e);
        n.emit("press", e);
      }
    });
    let hover = null;
    svg.addEventListener("pointerover", (e) => {
      const n = this._nodeFrom(e.target, "hover");
      if (n !== hover) {
        if (hover) hover.emit("leave", e);
        hover = n;
        if (n) n.emit("hover", e);
      }
    });
    svg.addEventListener("pointerleave", (e) => {
      if (hover) {
        hover.emit("leave", e);
        hover = null;
      }
    });
    svg.addEventListener("focusin", (e) => {
      const n = this._nodeFrom(e.target, "focus");
      if (n) n.emit("focus", e);
    });
    svg.addEventListener("pointerdown", (e) => {
      const n = this._nodeFrom(e.target, "down");
      if (n) n.emit("down", e);
    });
    svg.addEventListener("pointerup", (e) => {
      const n = this._nodeFrom(e.target, "up");
      if (n) n.emit("up", e);
    });
  }
  _observe() {
    if (this._io || typeof IntersectionObserver === "undefined") return;
    this._io = new IntersectionObserver((es) => {
      for (const e of es) this.visible = e.isIntersecting;
      if (this.visible) clock.kick();
    });
    this._io.observe(this.svg);
  }
  /* ── animation API ── */
  timeline(opt = {}) {
    const tl = new Timeline(this, opt);
    this.timelines.push(tl);
    this._wake();
    return tl;
  }
  _removeTimeline(tl) {
    const i = this.timelines.indexOf(tl);
    if (i >= 0) this.timelines.splice(i, 1);
  }
  /* reactive tween from current values */
  to(target, props, opt = {}) {
    const nodes = this.resolve(target);
    const dur = this.reduced ? 0 : opt.duration ?? 0.3;
    for (const tl2 of this.timelines) if (tl2.reactive && !tl2.done) {
      for (const [k, tr] of tl2.tracks) if (nodes.includes(tr.node) && tr.prop in props) tl2.tracks.delete(k);
    }
    const tl = new Timeline(this, { reactive: true, start: this.time + (opt.delay || 0) });
    tl.to(nodes, props, { ...opt, duration: dur, ease: opt.ease ?? "out" }, 0);
    this.timelines.push(tl);
    this._wake();
    return tl;
  }
  /* per-frame function fn(time, dt, scene); return handle with stop() */
  loop(fn) {
    const b = { fn, stopped: false, stop: () => {
      b.stopped = true;
      this.behaviors = this.behaviors.filter((x) => x !== b);
    } };
    this.behaviors.push(b);
    this._wake();
    return b;
  }
  /* time at which every finite timeline has finished (rest pose for reduced motion / posters) */
  settleTime() {
    let t = 0;
    for (const tl of this.timelines) if (tl.repeat >= 0 && !tl.reactive) t = Math.max(t, tl.start + tl.total);
    return t;
  }
  play() {
    this.playing = true;
    this._wake();
    return this;
  }
  pause() {
    this.playing = false;
    return this;
  }
  toggle() {
    return this.playing ? this.pause() : this.play();
  }
  /* jump to absolute time (timelines and behaviours are functions of time) */
  seek(t) {
    for (const tl of this.timelines) {
      tl.reset();
      if (tl.lastT !== null) tl.lastT = null;
    }
    this.time = t;
    this.update(0, true);
    return this;
  }
  reset() {
    return this.seek(0);
  }
  tick(dt) {
    if (this.destroyed) return;
    if (this.needsRender) {
      this.render();
    }
    if (!this.built) return;
    if (this.playing) this.time += dt * this.timeScale;
    this.update(dt);
    this.emit("tick", this.time);
  }
  _wantsFrame() {
    if (this.destroyed || !this.visible) return false;
    if (this.needsRender || this.pending.size) return true;
    if (!this.playing) return false;
    return this.behaviors.length > 0 || this.flows && this.flows.length > 0 || this.timelines.some((t) => !t.done && !t.paused);
  }
  _wake() {
    clock.kick();
  }
  _touch(n) {
    this.pending.add(n);
    clock.kick();
  }
  update(dt = 0, seeking = false) {
    for (const n of this.touchedA) {
      const a = n.a;
      a.x = a.y = a.z = 0;
      a.scale = a.opacity = 1;
      n.moved = true;
      this.pending.add(n);
    }
    this.touchedA.clear();
    for (const tl of this.timelines.slice()) {
      tl.apply(this.time);
      if (tl.done && tl.reactive) this._removeTimeline(tl);
    }
    for (const b of this.behaviors.slice()) if (!b.stopped) b.fn(this.time, dt, this);
    if (this.flows) for (const el of this.flows) {
      const sp = +el.getAttribute("data-flow") || 0;
      el.style.strokeDashoffset = fmt(-sp * this.time);
    }
    this.sync();
  }
  /* additive offset helper for behaviours */
  nudge(node, key, value) {
    if (key === "scale" || key === "opacity") node.a[key] *= value;
    else node.a[key] += value;
    node.moved = true;
    this.touchedA.add(node);
    this.pending.add(node);
  }
  /* push node changes to the DOM */
  sync() {
    if (!this.built || !this.pending.size) {
      this.pending.clear();
      return;
    }
    const v = this.view, place = /* @__PURE__ */ new Set();
    const nodes = Array.from(this.pending);
    this.pending.clear();
    const dirty = nodes.filter((n) => n.dirty && n.el !== void 0);
    const isCovered = (n) => {
      let p = n.parent;
      while (p) {
        if (p.dirty && dirty.includes(p)) return true;
        p = p.parent;
      }
      return false;
    };
    for (const n of dirty) {
      if (isCovered(n)) continue;
      if (n.isGroup && n.flat) {
        this._rerenderFlat(n, place);
        continue;
      }
      if (!n.el) continue;
      const html = n.content(v, n.frame);
      n.el.innerHTML = html;
      if (n.isGroup) {
        this._mapEls(n.el);
        const c = this._containers.get(n);
        if (c) c.stale = true;
      } else if (this.flows && n.el.querySelector("[data-flow]")) this.flows = Array.from(this.svg.querySelectorAll("[data-flow]"));
      n.restyle = true;
      n.sync(v);
      place.add(n);
    }
    for (const n of nodes) {
      if (n.isGroup && n.flat) {
        if (n.moved || n.restyle) for (const it of n.items()) {
          it.sync(v);
          place.add(it);
        }
        n.moved = false;
        n.restyle = false;
        continue;
      }
      if (n.moved || n.restyle) {
        n.sync(v);
        if (n.moved) place.add(n);
        n.moved = false;
      }
    }
    const containers = /* @__PURE__ */ new Map();
    for (const n of place) {
      let cur = n;
      for (; ; ) {
        const c = containerOf(cur);
        if (!c) break;
        if (!containers.has(c)) containers.set(c, /* @__PURE__ */ new Set());
        containers.get(c).add(cur);
        if (c === this.root || c.isGroup === false) break;
        c.rest = c.aabb();
        cur = c;
      }
    }
    for (const [c, movers] of containers) this._place(c, movers);
  }
  _rerenderFlat(g, place) {
    const v = this.view, cf = g.childFrame(g.frame || IDENTITY);
    for (const c of g.children) {
      if (c.isGroup && c.flat) {
        c.frame = cf;
        c.dirty = true;
        this._rerenderFlat(c, place);
        continue;
      }
      if (!c.el) continue;
      c.el.innerHTML = c.content(v, cf);
      if (c.isGroup) this._mapEls(c.el);
      c.sync(v);
      place.add(c);
    }
    g.dirty = false;
  }
  _place(container, movers) {
    if (container.sortMode === "none") return;
    let st = this._containers.get(container);
    const zs = this.view.ZS;
    if (!st || st.stale) {
      st = { dyn: /* @__PURE__ */ new Set(), slotOf: /* @__PURE__ */ new Map(), bySlot: /* @__PURE__ */ new Map(), placer: null, statics: null, stale: false, parent: container === this.root ? this.rootEl : container.el };
      this._containers.set(container, st);
    }
    if (!st.parent) return;
    let rebuild = !st.placer;
    for (const m of movers) if (!st.dyn.has(m)) {
      st.dyn.add(m);
      rebuild = true;
    }
    const touched = /* @__PURE__ */ new Set();
    const assign = (d) => {
      if (!d.el || d.el.parentNode !== st.parent) return;
      const slot = st.placer.slot(makeItem(d, d.sortBox(), zs, d.order));
      const old = st.slotOf.get(d);
      if (old === slot) {
        touched.add(slot);
        return;
      }
      if (old !== void 0) {
        const set2 = st.bySlot.get(old);
        if (set2) set2.delete(d);
        touched.add(old);
      }
      st.slotOf.set(d, slot);
      let set = st.bySlot.get(slot);
      if (!set) st.bySlot.set(slot, set = /* @__PURE__ */ new Set());
      set.add(d);
      touched.add(slot);
    };
    if (rebuild) {
      const order = (container.sorted || []).filter((n) => !st.dyn.has(n) && !n.hidden && n.el);
      st.statics = order.map((n) => makeItem(n, n.sortBox(), zs, n.order));
      st.placer = new Placer(st.statics);
      st.slotOf.clear();
      st.bySlot.clear();
      for (const d of st.dyn) assign(d);
    } else for (const m of movers) assign(m);
    for (const slot of touched) {
      const set = st.bySlot.get(slot);
      if (!set || !set.size) continue;
      let items = Array.from(set).map((d) => makeItem(d, d.sortBox(), zs, d.order));
      if (items.length === 2) items.sort(compareItems);
      else if (items.length > 2) items = depthSort(items);
      const refItem = st.statics[slot + 1];
      let next = refItem ? refItem.node.el : null;
      for (let i = items.length - 1; i >= 0; i--) {
        const el = items[i].node.el;
        if (el.nextSibling !== next) st.parent.insertBefore(el, next);
        next = el;
      }
    }
  }
  /* ── utilities ── */
  /* world point → CSS pixels relative to the SVG's top-left (for HTML overlays) */
  project(p) {
    const q = this.view.P(p[0], p[1], p[2] || 0), vb = this.vb;
    if (!this.svg || !vb) return { x: q[0], y: q[1] };
    const r = this.svg.getBoundingClientRect();
    const s = Math.min(r.width / vb[2], r.height / vb[3]);
    const ox = (r.width - vb[2] * s) / 2, oy = (r.height - vb[3] * s) / 2;
    return { x: ox + (q[0] - vb[0]) * s, y: oy + (q[1] - vb[1]) * s };
  }
  on(evt, fn) {
    (this.listeners[evt] || (this.listeners[evt] = [])).push(fn);
    return this;
  }
  emit(evt, arg) {
    (this.listeners[evt] || []).forEach((f) => f(arg, this));
  }
  setTheme(theme) {
    const old = "iso-" + this.opts.theme, nu = "iso-" + theme;
    if (this.svg) {
      this.svg.classList.remove(old);
      this.svg.classList.add(nu);
    }
    if (this.figure) {
      this.figure.el.classList.remove(old);
      this.figure.el.classList.add(nu);
    }
    this.opts.theme = theme;
    return this;
  }
  destroy() {
    this.destroyed = true;
    clock.remove(this);
    if (this._io) this._io.disconnect();
    if (this.svg) this.svg.remove();
    if (this.figure) this.figure.el.remove();
    this.emit("destroy");
  }
};
function containerOf(n) {
  let p = n.parent;
  while (p && p.flat) p = p.parent;
  return p;
}
function escAttr(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

// engine/src/paths.js
var Path = class _Path {
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
    let s = this.closed ? (u % 1 + 1) % 1 : Math.max(0, Math.min(1, u));
    const L = s * this.length, c = this.cum;
    let lo = 0, hi = c.length - 1;
    while (hi - lo > 1) {
      const m = lo + hi >> 1;
      if (c[m] <= L) lo = m;
      else hi = m;
    }
    const seg = c[hi] - c[lo] || 1;
    return { i: lo, t: (L - c[lo]) / seg };
  }
  /* point at normalised arc length u ∈ [0, 1] (wraps when closed) */
  at(u) {
    const { i, t } = this._seg(u), p = this.points;
    return v3.lerp(p[i], p[Math.min(i + 1, p.length - 1)], t);
  }
  tangent(u) {
    const { i } = this._seg(u), p = this.points;
    const a = p[i], b = p[Math.min(i + 1, p.length - 1)];
    return v3.norm(v3.sub(b, a));
  }
  /* heading in plan, degrees */
  heading(u) {
    const t = this.tangent(u);
    return Math.atan2(t[1], t[0]) / DEG;
  }
  reverse() {
    return new _Path(this.points.slice().reverse(), false);
  }
  offset(dx = 0, dy = 0, dz = 0) {
    return new _Path(this.points.map((p) => [p[0] + dx, p[1] + dy, p[2] + dz]), false);
  }
};
var path = {
  line: (a, b) => new Path([a, b]),
  polyline: (pts, opt = {}) => new Path(opt.radius ? filletPolyline(pts.map((p) => [p[0], p[1], p[2] || 0]), opt.radius) : pts, !!opt.closed),
  /* circle: {center:[x,y,z], r, start=0, ccw=false, n} */
  circle(o) {
    const [x, y, z] = o.center || [0, 0, 0], r = o.r || 10, n = o.n || 96, s = o.start || 0, dir = o.ccw ? -1 : 1;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (s + dir * (360 * i) / n) * DEG;
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a), z || 0]);
    }
    return new Path(pts, true);
  },
  arc(o) {
    const [x, y, z] = o.center || [0, 0, 0], r = o.r || 10, a0 = o.from ?? 0, a1 = o.to ?? 90;
    const n = o.n || Math.max(8, Math.ceil(Math.abs(a1 - a0) / 4)), pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (a0 + (a1 - a0) * i / n) * DEG;
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a), z || 0]);
    }
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
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = v3.lerp(a, b, t);
      p[2] += Math.sin(Math.PI * t) * height;
      pts.push(p);
    }
    return new Path(pts);
  },
  /* rounded rectangle loop on a plane: {at:[x,y,z], size:[w,d], r} (clockwise from the back corner) */
  rect(o) {
    const [x, y, z] = o.at || [0, 0, 0], [w, d] = o.size || [100, 100];
    return new Path(rrect(x, y, w, d, o.r || 0, 8).map((p) => [p[0], p[1], z || 0]), true);
  },
  join(...paths) {
    return new Path(paths.flatMap((p, i) => i ? p.points.slice(1) : p.points));
  }
};

// engine/src/figure.js
function figure(host, o = {}) {
  injectCSS();
  host = typeof host === "string" ? document.querySelector(host) : host;
  const fig = document.createElement("figure");
  fig.className = "iso-fig iso-" + (o.theme || "dark") + (o.class ? " " + o.class : "");
  const cap = (pos, text, live) => {
    const p = document.createElement("p");
    p.className = "iso-cap iso-cap-" + pos;
    if (live) p.setAttribute("aria-live", "polite");
    p.textContent = text || "";
    if (!text && !live) p.hidden = true;
    fig.appendChild(p);
    return p;
  };
  const caps = { tl: cap("tl", o.index), tr: cap("tr", o.title) };
  const stage = document.createElement("div");
  stage.className = "iso-stage";
  fig.appendChild(stage);
  caps.bl = cap("bl", o.hint);
  caps.br = cap("br", o.status, true);
  if (o.maxWidth) stage.style.maxWidth = typeof o.maxWidth === "number" ? o.maxWidth + "px" : o.maxWidth, stage.style.margin = "0 auto";
  host.appendChild(fig);
  return {
    el: fig,
    stage,
    caps,
    status(text) {
      caps.br.textContent = text;
      caps.br.hidden = false;
      return this;
    },
    caption(pos, text) {
      const c = caps[pos];
      if (c) {
        c.textContent = text;
        c.hidden = !text;
      }
      return this;
    }
  };
}

// engine/src/prefabs/basics.js
function install(define2) {
  define2("platform", (g, o) => {
    const [w, d] = o.size || [240, 180], h = o.h ?? 10, r = o.r ?? 12, inset = o.inset ?? 10;
    g.box({ at: [-w / 2, -d / 2, -h], size: [w, d, h], r, chamfer: o.chamfer ?? 3, material: o.material, color: o.color });
    if (inset) g.rect({ at: [-w / 2 + inset, -d / 2 + inset, 0], size: [w - 2 * inset, d - 2 * inset], r: Math.max(r - inset / 2, 2), line: "ln-faint" });
    if (o.grid) g.grid({ at: [-w / 2 + inset, -d / 2 + inset, 0], size: [w - 2 * inset, d - 2 * inset], step: o.grid });
    if (o.screws) {
      const m = inset + 6;
      for (const [x, y] of [[-w / 2 + m, -d / 2 + m], [w / 2 - m, -d / 2 + m], [-w / 2 + m, d / 2 - m], [w / 2 - m, d / 2 - m]]) g.circle({ at: [x, y, 0], r: 1.6, line: "ln-soft" });
    }
    if (o.label) g.text({ text: o.label, at: [-w / 2 + inset + 6, d / 2 - inset / 2 + 2, 0], plane: "top", size: o.labelSize || 6, cls: "tx tx-label", spacing: o.labelSpacing ?? 1.6 });
    if (o.labelRight) g.text({ text: o.labelRight, at: [w / 2 - inset / 2 - 2, d / 2 - inset - 6, 0], plane: "top-y", size: o.labelSize || 6, cls: "tx tx-label", spacing: o.labelSpacing ?? 1.6 });
  });
  define2("tree", (g, o) => {
    const kind = o.kind || "tiered", s = o.scale ?? 1, r = (o.r ?? 6) * s, h = (o.h ?? 20) * s;
    const trunkH = o.trunk ?? (kind === "bush" ? 0 : h * 0.22);
    if (trunkH > 0) g.cylinder({ at: [0, 0, 0], r: Math.max(0.6, r * 0.13), h: trunkH + (kind === "round" ? r * 0.5 : 0.5) });
    if (kind === "tiered") {
      const n = o.tiers ?? 3, step = (h - trunkH) / (n + 0.4);
      for (let i = 0; i < n; i++) {
        const rr = r * (1 - i * (0.55 / n));
        g.cylinder({ at: [0, 0, trunkH + i * step], r: rr, rTop: rr * 0.86, h: step * 0.62, chamfer: Math.min(0.8, step * 0.2) });
      }
      g.cone({ at: [0, 0, trunkH + n * step], r: r * 0.22, h: step * 0.5 });
    } else if (kind === "pine") {
      const n = o.tiers ?? 3;
      for (let i = 0; i < n; i++) g.cone({ at: [0, 0, trunkH + i * (h - trunkH) / (n + 1)], r: r * (1 - i * 0.22), h: (h - trunkH) * 1.9 / (n + 1) });
    } else if (kind === "cone") {
      g.cone({ at: [0, 0, trunkH], r, h: h - trunkH });
    } else if (kind === "round") {
      g.sphere({ at: [0, 0, trunkH + r], r });
    } else if (kind === "bush") {
      g.sphere({ at: [0, 0, r * 0.75], r });
    } else if (kind === "lollipop") {
      g.cylinder({ at: [0, 0, trunkH], r, h: r * 0.35, chamfer: r * 0.08 });
    }
  }, { sort: "none" });
  define2("forest", (g, o) => {
    const R = rng(o.seed ?? 3), n = o.count ?? 30, kinds = o.kinds || ["tiered"], s0 = o.minScale ?? 0.7, s1 = o.maxScale ?? 1.15;
    const pts = [];
    const minD = o.spacing ?? 9;
    for (let tries = 0; pts.length < n && tries < n * 40; tries++) {
      let x, y;
      if (o.ring) {
        const [ri, ro] = o.ring, a = R() * Math.PI * 2, rr = Math.sqrt(R() * (ro * ro - ri * ri) + ri * ri);
        x = Math.cos(a) * rr;
        y = Math.sin(a) * rr;
      } else {
        const [w, d] = o.size || [100, 100];
        x = (R() - 0.5) * w;
        y = (R() - 0.5) * d;
      }
      if (o.avoid && o.avoid(x, y)) continue;
      if (pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < minD)) continue;
      pts.push([x, y]);
    }
    for (const [x, y] of pts) g.tree({ at: [x, y, 0], kind: R.pick(kinds), scale: R.range(s0, s1), r: o.r, h: o.h, material: o.material, class: o.treeClass || "tree" });
  }, { flat: true });
  define2("plant", (g, o) => {
    const r = o.r ?? 5, h = o.h ?? 8;
    g.cylinder({ at: [0, 0, 0], r: r * 0.78, rTop: r, h, chamfer: 0.6 });
    g.circle({ at: [0, 0, h], r: r - 1, fill: "f-dark", line: null });
    const R = rng(o.seed ?? 5);
    for (let i = 0; i < (o.leaves ?? 4); i++) {
      const a = R() * Math.PI * 2, rr = R() * r * 0.4;
      g.sphere({ at: [Math.cos(a) * rr, Math.sin(a) * rr, h + r * (0.6 + i * 0.35)], r: r * (0.75 - i * 0.08) });
    }
  }, { sort: "none" });
  define2("lamp", (g, o) => {
    const h = o.h ?? 46;
    g.cylinder({ at: [0, 0, 0], r: 4, h: 2, chamfer: 0.6 });
    g.cylinder({ at: [0, 0, 2], r: 0.8, h: h - 6 });
    g.box({ center: [0, 0, h - 4], size: [9, 5, 3], r: 1.2 });
    g.box({ id: o.id ? o.id + "-bulb" : void 0, class: "lamp-bulb", center: [0, 0, h - 4.6], size: [6, 3, 0.6], r: 0.8, material: o.on === false ? void 0 : "lit", glow: o.on !== false });
  }, { sort: "none" });
  define2("pin", (g, o) => {
    const h = o.h ?? 18, r = o.r ?? 5;
    if (o.shadow !== false) g.circle({ at: [0, 0, 0], r: r * 0.7, fill: "f-dark", line: "ln-faint" });
    g.cylinder({ at: [0, 0, 0], r: 0.01, rTop: r * 0.62, h: h - r * 0.8 });
    g.sphere({ at: [0, 0, h], r, material: o.material || (o.lit ? "lit" : void 0), glow: !!o.lit });
  }, { sort: "none" });
  define2("zone", (g, o) => {
    const [w, d] = o.size || [120, 80], r = o.r ?? 8;
    g.rect({ at: [-w / 2, -d / 2, o.z || 0], size: [w, d], r, fill: o.fill === void 0 ? null : o.fill, line: o.line || "ln-soft", dash: o.dash ?? "4 4" });
    if (o.label) g.text({ text: o.label, at: [-w / 2 + 6, d / 2 - 6, o.z || 0], plane: "top", size: o.labelSize || 6, cls: "tx tx-label", spacing: 1.4 });
  }, { sort: "none", flatish: true });
  define2("plaque", (g, o) => {
    const text = String(o.text || ""), size = o.size || 6, w = o.w ?? text.length * size * 0.62 + 10, d = o.d ?? size + 7;
    g.box({ at: [-w / 2, -d / 2, 0], size: [w, d, o.h ?? 1.5], r: 1.5, material: o.material });
    g.text({ text, at: [-w / 2 + 5, d / 2 - (d - size * 0.72) / 2, o.h ?? 1.5], plane: "top", size, cls: o.cls || "tx tx-label", spacing: 1 });
  }, { sort: "none" });
  define2("desk", (g, o) => {
    const [w, d] = o.size || [90, 46], h = o.h ?? 34, t = 3, leg = 2.4;
    for (const [x, y] of [[-w / 2 + 3, -d / 2 + 3], [w / 2 - 3 - leg, -d / 2 + 3], [-w / 2 + 3, d / 2 - 3 - leg], [w / 2 - 3 - leg, d / 2 - 3 - leg]]) g.box({ at: [x, y, 0], size: [leg, leg, h - t] });
    g.box({ at: [-w / 2, -d / 2, h - t], size: [w, d, t], r: 2, chamfer: 0.8, material: o.material });
  });
  define2("car", (g, o) => {
    const L = o.length ?? 22, w = o.w ?? 11;
    for (const [x, y] of [[-L / 2 + 3, -w / 2 - 0.4], [L / 2 - 7, -w / 2 - 0.4], [-L / 2 + 3, w / 2 - 1.6], [L / 2 - 7, w / 2 - 1.6]]) g.box({ at: [x, y, 0], size: [4, 2, 3.4], r: 0.8, material: "dark" });
    g.box({ at: [-L / 2, -w / 2, 1.4], size: [L, w, 4], r: 2.5, chamfer: 0.6, material: o.material, color: o.color });
    g.box({
      at: [-L / 2 + 5, -w / 2 + 1, 5.4],
      size: [L * 0.5, w - 2, 3.4],
      r: 2,
      material: o.material,
      color: o.color,
      left: (f) => f.rect(1, 0.6, f.w - 2, f.h - 1.4, { r: 0.6, fill: "f-screen", line: null }),
      right: (f) => f.rect(1, 0.6, f.w - 2, f.h - 1.4, { r: 0.6, fill: "f-screen", line: null })
    });
  });
  define2("solar", (g, o) => {
    const w = o.w ?? 22, d = o.d ?? 14;
    g.box({ center: [0, 0, 0], size: [2, 2, 4] });
    g.box({ at: [-w / 2, -d / 2, 4], size: [w, d, 1.2], r: 0.6, material: "dark", top: (f) => f.grid(1, 1, w - 2, d - 2, 4, 3, { gap: 0.6, line: "ln-faint" }) });
  });
  define2("bench", (g, o) => {
    const w = o.w ?? 30;
    g.box({ at: [-w / 2 + 2, -3, 0], size: [2, 6, 5] });
    g.box({ at: [w / 2 - 4, -3, 0], size: [2, 6, 5] });
    g.box({ at: [-w / 2, -4, 5], size: [w, 8, 1.6], r: 0.8 });
  });
}

// engine/src/prefabs/icons.js
var ICONS = {
  database: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  server: "M4 4h16v6H4zM4 14h16v6H4zM7.5 7h.01M7.5 17h.01M11 7h5M11 17h5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2.1.6 3.5 2.4 3.5 5.2",
  lock: "M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2",
  cloud: "M7 18h10.5a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.3 9 4.5 4.5 0 0 0 7 18Z",
  bolt: "M13 3 5 14h6l-1 7 8-11h-6l1-7Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z",
  code: "M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16",
  terminal: "M3.5 5h17v14h-17zM7 9.5l3 2.5-3 2.5M12 15h5",
  cpu: "M7 7h10v10H7zM10 10h4v4h-4zM9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5",
  mail: "M3 6h18v12H3zM3.5 6.5l8.5 6 8.5-6",
  chart: "M4 20V11M10 20V5M16 20v-6M2.5 20h19",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1",
  key: "M8 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h9M18 12v3M21 12v2",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  search: "M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM15.5 15.5 21 21",
  cart: "M2.5 4h2.5l2.5 11h11l2-8H6.3M9 19.5h.01M17.5 19.5h.01",
  shield: "M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3ZM8.5 12l2.5 2.5 4.5-5",
  layers: "M12 3 2.5 8 12 13l9.5-5L12 3ZM2.5 12.5 12 17.5l9.5-5M2.5 16.5 12 21.5l9.5-5",
  queue: "M4 6h16M4 12h16M4 18h10",
  plug: "M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4",
  spark: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z",
  phone: "M8 2.5h8a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1ZM11 18.5h2",
  wifi: "M2.5 9a14 14 0 0 1 19 0M5.8 12.5a9.5 9.5 0 0 1 12.4 0M9 16a5 5 0 0 1 6 0M12 19.5h.01",
  check: "M5 12.5l4.5 4.5L19 7",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0",
  play: "M8 5v14l11-7L8 5Z",
  box: "M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9L12 3ZM3.5 7.5 12 12l8.5-4.5M12 12v9",
  card: "M3 6h18v12H3zM3 10h18M6.5 14.5h4",
  pin: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  eye: "M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2",
  flow: "M5 6.5a2.5 2.5 0 1 0 0-.01M19 17.5a2.5 2.5 0 1 0 0-.01M7.5 6.5H13a3 3 0 0 1 3 3v5a3 3 0 0 0 3 3"
};
var MARK = "M3 3h3v3H3zM4 2h1v1H4zM6 4h1v1H6zM4 6h1v1H4zM2 4h1v1H2zM4 1h1v1H4zM7 4h1v1H7zM4 7h1v1H4zM1 4h1v1H1zM4 0h1v1H4zM8 4h1v1H8zM4 8h1v1H4zM0 4h1v1H0zM2 2h1v1H2zM6 2h1v1H6zM6 6h1v1H6zM2 6h1v1H2z";
function icon(name, cls = "ln-strong") {
  const d = ICONS[name] || name;
  return '<path class="' + cls + '" d="' + d + '"/>';
}

// engine/src/prefabs/devices.js
function screen(f, mode = "off", o = {}) {
  const pad = o.pad ?? 0.9, r = o.r ?? 1.6;
  const w = f.w - 2 * pad, h = f.h - 2 * pad;
  if (mode === "lit") {
    f.rect(pad, pad, w, h, { r, fill: "f-lit", line: "ln-soft" });
    return;
  }
  f.rect(pad, pad, w, h, { r, fill: mode === "off" ? "f-screen" : "f-screen", line: "ln-soft" });
  if (mode === "ui") {
    const cols = o.cols ?? 4, rows = o.rows ?? 5, gx = w * 0.14, top = h * 0.2;
    f.grid(pad + gx, pad + top, w - 2 * gx, h * 0.62, cols, rows, { gap: Math.min(w, h) * 0.08, r: 0.6, fill: "f-soft", line: null });
  } else if (mode === "dots") {
    for (let j = 0; j < 7; j++) for (let i = 0; i < 4; i++) f.circle(pad + w * (0.2 + i * 0.2), pad + h * (0.2 + j * 0.1), 0.35, { fill: "f-soft", line: null, n: 6 });
  } else if (mode === "mark") {
    const s = Math.min(w, h) * 0.45 / 9;
    f.svg('<path class="f-lit" d="' + MARK + '"/>', { u: pad + w / 2 - 4.5 * s, v: pad + h / 2 - 4.5 * s, transform: "scale(" + fmt(s) + ")" });
  }
}
function install2(define2) {
  define2("phone", (g, o) => {
    const w = o.w ?? 13, h = o.h ?? 27, t = o.t ?? 1.6, r = o.r ?? 2.2, mode = o.screen || "ui";
    let z = 0;
    if (o.stand) {
      g.box({ center: [0, 0, 0], size: [w * 0.75, 7, 2.2], r: 1.2, chamfer: 0.5 });
      z = 2.2;
    }
    if (o.lying) {
      g.panel({ plane: "top", at: [-w / 2, -h / 2, t], w, h, t, r, front: (f) => {
        screen(f, mode, { r: r - 0.6 });
        f.rect(w / 2 - 2, 1.6, 4, 1, { r: 0.5, fill: "f-ink", line: null });
      } });
      return;
    }
    g.panel({
      plane: "left",
      at: [-w / 2, t / 2, z],
      w,
      h,
      t,
      r,
      material: o.material,
      front: (f) => {
        screen(f, mode, { r: r - 0.6 });
        f.rect(w / 2 - 2, 1.7, 4, 1.1, { r: 0.55, fill: mode === "lit" ? "f-ink" : "f-bg", line: null });
      }
    });
  }, { sort: "none" });
  define2("card", (g, o) => {
    const w = o.w ?? 16, d = o.d ?? 10, t = o.t ?? 1.2, lit = o.lit !== false;
    g.box({
      center: [0, 0, 0],
      size: [w, d, t],
      r: o.r ?? 1.2,
      material: lit ? "lit" : o.material,
      glow: o.glow ?? lit,
      top: (f) => {
        f.rect(2, 2.2, 3.4, 2.6, { r: 0.6, line: "ln-soft" });
        f.line(2, d - 2.4, w * 0.55, d - 2.4, "ln-soft");
      }
    });
  }, { sort: "none" });
  define2("laptop", (g, o) => {
    const w = o.w ?? 40, d = o.d ?? 28, t = 2.2, lt = 1.2, ang = (o.open ?? 105) * Math.PI / 180, L = d * 0.92;
    g.box({
      at: [-w / 2, -d / 2, 0],
      size: [w, d, t],
      r: 1.6,
      chamfer: 0.5,
      material: o.material,
      top: (f) => {
        f.grid(4, 3.5, w - 8, d * 0.42, 12, 4, { gap: 0.8, r: 0.3, line: "ln-faint" });
        f.rect(w / 2 - 7, d * 0.58, 14, d * 0.3, { r: 1, line: "ln-faint" });
      }
    });
    const dir = [0, Math.cos(ang), Math.sin(ang)], back = [0, -Math.sin(ang) * lt, Math.cos(ang) * lt];
    const hinge = [-w / 2, -d / 2 + lt, t];
    g.slab({ origin: hinge, u: [w, 0, 0], v: [dir[0] * L, dir[1] * L, dir[2] * L], w: [back[0], back[1], back[2]], material: o.material });
    const mode = o.screen || "ui";
    g.custom({
      bounds: [-w / 2, -d / 2, t, w / 2, -d / 2 + lt, t + L],
      draw: (dd) => {
        const top = [hinge[0], hinge[1] + dir[1] * L, hinge[2] + dir[2] * L];
        const f = Face.local(dd, top, [1, 0, 0], [0, -dir[1], -dir[2]], w, L);
        const s = f.sub(1.8, 1.8, w - 3.6, L - 3.6);
        screen(s, mode, { r: 1, pad: 0, cols: 6, rows: 3 });
      }
    });
  }, { sort: "none" });
  define2("monitor", (g, o) => {
    const w = o.w ?? 48, h = o.h ?? 30, t = 2;
    g.box({ center: [0, -2, 0], size: [16, 10, 1.6], r: 2, chamfer: 0.5 });
    g.box({ center: [0, -3.5, 1.6], size: [4, 2, 10], r: 0.8 });
    g.panel({ plane: "left", at: [-w / 2, 0, 8], w, h, t, r: 1.6, material: o.material, front: (f) => screen(f, o.screen || "ui", { r: 1, cols: 6, rows: 3, pad: 1.4 }) });
  }, { sort: "none" });
  define2("keyboard", (g, o) => {
    const w = o.w ?? 186, d = o.d ?? 52, h = o.h ?? 7;
    buildKeyboard(g, { x: -w / 2, y: -d / 2, z: 0, w, d, h, id: o.id });
    return keyboardAPI(g);
  }, { sort: "none" });
  define2("deskComputer", (g, o) => {
    const ox = -138, oy = -114;
    const X = (x) => x + ox, Y = (y) => y + oy;
    const BASE = { w: 276, d: 228, h: 14 }, BODY = { x: 70, y: 24, w: 130, d: 118, h: 168, z: 14 }, KB = { x: 40, y: 162, w: 186, d: 52, h: 7, z: 14 };
    const YF = Y(BODY.y + BODY.d), XR = X(BODY.x + BODY.w), z0 = BODY.z;
    if (o.base !== false) {
      g.group({ id: o.id ? o.id + "-base" : void 0, sort: "none" }, (b) => {
        b.box({ at: [X(0), Y(0), 0], size: [BASE.w, BASE.d, BASE.h], r: 12, chamfer: 3 });
        b.rect({ at: [X(11), Y(11), BASE.h], size: [BASE.w - 22, BASE.d - 22], r: 6, line: "ln-soft" });
        for (const [cx, cy] of [[18, 18], [BASE.w - 18, 18], [18, BASE.d - 18], [BASE.w - 18, BASE.d - 18]]) b.circle({ at: [X(cx), Y(cy), BASE.h], r: 1.7, line: "ln-soft" });
      });
    }
    const bx = X(BODY.x + 11), bz = z0 + 56;
    const body = g.box({
      id: o.id ? o.id + "-body" : void 0,
      at: [X(BODY.x), Y(BODY.y), z0],
      size: [BODY.w, BODY.d, BODY.h],
      r: 10,
      chamfer: 3,
      top: (f) => f.rect(22, 50, BODY.w - 44, 8, { r: 4, line: "ln-soft" }),
      left: (f) => {
        f.rect(11, BODY.h - 56 - 90, 108, 90, { r: 9, fill: "f-bevel", line: "ln-soft" });
        f.vlines(13, BODY.h - 36, 8 * 3.3 - 3.3, 22, 8);
        f.rect(72, BODY.h - 24 - 7, 48, 7, { r: 3.5, line: "ln-soft" });
        f.line(78, BODY.h - 27.5, 114, BODY.h - 27.5);
      },
      right: (f) => {
        f.vlines(62, BODY.h - 148, 8 * 3.6, 44, 9);
        f.rect(98, BODY.h - 38, 11, 20, { r: 2, line: "ln-soft" });
        f.line(103.5, BODY.h - 36, 103.5, BODY.h - 28);
      }
    });
    const scr = g.pane({
      id: o.id ? o.id + "-screen" : void 0,
      plane: "left",
      at: [bx + 6, YF, bz + 6 + 78],
      w: 96,
      h: 78,
      fill: false,
      line: false,
      power: 0,
      text: "",
      cursor: true,
      logo: o.logo,
      draw: (f, n) => drawCRT(f, n)
    });
    const led = g.pane({ id: o.id ? o.id + "-led" : void 0, plane: "left", at: [X(BODY.x + 14), YF, z0 + 45], w: 3, h: 3, r: 1.5, fill: "f-soft", line: null });
    g.box({ at: [XR, YF - 52, z0 + 8], size: [7, 9, 7], r: 2, n: 3 });
    const kb = g.group({ id: o.id ? o.id + "-keyboard" : void 0, sort: "none" }, (k) => buildKeyboard(k, { x: X(KB.x), y: Y(KB.y), z: KB.z, w: KB.w, d: KB.d, h: KB.h, id: o.id }));
    g.helix({ a: [XR + 7, YF - 47.5, z0 + 11.5], b: [X(KB.x + KB.w + 2), Y(KB.y + 12), KB.z + 5], r: 2.6, turns: 15 });
    g.box({ at: [X(KB.x + KB.w), Y(KB.y + 9), KB.z + 2], size: [4, 6, 5], r: 1.6, n: 3 });
    const state = { on: false, text: "", count: 0, last: "" };
    const status = () => {
      if (o.onStatus) o.onStatus(state.on ? "on \xB7 " + state.count + " chars" + (state.last ? " \xB7 key " + state.last : "") : "off", state);
    };
    const kapi = keyboardAPI(kb);
    return {
      state,
      screenNode: scr,
      body,
      keyboard: kb,
      onMount(scene2) {
        scene2.loop((t) => {
          if (scr.opts.power >= 1) scr.set("cursor", Math.floor(t * 1.9) % 2 === 0);
        });
        status();
      },
      power(on = !state.on) {
        const s = this.scene;
        state.on = on;
        if (!on) {
          state.text = "";
          state.count = 0;
          state.last = "";
          scr.set("text", "");
        }
        led.set("fill", on ? "f-lit" : "f-soft");
        led.set("glow", on);
        if (s) s.to(scr, { power: on ? 1 : 0 }, { duration: on ? 1.1 : 0.32, ease: "linear" });
        else scr.set("power", on ? 1 : 0);
        this.set("pressed", on);
        status();
        return this;
      },
      type(key) {
        if (!state.on) return this;
        state.last = key === " " ? "space" : key;
        if (key.length === 1) {
          state.text += key;
          state.count++;
        } else if (key === "Backspace") state.text = state.text.slice(0, -1);
        else if (key === "Enter") state.text = "";
        scr.set("text", state.text);
        status();
        return this;
      },
      press: kapi.press
    };
  }, { sort: "none" });
  define2("server", (g, o) => {
    const w = o.w ?? 28, d = o.d ?? 34, h = o.h ?? 64, units = o.units ?? 6, R = rng(o.seed ?? 2);
    const uh = (h - 8) / units;
    g.box({
      at: [-w / 2, -d / 2, 0],
      size: [w, d, h],
      r: 2,
      chamfer: 1,
      material: o.material,
      left: (f) => {
        for (let i = 0; i < units; i++) {
          const v = 4 + i * uh;
          f.rect(3, v + 0.8, w - 6, uh - 1.6, { r: 0.8, fill: "f-bevel", line: "ln-soft" });
          f.hlines(w * 0.45, v + uh * 0.3, w * 0.38, uh * 0.4, 3, "ln-faint");
        }
      },
      right: (f) => {
        f.vlines(5, 8, d - 10, h * 0.35, 10, "ln-faint");
      },
      top: (f) => f.rect(3, 3, w - 6, d - 6, { r: 1, line: "ln-faint" })
    });
    for (let i = 0; i < units; i++) {
      const v = 4 + i * uh;
      for (let k = 0; k < 2; k++) {
        g.pane({ id: o.id ? o.id + "-led-" + i + "-" + k : void 0, class: "led", plane: "left", at: [-w / 2 + 5.5 + k * 3.2, d / 2 + 0.05, h - v - uh * 0.5 + 0.8], w: 1.6, h: 1.6, r: 0.8, fill: R() < 0.6 ? "f-lit" : "f-soft", line: null });
      }
    }
  }, { sort: "none" });
  define2("database", (g, o) => {
    const r = o.r ?? 16, tiers = o.tiers ?? 3, th = o.tierH ?? 8, gap = o.gap ?? 1.6;
    for (let i = 0; i < tiers; i++) g.cylinder({ at: [0, 0, i * (th + gap)], r, h: th, chamfer: 0.8, material: o.material, bands: o.bands, rings: i === tiers - 1 ? [r * 0.55] : void 0 });
  }, { sort: "none" });
  define2("chip", (g, o) => {
    const s = o.size ?? 30, n = o.pins ?? 6, t = o.h ?? 3;
    const pitch = s / (n + 1);
    for (let i = 1; i <= n; i++) {
      const p = -s / 2 + i * pitch - 0.9;
      g.box({ at: [p, -s / 2 - 2.6, 0.4], size: [1.8, 2.6, 0.8] });
      g.box({ at: [-s / 2 - 2.6, p, 0.4], size: [2.6, 1.8, 0.8] });
      g.box({ at: [p, s / 2, 0.4], size: [1.8, 2.6, 0.8] });
      g.box({ at: [s / 2, p, 0.4], size: [2.6, 1.8, 0.8] });
    }
    g.box({ at: [-s / 2, -s / 2, 0], size: [s, s, t], r: 1.5, chamfer: 0.6, material: o.material });
    const ds = s * 0.56;
    g.box({
      at: [-ds / 2, -ds / 2, t],
      size: [ds, ds, 1.4],
      r: 1,
      material: o.die || (o.lit ? "lit" : "dark"),
      glow: !!o.lit,
      top: o.label ? (f) => f.text(o.label, ds / 2, ds / 2 + 1.6, { size: Math.min(4.5, ds / o.label.length * 1.4), anchor: "middle", cls: o.lit ? "tx-strong" : "tx" }) : void 0
    });
  });
  define2("router", (g, o) => {
    const w = o.w ?? 34, d = o.d ?? 20, h = o.h ?? 6;
    g.box({ at: [-w / 2, -d / 2, 0], size: [w, d, h], r: 2.5, chamfer: 0.8, material: o.material, top: (f) => f.hlines(w * 0.3, d * 0.3, w * 0.4, d * 0.4, 4, "ln-faint") });
    for (const x of [-w / 2 + 4, w / 2 - 4]) g.cylinder({ at: [x, -d / 2 + 3, h], r: 0.9, h: 16 });
    for (let i = 0; i < 4; i++) g.pane({ class: "led", plane: "left", at: [-w / 2 + 6 + i * 4, d / 2 + 0.05, h * 0.62], w: 1.6, h: 1.2, r: 0.5, fill: "f-lit", line: null });
  }, { sort: "none" });
}
function chars(s) {
  return s.split("").map((c) => [c, 1]);
}
var ROWS = [
  [["`", 1]].concat(chars("1234567890-="), [["backspace", 2]]),
  [["tab", 1.5]].concat(chars("qwertyuiop[]"), [["\\", 1.5]]),
  [["capslock", 1.75]].concat(chars("asdfghjkl;'"), [["enter", 2.25]]),
  [["shift", 2.25]].concat(chars("zxcvbnm,./"), [["shift", 2.75]]),
  [["control", 1.25], ["alt", 1.25], ["meta", 1.25], ["space", 7.5], ["meta", 1.25], ["alt", 1.25], ["control", 1.25]]
];
function buildKeyboard(g, K) {
  if (K.w < 120) {
    g.box({
      at: [K.x, K.y, K.z],
      size: [K.w, K.d, K.h],
      r: Math.min(3, K.d / 4),
      chamfer: 0.6,
      top: (f) => {
        const p = Math.max(1.4, K.d * 0.12);
        f.grid(p, p, K.w - 2 * p, K.d - 2 * p, 14, 4, { gap: Math.max(0.4, K.d * 0.04), r: 0.4, fill: "f-key", line: "ln-faint" });
      }
    });
    return;
  }
  g.box({ at: [K.x, K.y, K.z], size: [K.w, K.d, K.h], r: 6, chamfer: 1.5, top: (f) => f.rect(5, 5, K.w - 10, K.d - 10, { r: 3, line: "ln-soft" }) });
  const top = K.z + K.h, unit = (K.w - 12) / 15, pitch = (K.d - 12) / 5, k0x = K.x + 6, k0y = K.y + 6;
  ROWS.forEach((row, ri) => {
    let x = k0x;
    row.forEach(([name, kw]) => {
      const w = kw * unit - 1.8;
      g.box({
        id: (K.id ? K.id + "-" : "") + "key-" + name + (g.find((n) => n.id === (K.id ? K.id + "-" : "") + "key-" + name) ? "-2" : ""),
        class: "key",
        key: name,
        at: [x + 0.9, k0y + ri * pitch + 0.8, top],
        size: [w, pitch - 1.8, 3],
        r: 1.3,
        chamfer: 0.7,
        n: 2,
        tone: { top: "f-key" }
      });
      x += kw * unit;
    });
  });
}
function keyboardAPI(kb) {
  return {
    press(name, down = true) {
      const s = kb.scene;
      kb.findAll((n) => n.opts.key === name).forEach((k) => {
        k.set("material", down ? "paper" : void 0);
        if (s) s.to(k, { z: down ? -1.4 : 0 }, { duration: 0.06, ease: "outQuad" });
        else k.set("z", down ? -1.4 : 0);
      });
    }
  };
}
function drawCRT(f, n) {
  const o = n.opts, w = f.w, h = f.h, p = o.power || 0, id = "crt" + n.uid;
  f.rect(0, 0, w, h, { r: 6, fill: "f-screen", line: "ln" });
  if (p <= 0) return;
  const lineP = Math.min(1, p / 0.16), openP = Math.max(0, Math.min(1, (p - 0.16) / 0.34)), easeO = 1 - Math.pow(1 - openP, 3);
  const flash = openP < 1 ? 0.55 * (1 - openP) : Math.max(0, 0.25 - (p - 0.5) * 0.6);
  const hh = Math.max(1.2, h * easeO), y0 = (h - hh) / 2;
  let s = '<defs><clipPath id="' + id + 'c"><rect x="0" y="' + fmt(y0) + '" width="' + w + '" height="' + fmt(hh) + '" rx="6"/></clipPath><radialGradient id="' + id + 'g" cx="50%" cy="42%" r="62%"><stop offset="0" style="stop-color:var(--iso-lit);stop-opacity:.16"/><stop offset="1" style="stop-color:var(--iso-lit);stop-opacity:0"/></radialGradient></defs>';
  if (openP <= 0) {
    const lw = w * (0.15 + 0.85 * lineP);
    s += '<path class="ln-lit" d="M' + fmt((w - lw) / 2) + " " + fmt(h / 2) + "H" + fmt((w + lw) / 2) + '" style="filter:drop-shadow(0 0 2px var(--iso-glow))"/>';
    f.svg(s);
    return;
  }
  s += '<g clip-path="url(#' + id + 'c)">';
  s += '<rect class="f-screen-on" x="0" y="0" width="' + w + '" height="' + h + '"/>';
  s += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/>';
  if (openP > 0.4) {
    const a = Math.min(1, (openP - 0.4) / 0.6);
    const logo = o.logo || MARK, logoIsPath = /^M/.test(logo);
    s += '<g style="opacity:' + fmt(a) + '">';
    s += logoIsPath ? '<path class="f-lit" transform="translate(31.8 12) scale(3.6)" d="' + logo + '" style="filter:drop-shadow(0 0 2.5px var(--iso-glow))"/>' : logo;
    const shown = (o.text || "").slice(-17);
    s += '<text class="tx-lit" x="9" y="60" font-size="6" style="white-space:pre">&gt; ' + esc2(shown) + "</text>";
    if (o.cursor && p >= 1) s += '<rect class="f-lit" x="' + fmt(9 + (2 + shown.length) * 3.62) + '" y="54.6" width="3.2" height="6.2"/>';
    s += "</g>";
  }
  if (flash > 0) s += '<rect class="f-lit" x="0" y="0" width="' + w + '" height="' + h + '" style="opacity:' + fmt(flash) + '"/>';
  s += "</g>";
  if (openP < 1) {
    s += '<path class="ln-lit" d="M0 ' + fmt(y0) + "H" + w + "M0 " + fmt(y0 + hh) + "H" + w + '" style="opacity:' + fmt(1 - openP) + '"/>';
  }
  f.svg(s);
}
function esc2(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
}

// engine/src/prefabs/architecture.js
function install3(define2, Iso2) {
  define2("building", (g, o) => {
    const w = o.w ?? 40, d = o.d ?? 32, h = o.h ?? 60, floors = o.floors ?? Math.max(2, Math.round(h / 10));
    const R = rng(o.seed ?? 11), lit = o.lit ?? 0.12, win = o.windows || "grid";
    const each = () => R() < lit ? { fill: "f-lit" } : null;
    const facade = (f, cols) => {
      const top = 5, bot = o.door ? 9 : 4;
      if (win === "bands") {
        for (let i = 0; i < floors; i++) {
          const v = top + i * (f.h - top - bot) / floors;
          f.rect(3, v + 1, f.w - 6, (f.h - top - bot) / floors - 3, { r: 0.6, fill: "f-screen", line: "ln-faint" });
        }
        return;
      }
      f.grid(3, top, f.w - 6, f.h - top - bot, cols, floors, { gap: 1.6, r: 0.4, fill: "f-screen", line: "ln-faint", each });
      if (o.door) f.rect(f.w / 2 - 3, f.h - 8, 6, 8, { r: 0.8, fill: "f-dark", line: "ln-soft" });
    };
    g.box({
      at: [-w / 2, -d / 2, 0],
      size: [w, d, h],
      r: o.r ?? 1,
      chamfer: o.chamfer ?? 1,
      material: o.material,
      color: o.color,
      left: (f) => facade(f, Math.max(2, Math.round(w / 7))),
      right: (f) => facade(f, Math.max(2, Math.round(d / 7))),
      top: (f) => f.rect(2, 2, w - 4, d - 4, { r: 0.6, line: "ln-faint" })
    });
    if (o.roof !== false) {
      g.box({ at: [-w / 2 + w * 0.15, -d / 2 + d * 0.2, h], size: [w * 0.3, d * 0.28, 4], r: 0.8 });
      if (o.antenna) g.cylinder({ at: [w * 0.25, d * 0.2, h], r: 0.6, h: o.antenna });
    }
  }, { sort: "none" });
  define2("tower", (g, o) => {
    const r = o.r ?? 14, h = o.h ?? 50;
    g.cylinder({ at: [0, 0, 0], r, h, chamfer: 1, bands: o.bands || Array.from({ length: Math.max(1, Math.floor(h / 10) - 1) }, (_, i) => (i + 1) * 10), ribs: o.ribs ?? 24, material: o.material, color: o.color });
    if (o.cap !== false) g.cone({ at: [0, 0, h], r: r * 0.92, h: r * 0.45 });
  }, { sort: "none" });
  define2("gate", (g, o) => {
    const w = o.w ?? 40, h = o.h ?? 46, t = o.t ?? 4, axis = o.axis || "x";
    if (axis === "x") {
      g.box({ at: [-w / 2, -t / 2, 0], size: [t, t, h], r: 0.8 });
      g.pane({ plane: "left", at: [-w / 2 + t, 0, h - t], w: w - 2 * t, h: h - t, material: "glass", fill: "f-glass", line: "ln-soft", draw: (f) => {
        f.line(f.w * 0.2, 4, f.w * 0.05, 18, "ln-faint");
        f.line(f.w * 0.32, 4, f.w * 0.12, 30, "ln-faint");
      } });
      g.box({ at: [w / 2 - t, -t / 2, 0], size: [t, t, h], r: 0.8 });
      g.box({ at: [-w / 2, -t / 2, h], size: [w, t, t], r: 0.8 });
    } else {
      g.box({ at: [-t / 2, w / 2 - t, 0], size: [t, t, h], r: 0.8 });
      g.pane({ plane: "right", at: [0, w / 2 - t, h - t], w: w - 2 * t, h: h - t, material: "glass", fill: "f-glass", line: "ln-soft", draw: (f) => {
        f.line(f.w * 0.2, 4, f.w * 0.05, 18, "ln-faint");
        f.line(f.w * 0.32, 4, f.w * 0.12, 30, "ln-faint");
      } });
      g.box({ at: [-t / 2, -w / 2, 0], size: [t, t, h], r: 0.8 });
      g.box({ at: [-t / 2, -w / 2, h], size: [t, w, t], r: 0.8 });
    }
  });
  define2("conveyor", (g, o) => {
    const L = o.length ?? 120, w = o.w ?? 18, h = o.h ?? 8, axis = o.axis || "x", rollers = o.rollers ?? Math.round(L / 8);
    const size = axis === "x" ? [L, w, h] : [w, L, h];
    g.box({
      at: [-size[0] / 2, -size[1] / 2, 0],
      size,
      r: 1.5,
      chamfer: 0.8,
      material: o.material,
      top: (f) => {
        if (axis === "x") for (let i = 0; i <= rollers; i++) {
          const u = 3 + i * (L - 6) / rollers;
          f.line(u, 2.5, u, w - 2.5, "ln-faint");
        }
        else for (let i = 0; i <= rollers; i++) {
          const v = 3 + i * (L - 6) / rollers;
          f.line(2.5, v, w - 2.5, v, "ln-faint");
        }
        if (axis === "x") {
          f.line(0, 2.2, L, 2.2, "ln-soft");
          f.line(0, w - 2.2, L, w - 2.2, "ln-soft");
        } else {
          f.line(2.2, 0, 2.2, L, "ln-soft");
          f.line(w - 2.2, 0, w - 2.2, L, "ln-soft");
        }
      },
      left: (f) => f.hlines(4, f.h * 0.5, f.w - 8, 0, 1, "ln-faint")
    });
    return {
      track(lift = 0) {
        const at = this.opts.at || [0, 0, 0];
        const a = axis === "x" ? [at[0] - L / 2 + 4, at[1], at[2] + h + lift] : [at[0], at[1] - L / 2 + 4, at[2] + h + lift];
        const b = axis === "x" ? [at[0] + L / 2 - 4, at[1], at[2] + h + lift] : [at[0], at[1] + L / 2 - 4, at[2] + h + lift];
        return Iso2.path.line(a, b);
      }
    };
  });
  define2("stack", (g, o) => {
    const [w, d] = o.size || [90, 70], t = o.t ?? 6, gap = o.gap ?? 14, layers = o.layers || [{ label: "Layer" }];
    layers.forEach((L, i) => {
      const z = i * (t + gap);
      g.box({
        id: o.id ? o.id + "-" + i : void 0,
        class: "layer",
        at: [-w / 2, -d / 2, z],
        size: [w, d, t],
        r: o.r ?? 6,
        chamfer: 1.2,
        material: L.material,
        color: L.color,
        glow: L.glow,
        top: L.icon ? (f) => f.svg('<path class="ln-strong" d="' + (ICONS[L.icon] || L.icon) + '"/>', { u: w / 2 - 9, v: d / 2 - 9, transform: "scale(.75)" }) : void 0,
        left: L.label && o.labels === "face" ? (f) => f.text(L.label, 8, t / 2 + 2, { size: Math.min(5, t * 0.8), cls: "tx tx-label", spacing: 0.8 }) : void 0
      });
      if (L.label && o.labels !== "face") {
        const ax = -w / 2, ay = d / 2, az = z + t / 2, side = o.labelSide === "right";
        const p0 = side ? [w / 2, -d / 2 + 4, az] : [ax + 4, ay, az];
        const p1 = side ? [w / 2 + 16, -d / 2 + 4, az] : [ax + 4, ay + 16, az];
        g.line({ points: [p0, p1], line: "ln-soft" });
        g.text({ text: L.label, at: p1, size: o.labelSize || 6, anchor: side ? "start" : "end", dx: side ? 4 : -4, dy: 2, cls: "tx tx-label" });
      }
    });
  });
  define2("block", (g, o) => {
    const [w, d, h] = o.size || [36, 36, 12];
    g.box({
      at: [-w / 2, -d / 2, 0],
      size: [w, d, h],
      r: o.r ?? 5,
      chamfer: o.chamfer ?? 1.5,
      material: o.material,
      color: o.color,
      glow: o.glow,
      top: o.icon ? (f) => {
        const s = (o.iconSize ?? Math.min(w, d) * 0.5) / 24;
        f.svg('<path class="' + (o.material === "lit" ? "ln-strong" : o.iconClass || "ln-strong") + '" d="' + (ICONS[o.icon] || o.icon) + '"/>', { u: (f.w - 24 * s) / 2, v: (f.h - 24 * s) / 2, transform: "scale(" + fmt(s) + ")" });
      } : void 0,
      left: o.label ? (f) => {
        const size = o.labelSize || Math.min(5.5, h * 0.42, (f.w - 6) / (String(o.label).length * 0.72));
        f.text(o.label, f.w / 2, f.h / 2 + size * 0.36, { size, anchor: "middle", cls: o.material === "lit" || o.material === "accent" ? "tx tx-label tx-on-lit" : "tx tx-label" });
      } : void 0
    });
  });
}

// engine/src/prefabs/index.js
function installPrefabs(define2, Iso2) {
  install(define2, Iso2);
  install2(define2, Iso2);
  install3(define2, Iso2);
}

// engine/src/diagram.js
function buildDiagram(o, make2) {
  const grid = o.grid ?? 80, gz = o.z ?? 0, origin = o.origin || [0, 0];
  const g = new Group({ id: o.id, flat: true });
  const cellXY = (c) => [origin[0] + c[0] * grid, origin[1] + c[1] * grid];
  const nodes = /* @__PURE__ */ new Map();
  for (const z of o.zones || []) {
    const a = cellXY(z.from), b = cellXY(z.to), pad = z.pad ?? grid * 0.42;
    const x0 = Math.min(a[0], b[0]) - pad, x1 = Math.max(a[0], b[0]) + pad, y0 = Math.min(a[1], b[1]) - pad, y1 = Math.max(a[1], b[1]) + pad;
    g.add(make2("zone", { id: z.id, at: [(x0 + x1) / 2, (y0 + y1) / 2, gz], size: [x1 - x0, y1 - y0], label: z.label, r: z.r ?? 10, fill: z.fill, dash: z.dash }));
  }
  for (const n of o.nodes || []) {
    const [x, y] = n.at ? n.at : cellXY(n.cell || [0, 0]);
    const type = n.type || "block";
    const size = n.size || (type === "block" ? [o.nodeSize ?? 36, o.nodeSize ?? 36, n.h ?? 12] : void 0);
    const opts = { ...n, at: [x, y, n.at && n.at[2] || gz], size };
    delete opts.cell;
    delete opts.type;
    const node = make2(type, opts);
    const h = size ? size[2] ?? 12 : type === "database" ? (n.tiers ?? 3) * ((n.tierH ?? 8) + 1.6) : n.h ?? 24;
    node.diagram = { x, y, half: (size ? Math.max(size[0], size[1]) : n.r ? n.r * 2 : 36) / 2, h };
    nodes.set(n.id, node);
    g.add(node);
  }
  const edges = [];
  for (const e of o.edges || []) {
    const A = nodes.get(e.from), B = nodes.get(e.to);
    if (!A || !B) continue;
    const a = [A.diagram.x, A.diagram.y], b = [B.diagram.x, B.diagram.y];
    const route = e.route || o.route || "auto";
    const z = (e.z ?? gz) + 0.01;
    let pts = routePoints(a, b, { route, z, radius: 0 });
    const trim = (p, q, by) => {
      const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1;
      return [p[0] + dx / L * by, p[1] + dy / L * by, p[2]];
    };
    const gap = e.gap ?? 4;
    const dir = (p, q) => [Math.sign(Math.round(q[0] - p[0])), Math.sign(Math.round(q[1] - p[1]))];
    const d0 = dir(pts[0], pts[1]), d1 = dir(pts[pts.length - 2], pts[pts.length - 1]);
    const leavesBack = d0[0] < 0 || d0[1] < 0, entersBack = d1[0] > 0 || d1[1] > 0;
    pts[0] = trim(pts[0], pts[1], A.diagram.half + gap + (leavesBack ? A.diagram.h * 0.9 : 0));
    pts[pts.length - 1] = trim(pts[pts.length - 1], pts[pts.length - 2], B.diagram.half + gap + 2 + (entersBack ? B.diagram.h + 2 : 0));
    const ptsR = routePoints(pts[0], pts[pts.length - 1], { route: pts.length > 2 ? pts.slice(1, -1).map((p) => [p[0], p[1]]) : "straight", z, radius: e.radius ?? o.radius ?? 8 });
    const line = new Line({ id: e.id, points: ptsR, arrow: e.arrow ?? "end", line: e.line || "ln", dash: e.dash, flow: e.flow === false ? void 0 : e.flow ?? o.flow ?? 14, arrowSize: 4.5 });
    g.add(line);
    const path2 = new Path(ptsR);
    if (e.label) {
      const mid = path2.at(0.5);
      g.add(new Text({ text: e.label, at: mid, size: e.labelSize || 5.5, anchor: "middle", dy: -5, cls: "tx tx-label", layer: 1 }));
    }
    edges.push({ spec: e, line, path: path2, from: A, to: B });
  }
  g.nodesById = nodes;
  g.edges = edges;
  g.onMount = (scene2) => {
    for (const ed of edges) {
      const k = ed.spec.packets === true ? 1 : ed.spec.packets || 0;
      if (!k) continue;
      const cards = [];
      for (let i = 0; i < k; i++) {
        const p0 = ed.path.at(0);
        const card = make2(ed.spec.packet || "card", { at: [p0[0], p0[1], p0[2]], w: 7, d: 5, t: 1.2, id: (ed.spec.id || ed.spec.from + "-" + ed.spec.to) + "-packet-" + i });
        g.add(card);
        cards.push(card);
      }
      scene2.travel(cards, ed.path, { duration: ed.spec.duration ?? ed.path.length / (ed.spec.speed ?? o.speed ?? 40), spread: 1 / k, lift: 0.4, offset: ed.spec.offset || 0 });
    }
  };
  return g;
}

// engine/src/spec.js
function pathFrom(p) {
  if (!p) return null;
  if (p.points && p.length !== void 0) return p;
  if (Array.isArray(p)) return path.polyline(p);
  switch (p.type) {
    case "circle":
      return path.circle(p);
    case "arc":
      return path.arc(p);
    case "line":
      return path.line(p.from, p.to);
    case "rect":
      return path.rect(p);
    case "hop":
      return path.hop(p.from, p.to, p.height);
    case "bezier":
      return path.bezier(...p.points);
    default:
      return path.polyline(p.points || [], { radius: p.radius, closed: p.closed });
  }
}
function addObjects(parent, list) {
  for (const raw of list || []) {
    const { type, children, ...o } = raw;
    if (type === "group") {
      const g = parent.group(o);
      addObjects(g, children);
      continue;
    }
    if (typeof parent[type] !== "function") {
      console.warn('Iso.render: unknown object type "' + type + '"');
      continue;
    }
    const n = parent[type](o);
    if (children && n && n.isGroup) addObjects(n, children);
  }
}
function renderSpec(Iso2, spec, hostOverride) {
  const { objects, animations, interactions, host, ...opts } = spec;
  const s = Iso2.scene(hostOverride || host, opts);
  addObjects(s.root, objects);
  for (const a of animations || []) {
    const { type, target, ...o } = a;
    if (o.path) o.path = pathFrom(o.path);
    switch (type) {
      case "assemble":
        s.assemble(target, o);
        break;
      case "float":
        s.float(target, o);
        break;
      case "pulse":
        s.pulse(target, o);
        break;
      case "blink":
        s.blink(target, o);
        break;
      case "spin":
        s.spin(target, o);
        break;
      case "travel":
        s.travel(target, o.path, o);
        break;
      case "orbit":
        s.orbit(target, o);
        break;
      case "drawOn":
        s.drawOn(target, o);
        break;
      case "typewriter":
        s.typewriter(target, o);
        break;
      case "timeline": {
        const tl = s.timeline({ repeat: o.repeat, yoyo: o.yoyo, delay: o.delay, repeatDelay: o.repeatDelay });
        for (const st of o.steps || []) {
          const m = st.from && st.to ? "fromTo" : st.from ? "from" : st.set ? "set" : "to";
          const tg = st.target || target;
          if (m === "fromTo") tl.fromTo(tg, st.from, st.to, st, st.at);
          else if (m === "set") tl.set(tg, st.set, st.at);
          else tl[m](tg, st.props || st.to || st.from, st, st.at);
          if (st.wait) tl.wait(st.wait);
        }
        break;
      }
      default:
        console.warn('Iso.render: unknown animation "' + type + '"');
    }
  }
  for (const it of interactions || []) {
    const nodes = s.resolve(it.target);
    if (it.hover === "lift") s.hoverLift(nodes, { z: it.z ?? 4 });
    for (const n of nodes) {
      if (it.label) n.set("label", it.label);
      if (!it.click) continue;
      n.on("click", () => {
        if (it.click === "power" && typeof n.power === "function") n.power();
        else if (it.click === "toggle") {
          const on = !n.opts.pressed;
          n.set("pressed", on);
          n.set("material", on ? it.onMaterial || "lit" : it.offMaterial);
          if (it.status) s.status(on ? it.status.on : it.status.off);
        } else if (typeof it.click === "object" && it.click.to) s.to(n, it.click.to, it.click);
      });
    }
  }
  return s;
}

// engine/src/behaviors.js
var TAU = Math.PI * 2;
function anchorOf(scene2, n) {
  if (!n.rest) scene2.measure();
  const b = n.rest;
  if (!b) return [0, 0, 0];
  return [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, b[2]];
}
Object.assign(Scene.prototype, {
  /* gentle vertical bob (additive) */
  float(target, o = {}) {
    const nodes = this.resolve(target), amp = o.amp ?? 3, period = o.period ?? 3, phase = o.phase ?? 0, st = o.stagger ?? 0.17;
    return this.loop((t) => nodes.forEach((n, i) => this.nudge(n, "z", amp * Math.sin(TAU * (t / period + phase + i * st)))));
  },
  /* opacity breathing between min and max (multiplicative) */
  pulse(target, o = {}) {
    const nodes = this.resolve(target), min = o.min ?? 0.35, max = o.max ?? 1, period = o.period ?? 2, st = o.stagger ?? 0;
    return this.loop((t) => nodes.forEach((n, i) => this.nudge(n, "opacity", min + (max - min) * (0.5 + 0.5 * Math.sin(TAU * (t / period + i * st))))));
  },
  /* on/off (LEDs, cursors) */
  blink(target, o = {}) {
    const nodes = this.resolve(target), period = o.period ?? 1, duty = o.duty ?? 0.5, st = o.stagger ?? 0, low = o.low ?? 0;
    return this.loop((t) => nodes.forEach((n, i) => {
      const ph = ((t / period + (o.phase || 0) + i * st) % 1 + 1) % 1;
      if (ph >= duty) this.nudge(n, "opacity", low);
    }));
  },
  /* rotate around the vertical axis (rebuilds geometry each frame: keep spinning objects small) */
  spin(target, o = {}) {
    const nodes = this.resolve(target), speed = o.speed ?? 30;
    const base = nodes.map((n) => n.opts.rot || 0);
    return this.loop((t) => nodes.forEach((n, i) => n.set("rot", base[i] + speed * t)));
  },
  /* move along a world path. o: duration | speed (units/s), offset (0–1), ease, yoyo, orient, spread (offsets across nodes), lift */
  travel(target, path2, o = {}) {
    const nodes = this.resolve(target);
    const dur = o.duration ?? (o.speed ? path2.length / o.speed : 4);
    const start = o.start ?? this.time, spread = o.spread ?? (nodes.length > 1 ? 1 / nodes.length : 0);
    const ease2 = o.ease ? typeof o.ease === "function" ? o.ease : null : null;
    let anchors = null;
    const rot0 = nodes.map((n) => n.opts.rot || 0);
    const lift = o.lift || 0;
    return this.loop((t) => (anchors || (anchors = nodes.map((n) => anchorOf(this, n)))) && nodes.forEach((n, i) => {
      let u = (t - start) / dur + (o.offset || 0) + i * spread;
      if (o.repeat === 0 || o.once) u = Math.min(1, Math.max(0, u));
      if (o.yoyo) {
        const k = (u % 2 + 2) % 2;
        u = k > 1 ? 2 - k : k;
      } else if (path2.closed || !(o.repeat === 0 || o.once)) u = (u % 1 + 1) % 1;
      if (ease2) u = ease2(u);
      const p = path2.at(u), a = anchors[i];
      n.set({ x: p[0] - a[0], y: p[1] - a[1], z: p[2] - a[2] + lift });
      if (o.orient) n.set("rot", rot0[i] + path2.heading(u) + (o.orientOffset || 0));
    }));
  },
  orbit(target, o = {}) {
    const P = this.constructor.path;
    return this.travel(target, P.circle({ center: o.center || [0, 0, 0], r: o.r || 50, start: o.start || 0, ccw: o.ccw }), o);
  },
  /* entrance: drop in from above and fade, staggered back-to-front */
  assemble(target, o = {}) {
    let nodes = target ? this.resolve(target) : this.root.items();
    if (o.filter) nodes = nodes.filter(o.filter);
    if (!this.measured) this.measure();
    const tl = this.timeline({ delay: o.delay ?? 0.15 });
    tl.from(nodes, { z: o.drop ?? 36, opacity: 0 }, { duration: o.duration ?? 0.8, ease: o.ease ?? "out", stagger: { each: o.stagger ?? 0.05, from: o.from ?? "depth" } }, 0);
    return tl;
  },
  /* stroke draw-on for lines/connectors */
  drawOn(target, o = {}) {
    const nodes = this.resolve(target);
    const tl = this.timeline({ delay: o.delay ?? 0 });
    tl.fromTo(nodes, { reveal: 0 }, { reveal: 1 }, { duration: o.duration ?? 1, ease: o.ease ?? "inOutCubic", stagger: o.stagger ?? 0.1 }, 0);
    return tl;
  },
  /* reveal a Text node character by character */
  typewriter(target, o = {}) {
    const nodes = this.resolve(target);
    const tl = this.timeline({ delay: o.delay ?? 0 });
    nodes.forEach((n) => {
      const len = String(n.opts.text || "").length;
      tl.fromTo(n, { chars: 0 }, { chars: len }, { duration: o.duration ?? len * (o.perChar ?? 0.05), ease: "linear" }, o.stagger ? void 0 : 0);
    });
    return tl;
  },
  /* hover: raise the object a little (reactive) */
  hoverLift(target, o = {}) {
    const nodes = this.resolve(target), z = o.z ?? 4, d = o.duration ?? 0.22;
    nodes.forEach((n) => {
      n.on("hover", () => this.to(n, { z }, { duration: d }));
      n.on("leave", () => this.to(n, { z: 0 }, { duration: d }));
      if (!n.handlers.click) n.opts.interactive = n.opts.interactive ?? false;
    });
    return { stop() {
    } };
  }
});

// engine/src/export.js
var PROPS = ["fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-dashoffset", "opacity", "fill-opacity", "stroke-opacity", "font-family", "font-size", "letter-spacing", "text-transform", "display", "filter"];
var ctx2d = null;
var cache = /* @__PURE__ */ new Map();
function rgba(c) {
  if (!c || c === "none" || c.startsWith("url(")) return c;
  if (cache.has(c)) return cache.get(c);
  if (!ctx2d) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    ctx2d = cv.getContext("2d", { willReadFrequently: true });
  }
  ctx2d.clearRect(0, 0, 1, 1);
  ctx2d.fillStyle = "#000";
  ctx2d.fillStyle = c;
  ctx2d.fillRect(0, 0, 1, 1);
  const d = ctx2d.getImageData(0, 0, 1, 1).data;
  const out = d[3] === 255 ? `rgb(${d[0]},${d[1]},${d[2]})` : d[3] === 0 ? "none" : `rgba(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(3)})`;
  cache.set(c, out);
  return out;
}
Object.assign(Scene.prototype, {
  /* Self-contained SVG string: every computed paint inlined, so it renders anywhere. */
  toSVG(o = {}) {
    if (!this.svg) this.render();
    const src = this.svg, clone2 = src.cloneNode(true);
    const a = src.querySelectorAll("*"), b = clone2.querySelectorAll("*");
    for (let i = 0; i < a.length; i++) {
      const cs = getComputedStyle(a[i]), el = b[i];
      if (a[i].tagName === "title") continue;
      if (cs.display === "none") {
        el.setAttribute("display", "none");
        continue;
      }
      for (const p of PROPS) {
        let v = cs.getPropertyValue(p);
        if (!v || v === "normal" || v === "auto") continue;
        if (p === "fill" || p === "stroke") v = rgba(v);
        if (p === "filter") {
          if (v === "none") continue;
        }
        if (p === "opacity" && v === "1") continue;
        if (p === "text-transform") {
          if (v === "uppercase") el.textContent = el.textContent.toUpperCase();
          continue;
        }
        el.setAttribute(p, v);
      }
      if (el.getAttribute("vector-effect") === null && /^(path|line|polyline|rect|circle|ellipse)$/.test(el.tagName)) el.setAttribute("vector-effect", "non-scaling-stroke");
      el.removeAttribute("class");
      el.removeAttribute("style");
      el.removeAttribute("tabindex");
    }
    clone2.removeAttribute("class");
    clone2.removeAttribute("style");
    const vb = this.vb, w = o.width || Math.round(vb[2] * (o.scale || 1)), h = Math.round(w * vb[3] / vb[2]);
    clone2.setAttribute("width", w);
    clone2.setAttribute("height", h);
    if (o.background !== false) {
      const bg = o.background || rgba(getComputedStyle(src).getPropertyValue("--iso-bg").trim() || "#111");
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("x", vb[0]);
      r.setAttribute("y", vb[1]);
      r.setAttribute("width", vb[2]);
      r.setAttribute("height", vb[3]);
      r.setAttribute("fill", bg);
      clone2.insertBefore(r, clone2.firstChild);
    }
    return new XMLSerializer().serializeToString(clone2);
  },
  /* PNG blob. o: scale (default 2), background */
  toPNG(o = {}) {
    const scale = o.scale || 2, vb = this.vb;
    const svg = this.toSVG({ ...o, width: Math.round(vb[2] * scale) });
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    return new Promise((res, rej) => {
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        c.getContext("2d").drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob((b) => b ? res(b) : rej(new Error("toBlob failed")), "image/png");
      };
      img.onerror = rej;
      img.src = url;
    });
  },
  async download(name = "illustration", type = "svg", o = {}) {
    const blob = type === "png" ? await this.toPNG(o) : new Blob([this.toSVG(o)], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name + "." + type;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
  }
});

// engine/src/index.js
var VERSION = "0.1.0";
function wedgeHull(o) {
  const [x, y, z] = o.at || [0, 0, 0], [w, d, h] = o.size || [20, 20, 10], up = o.up || "x";
  const unit = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [1, 0, 1], [1, 1, 1]];
  const map = { x: (p) => p, "-x": (p) => [1 - p[0], p[1], p[2]], y: (p) => [p[1], p[0], p[2]], "-y": (p) => [p[1], 1 - p[0], p[2]] }[up] || ((p) => p);
  const vertices = unit.map(map).map((p) => [x + p[0] * w, y + p[1] * d, z + p[2] * h]);
  return new Hull({ ...o, at: [0, 0, 0], vertices, faces: [[0, 1, 2, 3], [1, 4, 5, 2], [0, 3, 5, 4], [0, 1, 4], [3, 2, 5]] });
}
function pyramidHull(o) {
  const [cx, cy, z] = o.at || [0, 0, 0], [w, d] = o.size || [20, 20], h = o.h ?? 20;
  const v = [[cx - w / 2, cy - d / 2, z], [cx + w / 2, cy - d / 2, z], [cx + w / 2, cy + d / 2, z], [cx - w / 2, cy + d / 2, z], [cx, cy, z + h]];
  return new Hull({ ...o, at: [0, 0, 0], vertices: v, faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]] });
}
function roofHull(o) {
  const [x, y, z] = o.at || [0, 0, 0], [w, d, h] = o.size || [40, 30, 14], ax = o.axis || "x";
  const v = ax === "x" ? [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x, y + d / 2, z + h], [x + w, y + d / 2, z + h]] : [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x + w / 2, y, z + h], [x + w / 2, y + d, z + h]];
  const f = ax === "x" ? [[0, 1, 2, 3], [0, 1, 5, 4], [3, 2, 5, 4], [0, 3, 4], [1, 2, 5]] : [[0, 1, 2, 3], [0, 3, 5, 4], [1, 2, 5, 4], [0, 1, 4], [3, 2, 5]];
  return new Hull({ ...o, at: [0, 0, 0], vertices: v, faces: f });
}
var shapes = {
  box: (o) => new Box(o),
  prism: (o) => new Prism(o),
  cylinder: (o) => new Cylinder(o),
  cone: (o) => new Cylinder({ rTop: 0, ...o }),
  sphere: (o) => new Sphere(o),
  hull: (o) => new Hull(o),
  panel: (o) => new Panel(o),
  slab: (o) => new Hull({ ...o, at: [0, 0, 0], vertices: slabVertices(o.origin || o.at || [0, 0, 0], o.u, o.v, o.w), faces: SLAB_FACES }),
  wedge: wedgeHull,
  pyramid: pyramidHull,
  roof: roofHull,
  rect: (o) => new Flat({ ...o, shape: "rect" }),
  circle: (o) => new Flat({ ...o, shape: "circle" }),
  ring: (o) => new Flat({ ...o, shape: "ring" }),
  poly: (o) => new Flat({ ...o, shape: "poly" }),
  line: (o) => new Line(o),
  connector: (o) => new Line({ arrow: "end", ...o, points: routePoints(o.from, o.to, o) }),
  ribbon: (o) => new Ribbon(o),
  helix: (o) => new Helix(o),
  text: (o) => new Text(o),
  pane: (o) => new Pane(o),
  grid: (o) => new Grid(o),
  custom: (o) => new Custom(o)
};
var builders = {
  /* hollow cylinder split into angular segments (ring buildings, rims, tracks) */
  tube(o) {
    const n = o.segments || 16, g = new Group({ id: o.id, flat: true, class: o.class, material: o.material });
    const [cx, cy, z] = o.at || [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const seg = new TubeSegment({ ...o, id: o.id ? o.id + "-" + i : void 0, at: [cx, cy, z], r: o.r ?? 40, ri: o.ri ?? (o.r ?? 40) * 0.7, h: o.h ?? 10, a0: 360 * i / n, a1: 360 * (i + 1) / n });
      g.add(seg);
    }
    return g;
  },
  /* screen-facing label with a leader line from an anchor point */
  label(o) {
    const [x, y, z] = o.at || [0, 0, 0], lift = o.lift ?? 28, g = new Group({ id: o.id, layer: o.layer ?? 1, class: o.class, sort: "none" });
    if (lift) g.add(new Line({ points: [[x, y, z], [x, y, z + lift]], line: o.line || "ln-soft" }));
    if (o.dot !== false) g.add(new Flat({ shape: "circle", at: [x, y, z], r: o.dotSize || 1.6, fill: "f-ink", line: null }));
    g.add(new Text({ text: o.text, at: [x, y, z + lift], size: o.size || 7, anchor: o.anchor || "middle", dy: o.dy ?? -5, cls: o.cls || "tx tx-label", spacing: o.spacing }));
    return g;
  },
  diagram: (o) => buildDiagram(o, make)
};
function make(type, opts = {}) {
  if (shapes[type]) return shapes[type](opts);
  if (builders[type]) return builders[type](opts);
  return makePrefab(type, opts);
}
var prefabs = {};
function define(name, build, meta = {}) {
  prefabs[name] = { build, meta };
  Group.prototype[name] = function(opts = {}) {
    return this.add(makePrefab(name, opts));
  };
  if (!Scene.prototype[name]) Scene.prototype[name] = function(opts) {
    return this.root[name](opts);
  };
  return build;
}
function makePrefab(name, opts = {}) {
  const p = prefabs[name];
  if (!p) throw new Error('Iso: unknown prefab "' + name + '"');
  const rot = (opts.rot || 0) + ({ right: -90, back: 180, "back-right": 180, "back-left": 90 }[opts.facing] || 0);
  const g = new Group({ ...opts, rot, sort: opts.sort || p.meta.sort || "auto", flat: opts.flat ?? p.meta.flat });
  g.prefab = name;
  const api = p.build(g, opts, Iso);
  if (api && typeof api === "object") Object.assign(g, api);
  return g;
}
for (const k in shapes) {
  Group.prototype[k] = function(o = {}) {
    return this.add(shapes[k](o));
  };
  Scene.prototype[k] = function(o) {
    return this.root[k](o);
  };
}
for (const k in builders) {
  Group.prototype[k] = function(o = {}) {
    return this.add(builders[k](o));
  };
  Scene.prototype[k] = function(o) {
    return this.root[k](o);
  };
}
Group.prototype.group = function(opts = {}, fn) {
  if (typeof opts === "function") {
    fn = opts;
    opts = {};
  }
  const g = new Group(opts);
  if (fn) fn(g);
  return this.add(g);
};
function scene(host, opts = {}) {
  if (opts.figure && host) {
    const f = figure(host, { theme: opts.theme, ...opts.figure });
    if (opts.colors && opts.colors.bg) f.el.style.setProperty("--iso-fig-bg", "color-mix(in oklab, " + opts.colors.bg + " 92%, " + (opts.colors.fg || "#fff") + ")");
    if (opts.colors && opts.colors.fg) {
      f.el.style.setProperty("--iso-fig-cap", "color-mix(in oklab, " + opts.colors.fg + " 45%, transparent)");
      f.el.style.setProperty("--iso-fig-cap-strong", "color-mix(in oklab, " + opts.colors.fg + " 70%, transparent)");
    }
    const s2 = new Scene(f.stage, opts);
    s2.figure = f;
    s2.status = (t) => {
      f.status(t);
      return s2;
    };
    return s2;
  }
  const s = new Scene(host, opts);
  s.status = () => s;
  return s;
}
var Iso = {
  VERSION,
  scene,
  Scene,
  Node,
  Group,
  Face,
  Timeline,
  Path,
  path,
  ease,
  getEase,
  clock,
  shapes,
  prefabs,
  define,
  make,
  makePrefab,
  figure,
  pathFrom,
  render: (spec, host) => renderSpec(Iso, spec, host),
  css,
  injectCSS,
  THEMES,
  MATERIALS,
  depthSort,
  math: math_exports,
  rng,
  routePoints,
  filletPolyline,
  ICONS,
  MARK,
  icon,
  advance: (dt) => clock.advance(dt),
  set manual(v) {
    clock.manual = !!v;
  },
  get manual() {
    return clock.manual;
  },
  scenes: () => Array.from(clock.scenes)
};
Scene.path = path;
installPrefabs(define, Iso);
var index_default = Iso;
export {
  Iso,
  VERSION,
  index_default as default,
  define,
  make,
  makePrefab,
  prefabs,
  shapes
};
