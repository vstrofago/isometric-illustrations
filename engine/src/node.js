/* Scene graph: Node (a drawable primitive) and Group (a container).
   A node renders to one <g data-uid>. Its geometry lives in `opts` (world units);
   its animated state lives in `t` (absolute offsets) and `a` (additive, reset every frame). */
import { Draw, IDENTITY, compose, makeFrame, applyFrame } from './draw.js';
import { box3, fmt } from './math.js';
import { depthSort, makeItem } from './sort.js';

let UID = 0;
const TRANSFORM_KEYS = ['x', 'y', 'z', 'scale', 'opacity'];

export class Node {
  constructor(opts = {}) {
    this.uid = ++UID;
    this.opts = { ...opts };
    this.id = opts.id || null;
    this.parent = null;
    this.t = { x: 0, y: 0, z: 0, scale: 1, opacity: opts.opacity ?? 1 };
    this.a = { x: 0, y: 0, z: 0, scale: 1, opacity: 1 };
    this.el = null;
    this.handlers = null;
    this.layer = opts.layer || 0;
    this.order = 0;
    this.dirty = true;
    this.moved = true;
    this.frame = IDENTITY;   // frame this node was drawn in
    this.rest = null;        // world AABB at rest
    this.sb = null;          // screen bounds at rest
    this.hidden = !!opts.hidden;
  }

  get kind() { return 'node'; }
  get scene() { let n = this; while (n.parent) n = n.parent; return n._scene || null; }
  get isGroup() { return false; }

  /* ── geometry (override) ── */
  draw(_d) {}
  /* local AABB before the frame; override */
  lbox() { return null; }
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
    if (typeof key === 'object') { for (const k in key) this.set(k, key[k]); return this; }
    if (TRANSFORM_KEYS.includes(key)) {
      if (this.t[key] !== value) { this.t[key] = value; if (key === 'opacity') this.fade = true; else this.moved = true; this._wake(); }
    } else if (this.opts[key] !== value) {
      this.opts[key] = value;
      if (key === 'hidden') { this.hidden = !!value; this.restyle = true; }
      else if (key === 'material' || key === 'class' || key === 'color' || key === 'style' || key === 'pressed' || key === 'label' || key === 'interactive' || key === 'glow') this.restyle = true;
      else this.dirty = true;
      this._wake();
    }
    return this;
  }
  /* Total offset relative to the nearest atomic container (includes flat ancestors). */
  offset() {
    let x = this.t.x + this.a.x, y = this.t.y + this.a.y, z = this.t.z + this.a.z;
    let p = this.parent;
    while (p && p.flat) { x += p.t.x + p.a.x; y += p.t.y + p.a.y; z += p.t.z + p.a.z; p = p.parent; }
    return [x, y, z];
  }
  opacity() {
    let o = this.t.opacity * this.a.opacity, p = this.parent;
    while (p && p.flat) { o *= p.t.opacity * p.a.opacity; p = p.parent; }
    return o;
  }
  /* AABB used for depth sorting within the container. */
  sortBox() {
    if (!this.rest) return null;
    const o = this.offset();
    return box3.shift(this.rest, o[0], o[1], o[2]);
  }
  _wake() { const s = this.scene; if (s) s._touch(this); }

  /* ── animation sugar (delegates to the scene) ── */
  to(props, opts) { return this.scene.to(this, props, opts); }
  on(evt, fn) {
    (this.handlers || (this.handlers = {}))[evt] = (this.handlers[evt] || []).concat(fn);
    this.restyle = true; this._wake();
    return this;
  }
  emit(evt, e) { const hs = this.handlers && this.handlers[evt]; if (hs) hs.forEach((h) => h.call(this, e, this)); }
  remove() { if (this.parent) this.parent.removeChild(this); }

  /* ── rendering ── */
  classes() {
    const o = this.opts, c = ['iso-n'];
    if (o.material) c.push('m-' + o.material);
    if (o.color) c.push('m-tint');
    if (o.class) c.push(o.class);
    if (o.glow) c.push('glow');
    if (this.interactive()) c.push('hit');
    return c.join(' ');
  }
  interactive() { return !!(this.handlers && (this.handlers.click || this.handlers.press)) || !!this.opts.interactive; }
  styleAttr() {
    const o = this.opts, s = [];
    if (o.color) s.push('--iso-tint:' + o.color);
    if (o.style) for (const k in o.style) s.push(k + ':' + o.style[k]);
    const op = this.opacity();
    if (op !== 1) s.push('opacity:' + fmt(op));
    if (this.hidden) s.push('display:none');
    return s.length ? ' style="' + s.join(';') + '"' : '';
  }
  transformAttr(view) {
    const [x, y, z] = this.offset();
    const sc = this.t.scale * this.a.scale;
    let tr = '';
    if (x || y || z) { const q = view.P(x, y, z); tr = 'translate(' + fmt(q[0]) + ' ' + fmt(q[1]) + ')'; }
    if (sc !== 1 && this.rest) {
      const b = this.rest, an = this.opts.anchor || 'bottom';
      const ax = (b[0] + b[3]) / 2, ay = (b[1] + b[4]) / 2;
      const az = an === 'center' ? (b[2] + b[5]) / 2 : an === 'top' ? b[5] : b[2];
      const q = view.P(ax, ay, az);
      tr += ' translate(' + fmt(q[0]) + ' ' + fmt(q[1]) + ') scale(' + fmt(sc) + ') translate(' + fmt(-q[0]) + ' ' + fmt(-q[1]) + ')';
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
      s += ' tabindex="0" role="' + (o.role || 'button') + '"';
      if (o.label) s += ' aria-label="' + esc(o.label) + '"';
      if (o.pressed !== undefined) s += ' aria-pressed="' + !!o.pressed + '"';
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
    this.moved = false; this.restyle = false;
    return '<g' + this.attrs(view) + '>' + c + '</g>';
  }
  /* Apply transform/style changes to the live element. */
  sync(view) {
    if (!this.el) return;
    const tr = this.transformAttr(view);
    if (tr) this.el.setAttribute('transform', tr); else this.el.removeAttribute('transform');
    const op = this.opacity();
    this.el.style.opacity = op === 1 ? '' : fmt(op);
    if (this.restyle) {
      this.el.setAttribute('class', this.classes());
      this.el.style.display = this.hidden ? 'none' : '';
      if (this.opts.color) this.el.style.setProperty('--iso-tint', this.opts.color);
      if (this.opts.style) for (const k in this.opts.style) this.el.style.setProperty(k, this.opts.style[k]);
      if (this.opts.pressed !== undefined) this.el.setAttribute('aria-pressed', !!this.opts.pressed);
      if (this.opts.label) this.el.setAttribute('aria-label', this.opts.label);
      if (this.interactive() && !this.el.hasAttribute('tabindex')) { this.el.setAttribute('tabindex', '0'); this.el.setAttribute('role', this.opts.role || 'button'); }
      this.restyle = false;
    }
  }
}

