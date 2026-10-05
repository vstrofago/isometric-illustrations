// SPDX-License-Identifier: Apache-2.0
/* Animation: easing, timelines and tweens.
   Timelines are deterministic functions of scene time (seekable, exportable frame by frame).
   Reactive tweens (node.to) start from the current value at the moment they are created. */

/* ── easing ── */
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1;
    if (Math.abs(sx(t) - x) > 1e-4) { t = x; for (let i = 0; i < 30; i++) { const v = sx(t); if (Math.abs(v - x) < 1e-5) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } }
    return sy(t);
  };
}
const outBounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const c1 = 1.70158, c3 = c1 + 1, c2 = c1 * 1.525;
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t, outQuad: (t) => 1 - (1 - t) * (1 - t), inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t, outCubic: (t) => 1 - Math.pow(1 - t, 3), inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => t ** 4, outQuart: (t) => 1 - Math.pow(1 - t, 4), inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * t - 10)), outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2), outSine: (t) => Math.sin((t * Math.PI) / 2), inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inBack: (t) => c3 * t * t * t - c1 * t * t, outBack: (t) => 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  inOutBack: (t) => (t < 0.5 ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2 : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2),
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outBounce,
  /* design-system curves */
  out: bezier(0.16, 1, 0.3, 1),
  standard: bezier(0.2, 0, 0, 1),
  smooth: bezier(0.45, 0, 0.2, 1),
  bezier,
  steps: (n) => (t) => Math.min(1, Math.floor(t * n) / n),
  /* critically-damped-ish spring settling at 1 */
  spring: (k = 1) => (t) => 1 - Math.exp(-6 * t * k) * Math.cos(9 * t * k),
};
export function getEase(e) {
  if (typeof e === 'function') return e;
  if (Array.isArray(e)) return bezier(...e);
  return ease[e] || ease.inOutCubic;
}

/* ── values ── */
const lerpV = (a, b, t) => (Array.isArray(a) ? a.map((v, i) => v + (b[i] - v) * t) : typeof a === 'number' ? a + (b - a) * t : t < 1 ? a : b);
const clone = (v) => (Array.isArray(v) ? v.slice() : v);

