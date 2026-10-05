// SPDX-License-Identifier: Apache-2.0
/* Isometric engine: math helpers.
   World axes: x → screen right-down, y → screen left-down, z → up.
   The viewer looks along (−1, −1, −2S): larger x, y or z is closer to the viewer. */

export const DEG = Math.PI / 180;
export const EPS = 1e-6;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const fmt = (n) => {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? '0' : String(v);
};

/* ── sanitising (scenes may be built from untrusted JSON) ── */
export const escAttr = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* class lists: letters, digits, _, - and spaces only */
export const cssClass = (s) => String(s ?? '').replace(/[^\w\- ]/g, '');
/* a CSS value without the characters that end a declaration or an attribute */
export const cssValue = (s) => String(s ?? '').replace(/[;"'<>{}\\]/g, '');
export const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? fmt(n) : ''; };
export const dashArray = (s) => String(s ?? '').replace(/[^0-9.,\s]/g, '').trim();
export const pathData = (s) => (/^[MmLlHhVvCcSsQqTtAaZzEe0-9.,\s+-]*$/.test(String(s ?? '')) ? String(s ?? '') : '');
export const textAnchor = (a) => (a === 'middle' || a === 'end' ? a : 'start');
export const fontWeight = (w) => (/^(normal|bold|[1-9]00)$/.test(String(w)) ? String(w) : '');

/* A projection. angle 30 is true isometric; 26.565 is the 2:1 "pixel" dimetric. */
export function makeView(angle = 30) {
  const C = Math.cos(angle * DEG);
  const S = Math.sin(angle * DEG);
  const P = (x, y, z = 0) => [(x - y) * C, (x + y) * S - z];
  /* z scaled so that the view direction is (1, 1, 1) in (x, y, zs) space */
  const ZS = 1 / (2 * S);
  return { angle, C, S, ZS, P };
}

/* ── plan polygons (x →, y ↓ in plan) ── */

/* Rounded rectangle. Returns points with a parallel `kinds` array:
   'c' sharp corner, 't' tangent (start/end of an arc), 's' smooth (inside an arc). */
export function rrect(x, y, w, h, r = 0, n) {
  r = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  let pts, kinds;
  if (r < 1e-3) {
    pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    kinds = ['c', 'c', 'c', 'c'];
  } else {
    n = n || clamp(Math.round(r / 1.6), 3, 12);
    pts = []; kinds = [];
    const cs = [[x + w - r, y + r, -90], [x + w - r, y + h - r, 0], [x + r, y + h - r, 90], [x + r, y + r, 180]];
    for (const [cx, cy, a0] of cs) {
      for (let i = 0; i <= n; i++) {
        const a = (a0 + (90 * i) / n) * DEG;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
        kinds.push(i === 0 || i === n ? 't' : 's');
      }
    }
  }
  return dedupe(pts, kinds);
}

/* Regular polygon / circle samples in plan. */
export function circlePts(cx, cy, r, n = 32, a0 = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (a0 + (360 * i) / n) * DEG;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  pts.kinds = pts.map(() => 's');
  return pts;
}

export function regularPolygon(cx, cy, r, sides, a0 = -90) {
  const p = circlePts(cx, cy, r, sides, a0);
  p.kinds = p.map(() => 'c');
  return p;
}

function dedupe(pts, kinds) {
  const out = [], ok = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = out[out.length - 1];
    if (b && Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6) {
      if (kinds[i] === 'c') ok[ok.length - 1] = 'c';
      continue;
    }
    out.push(a); ok.push(kinds[i]);
  }
  const f = out[0], l = out[out.length - 1];
  if (out.length > 1 && Math.abs(f[0] - l[0]) < 1e-6 && Math.abs(f[1] - l[1]) < 1e-6) { out.pop(); ok.pop(); }
  out.kinds = ok;
  return out;
}

export function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

export function isConvex(poly) {
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

/* Inset a convex polygon by d (positive shrinks). Keeps `kinds`. */
export function insetConvex(poly, d) {
  const n = poly.length, ccw = signedArea(poly) > 0, lines = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    /* inward normal */
    const nx = ccw ? -dy : dy, ny = ccw ? dx : -dx;
    lines.push([a[0] + nx * d, a[1] + ny * d, dx, dy]);
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i + n - 1) % n], l2 = lines[i];
    const den = l1[2] * l2[3] - l1[3] * l2[2];
    if (Math.abs(den) < 1e-9) { out.push([l2[0], l2[1]]); continue; }
    const t = ((l2[0] - l1[0]) * l2[3] - (l2[1] - l1[1]) * l2[2]) / den;
    out.push([l1[0] + l1[2] * t, l1[1] + l1[3] * t]);
  }
  out.kinds = poly.kinds ? poly.kinds.slice() : out.map(() => 'c');
  return out;
}

export function rotatePts(pts, cx, cy, deg) {
  if (!deg) return pts;
  const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG);
  const out = pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]);
  out.kinds = pts.kinds;
  return out;
}

/* ── 3D vectors ── */
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};

/* Seeded PRNG (mulberry32) so scenes with scattered objects are reproducible. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (a0, b0) => a0 + (b0 - a0) * next();
  next.int = (a0, b0) => Math.floor(a0 + (b0 - a0 + 1) * next());
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}

/* AABB helpers: [x0, y0, z0, x1, y1, z1] */
export const box3 = {
  empty: () => [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity],
  addPt(b, x, y, z) {
    if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (z < b[2]) b[2] = z;
    if (x > b[3]) b[3] = x; if (y > b[4]) b[4] = y; if (z > b[5]) b[5] = z;
    return b;
  },
  union(a, b) {
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2]), Math.max(a[3], b[3]), Math.max(a[4], b[4]), Math.max(a[5], b[5])];
  },
  shift: (b, x, y, z) => [b[0] + x, b[1] + y, b[2] + z, b[3] + x, b[4] + y, b[5] + z],
  valid: (b) => b[0] <= b[3] && b[1] <= b[4] && b[2] <= b[5],
};