/* ── Group ── */
export class Group extends Node {
  constructor(opts = {}) {
    super(opts);
    this.children = [];
    this.flat = !!opts.flat;
    this.sortMode = opts.sort || 'auto'; // 'auto' | 'none'
    this._seq = 0;
  }
  get kind() { return 'group'; }
  get isGroup() { return true; }
  childFrame(frame) {
    const o = this.opts, at = o.at || [0, 0, 0];
    if (!at[0] && !at[1] && !at[2] && !o.rot) return frame;
    return compose(frame, makeFrame(at[0] || 0, at[1] || 0, at[2] || 0, o.rot || 0));
  }
  add(child) {
    if (Array.isArray(child)) { child.forEach((c) => this.add(c)); return child; }
    if (child.parent) child.parent.removeChild(child);
    child.parent = this;
    child.order = this._seq++;
    this.children.push(child);
    const s = this.scene;
    if (s) { s._register(child); s._structure(); }
    return child;
  }
  removeChild(child) {
    const i = this.children.indexOf(child);
    if (i >= 0) this.children.splice(i, 1);
    child.parent = null;
    const s = this.scene;
    if (s) { s._unregister(child); s._structure(); }
  }
  clear() { this.children.slice().forEach((c) => this.removeChild(c)); }
  /* all descendants, depth first */
  each(fn) { for (const c of this.children) { fn(c); if (c.isGroup) c.each(fn); } }
  find(pred) { let r = null; this.each((c) => { if (!r && pred(c)) r = c; }); return r; }
  findAll(pred) { const r = []; this.each((c) => { if (pred(c)) r.push(c); }); return r; }
  get(key) { return key in this.t ? this.t[key] : this.opts[key]; }
  /* Items that sort in this container: children, with flat groups expanded. */
  items() {
    const out = [];
    const walk = (g) => { for (const c of g.children) { if (c.isGroup && c.flat) walk(c); else out.push(c); } };
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
      if (g !== this) { g.rest = g.aabb(); g.dirty = false; g.moved = false; }
    };
    walk(this, frame);
    const zs = view.ZS;
    let ordered;
    if (this.sortMode === 'none') ordered = parts.map((p, i) => ({ ...makeItem(p.node, p.node.sortBox(), zs, i), s: p.s }));
    else ordered = depthSort(parts.map((p, i) => ({ ...makeItem(p.node, p.node.sortBox(), zs, i), s: p.s })));
    this.sorted = ordered.map((it) => it.node);
    this.rest = this.aabb();
    /* screen bounds: union of children (with their offsets) */
    const b = [Infinity, Infinity, -Infinity, -Infinity];
    for (const it of ordered) {
      const n = it.node, sb = n.sb;
      if (!sb || !isFinite(sb[0])) continue;
      const o = n.offset(), q = view.P(o[0], o[1], o[2]);
      b[0] = Math.min(b[0], sb[0] + q[0]); b[1] = Math.min(b[1], sb[1] + q[1]);
      b[2] = Math.max(b[2], sb[2] + q[0]); b[3] = Math.max(b[3], sb[3] + q[1]);
    }
    this.sb = b;
    this.dirty = false;
    let s = ordered.map((it) => it.s).join('');
    if (this.interactive()) s += focusRing(view, this.rest);
    return s;
  }
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* Focus ring: the hexagonal silhouette of an AABB, drawn invisible until :focus-visible. */
export function focusRing(view, b) {
  if (!b) return '';
  const m = 3;
  const [x0, y0, z0, x1, y1, z1] = [b[0] - m, b[1] - m, b[2] - 1, b[3] + m, b[4] + m, b[5] + m];
  const pts = [[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y1, z1]].map((p) => view.P(p[0], p[1], p[2]));
  return '<path class="focus-ring" d="M' + pts.map((p) => fmt(p[0]) + ' ' + fmt(p[1])).join('L') + 'Z"/>';
}