/* ── Timeline ── */
export class Timeline {
  constructor(scene, opt = {}) {
    this.scene = scene;
    this.repeat = opt.repeat ?? 0;          // −1 = forever
    this.yoyo = !!opt.yoyo;
    this.repeatDelay = opt.repeatDelay || 0;
    this.delay = opt.delay || 0;
    this.start = opt.start ?? (scene ? scene.time : 0);
    this.tracks = new Map();                // key `${uid}:${prop}` → {node, prop, base, entries:[]}
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
    if (position === undefined || position === null) return this.cursor;
    if (typeof position === 'number') return position;
    if (position === '<') return this.prevStart;
    if (position === '>') return this.cursor;
    const m = /^([<>]?)([+-]=)?(-?[\d.]+)$/.exec(position);
    if (m) {
      const base = m[1] === '<' ? this.prevStart : this.cursor;
      const n = parseFloat(m[3]);
      if (m[2] === '+=') return base + n;
      if (m[2] === '-=') return base - n;
      return m[1] ? base + n : n;
    }
    return this.cursor;
  }
  _add(target, props, opt, position, mode) {
    const nodes = this.scene ? this.scene.resolve(target) : [].concat(target);
    const dur = opt.duration ?? 0.6, e = getEase(opt.ease ?? 'inOutCubic');
    const t0 = this._pos(position, dur);
    const st = staggerFn(opt.stagger, nodes, this.scene);
    let end = t0;
    nodes.forEach((node, i) => {
      const s = t0 + st(i);
      for (const prop in props) {
        if (prop === 'duration' || prop === 'ease') continue;
        const key = node.uid + ':' + prop;
        let tr = this.tracks.get(key);
        if (!tr) this.tracks.set(key, (tr = { node, prop, base: clone(node.get(prop)), entries: [] }));
        const prev = tr.entries[tr.entries.length - 1];
        const cur = prev ? prev.to : tr.base;
        let from, to;
        if (mode === 'from') { from = props[prop]; to = cur; }
        else if (mode === 'fromTo') { from = opt.from[prop]; to = props[prop]; }
        else { from = cur; to = props[prop]; }
        if (typeof to === 'string' && /^[+-]=/.test(to)) to = cur + parseFloat(to.replace('=', ''));
        if (typeof to === 'function') to = to(i, node);
        if (typeof from === 'function') from = from(i, node);
        tr.entries.push({ start: s, dur: mode === 'set' ? 0 : dur, from: clone(from), to: clone(to), ease: e, explicit: mode === 'from' || mode === 'fromTo' });
        tr.entries.sort((a, b) => a.start - b.start);
      }
      end = Math.max(end, s + (mode === 'set' ? 0 : dur));
    });
    this.prevStart = t0;
    this.cursor = Math.max(this.cursor, end);
    this.duration = Math.max(this.duration, end);
    return this;
  }
  to(target, props, opt = {}, position) { return this._add(target, props, opt, position, 'to'); }
  from(target, props, opt = {}, position) { return this._add(target, props, opt, position, 'from'); }
  fromTo(target, from, to, opt = {}, position) { return this._add(target, to, { ...opt, from }, position, 'fromTo'); }
  set(target, props, position) { return this._add(target, props, { duration: 0 }, position, 'set'); }
  call(fn, position) { const t = this._pos(position); this.calls.push({ t, fn }); this.calls.sort((a, b) => a.t - b.t); this.duration = Math.max(this.duration, t); this.cursor = Math.max(this.cursor, t); return this; }
  wait(d) { this.cursor += d; this.duration = Math.max(this.duration, this.cursor); return this; }
  /* nest another timeline's tracks (built with a fresh Timeline) at a position */
  add(tl, position) {
    const off = this._pos(position);
    for (const [k, tr] of tl.tracks) {
      let mine = this.tracks.get(k);
      if (!mine) this.tracks.set(k, (mine = { node: tr.node, prop: tr.prop, base: tr.base, entries: [] }));
      for (const e of tr.entries) mine.entries.push({ ...e, start: e.start + off });
      mine.entries.sort((a, b) => a.start - b.start);
    }
    for (const c of tl.calls) this.calls.push({ t: c.t + off, fn: c.fn });
    this.calls.sort((a, b) => a.t - b.t);
    this.prevStart = off; this.cursor = Math.max(this.cursor, off + tl.duration); this.duration = Math.max(this.duration, off + tl.duration);
    return this;
  }
  get total() { return this.repeat < 0 ? Infinity : this.delay + this.duration * (this.repeat + 1) + this.repeatDelay * this.repeat; }

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
        for (let i = es.length - 1; i >= 0; i--) if (es[i].start <= L.tau + 1e-9) { e = es[i]; break; }
        if (!e) { if (!es[0].explicit) { v = tr.base; } else v = es[0].from; }
        else if (e.dur <= 0 || L.tau >= e.start + e.dur) v = e.to;
        else v = lerpV(e.from, e.to, e.ease((L.tau - e.start) / e.dur));
      }
      tr.node.set(tr.prop, clone(v));
    }
    this._fire(L);
    if (L.end) { this.done = true; if (this.onComplete) this.onComplete(this); if (this._resolve) this._resolve(this); }
  }
  _fire(L) {
    if (!this.calls.length || L.before) { this.lastT = null; return; }
    const prevIter = this.iteration, prevT = this.lastT;
    const fireRange = (a, b) => { for (const c of this.calls) if (c.t > a && c.t <= b + 1e-9) c.fn(this.scene, this); };
    if (prevT === null) fireRange(-1, L.tau);
    else if (L.iter !== prevIter) { fireRange(prevT, this.duration); for (let k = prevIter + 1; k < L.iter; k++) fireRange(-1, this.duration); fireRange(-1, L.tau); }
    else if (L.tau >= prevT) fireRange(prevT, L.tau);
    this.lastT = L.tau; this.iteration = L.iter;
  }
  /* promise-like */
  then(res, rej) {
    if (this.done) return Promise.resolve(this).then(res, rej);
    return new Promise((r) => { const prev = this._resolve; this._resolve = (x) => { if (prev) prev(x); r(x); }; }).then(res, rej);
  }
  kill() { this.done = true; if (this.scene) this.scene._removeTimeline(this); }
  reset() { this.done = false; this.lastT = null; this.iteration = -1; }
  play() { this.paused = false; return this; }
  pause() { this.paused = true; return this; }
  restart() { this.start = this.scene.time; this.reset(); return this; }
}

/* stagger: number (seconds per item) | {each, from: 'start'|'end'|'center'|'random'|'depth', amount} */
function staggerFn(st, nodes, scene) {
  if (!st) return () => 0;
  const o = typeof st === 'number' ? { each: st } : st;
  const n = nodes.length;
  const each = o.amount !== undefined ? o.amount / Math.max(1, n - 1) : o.each || 0;
  let rank = nodes.map((_, i) => i);
  if (o.from === 'end') rank = rank.map((i) => n - 1 - i);
  else if (o.from === 'center') rank = rank.map((i) => Math.abs(i - (n - 1) / 2));
  else if (o.from === 'random') { let s = o.seed || 7; rank = rank.map(() => ((s = (s * 16807) % 2147483647) / 2147483647) * (n - 1)); }
  else if (o.from === 'depth' || o.from === 'front') {
    const key = (nd) => { const b = nd.sortBox ? nd.sortBox() : null; return b ? (b[0] + b[3]) / 2 + (b[1] + b[4]) / 2 + b[2] : 0; };
    const sorted = nodes.map((nd, i) => [key(nd), i]).sort((a, b) => (o.from === 'front' ? b[0] - a[0] : a[0] - b[0]));
    sorted.forEach(([, i], r) => { rank[i] = r; });
  }
  return (i) => rank[i] * each;
}
