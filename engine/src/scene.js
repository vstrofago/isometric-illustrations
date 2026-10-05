/* Scene: owns the view, the node tree, the SVG element, the clock and the animations. */
import { makeView, fmt, box3 } from './math.js';
import { IDENTITY } from './draw.js';
import { Node, Group } from './node.js';
import { makeItem, compareItems, depthSort, Placer } from './sort.js';
import { injectCSS } from './style.js';
import { Timeline } from './anim.js';

/* ── global clock ── */
export const clock = {
  scenes: new Set(),
  manual: typeof window !== 'undefined' && (!!window.__ISO_MANUAL__ || /[?&]iso-manual\b/.test(window.location ? window.location.search : '')),
  raf: 0,
  last: 0,
  add(s) { this.scenes.add(s); this.kick(); },
  remove(s) { this.scenes.delete(s); },
  kick() {
    if (this.manual || this.raf || typeof requestAnimationFrame === 'undefined') return;
    this.last = 0;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  },
  frame(ts) {
    this.raf = 0;
    const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 1 / 60;
    this.last = ts;
    let again = false;
    for (const s of this.scenes) { if (s._wantsFrame()) { s.tick(dt); again = again || s._wantsFrame(); } }
    if (again) { this.raf = requestAnimationFrame((t) => this.frame(t)); this.last = ts; }
    else this.last = 0;
  },
  /* manual stepping (export, tests) */
  advance(dt) { for (const s of this.scenes) s.tick(dt); },
};

const reducedQuery = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export class Scene {
  constructor(host, opts = {}) {
    if (host && !(typeof host === 'string' || (typeof Element !== 'undefined' && host instanceof Element))) { opts = host; host = opts.host; }
    this.opts = { theme: 'dark', angle: 30, padding: 24, autoplay: true, reducedMotion: 'static', ...opts };
    this.view = makeView(this.opts.angle);
    this.root = new Group({ sort: this.opts.sort || 'auto' });
    this.root._scene = this;
    this.byUid = new Map();
    this.time = 0;
    this.timeScale = 1;
    this.playing = this.opts.autoplay !== false;
    this.timelines = [];
    this.behaviors = [];
    this.pending = new Set();
    this.touchedA = new Set();
    this.visible = true;
    this.built = false;
    this.listeners = {};
    this.host = typeof host === 'string' ? document.querySelector(host) : host || null;
    this.reduced = this.opts.reducedMotion !== 'ignore' && reducedQuery();
    this._byUid(this.root);
    if (typeof document !== 'undefined') injectCSS(document);
    clock.add(this);
    if (this.host && this.opts.autoRender !== false && typeof queueMicrotask !== 'undefined') queueMicrotask(() => { if (!this.built && !this.destroyed) this.render(); });
  }

  /* ── tree ── */
  _byUid(n) { this.byUid.set(n.uid, n); }
  _register(n) {
    const mount = (x) => { this._byUid(x); if (x.onMount && !x._mounted) { x._mounted = true; x.onMount(this); } };
    mount(n); if (n.isGroup) n.each(mount);
  }
  _unregister(n) { this.byUid.delete(n.uid); if (n.isGroup) n.each((c) => this.byUid.delete(c.uid)); if (n.el && n.el.parentNode) n.el.parentNode.removeChild(n.el); }
  _structure() { if (this.built) { this.needsRender = true; this._wake(); } }
  add(node, opts) {
    if (typeof node === 'string') return this.root[node](opts);
    return this.root.add(node);
  }
  group(opts, fn) { return this.root.group(opts, fn); }
  get(id) { if (id instanceof Node) return id; return this.root.find((n) => n.id === id) || null; }
  find(pred) { return this.root.find(pred); }
  all(pred = () => true) { return this.root.findAll(pred); }
  /* target: node | id | '.class' | '#id' | 'prefix*' | array | predicate */
  resolve(target) {
    if (!target) return [];
    if (Array.isArray(target)) return target.flatMap((t) => this.resolve(t));
    if (target instanceof Node) return [target];
    if (typeof target === 'function') return this.all(target);
    if (typeof target === 'string') {
      if (target[0] === '.') { const c = target.slice(1); return this.all((n) => (' ' + (n.opts.class || '') + ' ').includes(' ' + c + ' ')); }
      const id = target[0] === '#' ? target.slice(1) : target;
      if (id.endsWith('*')) { const p = id.slice(0, -1); return this.all((n) => n.id && n.id.startsWith(p)); }
      const n = this.get(id);
      return n ? [n] : [];
    }
    if (target.node) return [target.node];
    return [];
  }

  /* ── layout without DOM (bounds for staggers, fitting) ── */
  measure() { this.root.content(this.view, IDENTITY); this.measured = true; return this.root.sb; }

  /* ── DOM ── */
  render() {
    const v = this.view, html = this.root.content(v, IDENTITY);
    this.measured = true;
    if (!this.vb || this.opts.refit) this.vb = this._viewBox();
    const o = this.opts, vb = this.vb;
    const label = o.label || o.title || 'Isometric illustration';
    const svgOpen = '<svg xmlns="http://www.w3.org/2000/svg" class="iso iso-' + o.theme + (o.class ? ' ' + o.class : '') + '" viewBox="' + vb.map(fmt).join(' ') + '" role="img" aria-label="' + escAttr(label) + '"' + (o.height ? ' style="height:' + o.height + (typeof o.height === 'number' ? 'px' : '') + ';width:100%"' : '') + ' preserveAspectRatio="xMidYMid meet">';
    const markup = svgOpen + (o.title ? '<title>' + escAttr(o.title) + '</title>' : '') + '<g class="iso-root">' + html + '</g></svg>';
    if (!this.host || typeof document === 'undefined') { this._markup = markup; return markup; }
    if (this.svg && this.svg.parentNode === this.host) {
      const tmp = document.createElement('div'); tmp.innerHTML = markup;
      const fresh = tmp.firstChild; this.host.replaceChild(fresh, this.svg); this.svg = fresh;
    } else {
      const tmp = document.createElement('div'); tmp.innerHTML = markup;
      this.svg = tmp.firstChild;
      if (o.replace !== false) { const old = this.host.querySelector(':scope > svg.iso'); if (old) old.remove(); }
      this.host.appendChild(this.svg);
    }
    this.rootEl = this.svg.querySelector('.iso-root');
    this.root.el = this.rootEl;
    this._mapEls(this.svg);
    this._containers = new Map();
    this._bindEvents();
    this._observe();
    this.built = true;
    this.needsRender = false;
    if (this.reduced && !this.reducedApplied) { this.reducedApplied = true; this.playing = false; this.seek(o.restTime ?? this.settleTime()); }
    else this.update(0);
    this.emit('render');
    clock.kick();
    return this;
  }
  _viewBox() {
    const o = this.opts;
    if (o.view) return o.view.slice();
    const b = this.root.sb, p = o.padding;
    if (!b || !isFinite(b[0])) return [0, 0, 100, 100];
    const ex = o.extend || [0, 0, 0, 0]; // [top, right, bottom, left] extra room for motion
    let x = b[0] - p - ex[3], y = b[1] - p - ex[0], w = b[2] - b[0] + 2 * p + ex[1] + ex[3], h = b[3] - b[1] + 2 * p + ex[0] + ex[2];
    if (o.aspect) { const a = o.aspect; if (w / h > a) { const nh = w / a; y -= (nh - h) / 2; h = nh; } else { const nw = h * a; x -= (nw - w) / 2; w = nw; } }
    if (o.zoom && o.zoom !== 1) { const cx = x + w / 2, cy = y + h / 2; w /= o.zoom; h /= o.zoom; x = cx - w / 2; y = cy - h / 2; }
    return [x, y, w, h];
  }
  refit() { this.measure(); this.vb = this._viewBox(); if (this.svg) this.svg.setAttribute('viewBox', this.vb.map(fmt).join(' ')); return this; }
  _mapEls(scope) {
    const els = scope.querySelectorAll('[data-uid]');
    for (const el of els) { const n = this.byUid.get(+el.getAttribute('data-uid')); if (n) n.el = el; }
    this.flows = Array.from(this.svg.querySelectorAll('[data-flow]'));
  }
  /* SVG markup of the scene at rest (works without a DOM) */
  toString() {
    if (this.svg) return this.svg.outerHTML;
    const host = this.host; this.host = null;
    const m = this.render(); this.host = host;
    return m;
  }

  /* ── events (delegated) ── */
  _nodeFrom(el, evt) {
    while (el && el !== this.svg) {
      if (el.hasAttribute && el.hasAttribute('data-uid')) {
        const n = this.byUid.get(+el.getAttribute('data-uid'));
        if (n && n.handlers && (n.handlers[evt] || (evt === 'click' && n.handlers.press))) return n;
      }
      el = el.parentNode;
    }
    return null;
  }
  _bindEvents() {
    const svg = this.svg;
    svg.addEventListener('click', (e) => { const n = this._nodeFrom(e.target, 'click'); if (n) { n.emit('click', e); n.emit('press', e); } });
    svg.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const n = this._nodeFrom(e.target, 'click');
      if (n && e.target.getAttribute('data-uid') == n.uid) { e.preventDefault(); n.emit('click', e); n.emit('press', e); }
    });
    let hover = null;
    svg.addEventListener('pointerover', (e) => {
      const n = this._nodeFrom(e.target, 'hover');
      if (n !== hover) { if (hover) hover.emit('leave', e); hover = n; if (n) n.emit('hover', e); }
    });
    svg.addEventListener('pointerleave', (e) => { if (hover) { hover.emit('leave', e); hover = null; } });
    svg.addEventListener('focusin', (e) => { const n = this._nodeFrom(e.target, 'focus'); if (n) n.emit('focus', e); });
    svg.addEventListener('pointerdown', (e) => { const n = this._nodeFrom(e.target, 'down'); if (n) n.emit('down', e); });
    svg.addEventListener('pointerup', (e) => { const n = this._nodeFrom(e.target, 'up'); if (n) n.emit('up', e); });
  }
  _observe() {
    if (this._io || typeof IntersectionObserver === 'undefined') return;
    this._io = new IntersectionObserver((es) => { for (const e of es) this.visible = e.isIntersecting; if (this.visible) clock.kick(); });
    this._io.observe(this.svg);
  }

  /* ── animation API ── */
  timeline(opt = {}) { const tl = new Timeline(this, opt); this.timelines.push(tl); this._wake(); return tl; }
  _removeTimeline(tl) { const i = this.timelines.indexOf(tl); if (i >= 0) this.timelines.splice(i, 1); }
  /* reactive tween from current values */
  to(target, props, opt = {}) {
    const nodes = this.resolve(target);
    const dur = this.reduced ? 0 : opt.duration ?? 0.3;
    /* overwrite running reactive tweens on the same properties */
    for (const tl of this.timelines) if (tl.reactive && !tl.done) for (const [k, tr] of tl.tracks) if (nodes.includes(tr.node) && tr.prop in props) tl.tracks.delete(k);
    const tl = new Timeline(this, { reactive: true, start: this.time + (opt.delay || 0) });
    tl.to(nodes, props, { ...opt, duration: dur, ease: opt.ease ?? 'out' }, 0);
    this.timelines.push(tl);
    this._wake();
    return tl;
  }
  /* per-frame function fn(time, dt, scene); return handle with stop() */
  loop(fn) {
    const b = { fn, stopped: false, stop: () => { b.stopped = true; this.behaviors = this.behaviors.filter((x) => x !== b); } };
    this.behaviors.push(b); this._wake();
    return b;
  }
  /* time at which every finite timeline has finished (rest pose for reduced motion / posters) */
  settleTime() {
    let t = 0;
    for (const tl of this.timelines) if (tl.repeat >= 0 && !tl.reactive) t = Math.max(t, tl.start + tl.total);
    return t;
  }
  play() { this.playing = true; this._wake(); return this; }
  pause() { this.playing = false; return this; }
  toggle() { return this.playing ? this.pause() : this.play(); }
  /* jump to absolute time (timelines and behaviours are functions of time) */
  seek(t) {
    for (const tl of this.timelines) { tl.reset(); if (tl.lastT !== null) tl.lastT = null; }
    this.time = t;
    this.update(0, true);
    return this;
  }
  reset() { return this.seek(0); }
  tick(dt) {
    if (this.destroyed) return;
    if (this.needsRender) { this.render(); }
    if (!this.built) return;
    if (this.playing) this.time += dt * this.timeScale;
    this.update(dt);
    this.emit('tick', this.time);
  }
  _wantsFrame() {
    if (this.destroyed || !this.visible) return false;
    if (this.needsRender || this.pending.size) return true;
    if (!this.playing) return false;
    return this.behaviors.length > 0 || (this.flows && this.flows.length > 0) || this.timelines.some((t) => !t.done && !t.paused);
  }
  _wake() { clock.kick(); }
  _touch(n) { this.pending.add(n); clock.kick(); }

  update(dt = 0, seeking = false) {
    /* reset additive channels */
    for (const n of this.touchedA) { const a = n.a; a.x = a.y = a.z = 0; a.scale = a.opacity = 1; n.moved = true; this.pending.add(n); }
    this.touchedA.clear();
    for (const tl of this.timelines.slice()) {
      tl.apply(this.time);
      if (tl.done && tl.reactive) this._removeTimeline(tl);
    }
    for (const b of this.behaviors.slice()) if (!b.stopped) b.fn(this.time, dt, this);
    if (this.flows) for (const el of this.flows) {
      const sp = +el.getAttribute('data-flow') || 0;
      el.style.strokeDashoffset = fmt(-sp * this.time);
    }
    this.sync();
  }
  /* additive offset helper for behaviours */
  nudge(node, key, value) {
    if (key === 'scale' || key === 'opacity') node.a[key] *= value; else node.a[key] += value;
    node.moved = true;
    this.touchedA.add(node);
    this.pending.add(node);
  }

  /* push node changes to the DOM */
  sync() {
    if (!this.built || !this.pending.size) { this.pending.clear(); return; }
    const v = this.view, place = new Set();
    const nodes = Array.from(this.pending);
    this.pending.clear();
    /* outermost dirty nodes first so a group re-render covers its children */
    const dirty = nodes.filter((n) => n.dirty && n.el !== undefined);
    const isCovered = (n) => { let p = n.parent; while (p) { if (p.dirty && dirty.includes(p)) return true; p = p.parent; } return false; };
    for (const n of dirty) {
      if (isCovered(n)) continue;
      if (n.isGroup && n.flat) { this._rerenderFlat(n, place); continue; }
      if (!n.el) continue;
      const html = n.content(v, n.frame);
      n.el.innerHTML = html;
      if (n.isGroup) { this._mapEls(n.el); const c = this._containers.get(n); if (c) c.stale = true; }
      else if (this.flows && n.el.querySelector('[data-flow]')) this.flows = Array.from(this.svg.querySelectorAll('[data-flow]'));
      n.restyle = true; n.sync(v);
      place.add(n);
    }
    for (const n of nodes) {
      if (n.isGroup && n.flat) {
        if (n.moved || n.restyle) for (const it of n.items()) { it.sync(v); place.add(it); }
        n.moved = false; n.restyle = false;
        continue;
      }
      if (n.moved || n.restyle) { n.sync(v); if (n.moved) place.add(n); n.moved = false; }
    }
    /* propagate bound changes to atomic ancestors and place */
    const containers = new Map();
    for (const n of place) {
      let cur = n;
      for (;;) {
        const c = containerOf(cur);
        if (!c) break;
        if (!containers.has(c)) containers.set(c, new Set());
        containers.get(c).add(cur);
        if (c === this.root || c.isGroup === false) break;
        /* the container's own bounds changed: it may need placing in its parent */
        c.rest = c.aabb();
        cur = c;
      }
    }
    for (const [c, movers] of containers) this._place(c, movers);
  }
  _rerenderFlat(g, place) {
    const v = this.view, cf = g.childFrame(g.frame || IDENTITY);
    for (const c of g.children) {
      if (c.isGroup && c.flat) { c.frame = cf; c.dirty = true; this._rerenderFlat(c, place); continue; }
      if (!c.el) continue;
      c.el.innerHTML = c.content(v, cf);
      if (c.isGroup) this._mapEls(c.el);
      c.sync(v); place.add(c);
    }
    g.dirty = false;
  }
  _place(container, movers) {
    if (container.sortMode === 'none') return;
    let st = this._containers.get(container);
    const zs = this.view.ZS;
    if (!st || st.stale) {
      st = { dyn: new Set(), slotOf: new Map(), bySlot: new Map(), placer: null, statics: null, stale: false, parent: container === this.root ? this.rootEl : container.el };
      this._containers.set(container, st);
    }
    if (!st.parent) return;
    let rebuild = !st.placer;
    for (const m of movers) if (!st.dyn.has(m)) { st.dyn.add(m); rebuild = true; }
    const touched = new Set();
    const assign = (d) => {
      if (!d.el || d.el.parentNode !== st.parent) return;
      const slot = st.placer.slot(makeItem(d, d.sortBox(), zs, d.order));
      const old = st.slotOf.get(d);
      if (old === slot) { touched.add(slot); return; }
      if (old !== undefined) { const set = st.bySlot.get(old); if (set) set.delete(d); touched.add(old); }
      st.slotOf.set(d, slot);
      let set = st.bySlot.get(slot); if (!set) st.bySlot.set(slot, (set = new Set()));
      set.add(d); touched.add(slot);
    };
    if (rebuild) {
      const order = (container.sorted || []).filter((n) => !st.dyn.has(n) && !n.hidden && n.el);
      st.statics = order.map((n) => makeItem(n, n.sortBox(), zs, n.order));
      st.placer = new Placer(st.statics);
      st.slotOf.clear(); st.bySlot.clear();
      for (const d of st.dyn) assign(d);
    } else for (const m of movers) assign(m);
    for (const slot of touched) {
      const set = st.bySlot.get(slot);
      if (!set || !set.size) continue;
      let items = Array.from(set).map((d) => makeItem(d, d.sortBox(), zs, d.order));
      if (items.length === 2) items.sort(compareItems);
      else if (items.length > 2) items = depthSort(items);
      const refItem = st.statics[slot + 1];
      /* back to front: each element must sit immediately before its successor */
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
  on(evt, fn) { (this.listeners[evt] || (this.listeners[evt] = [])).push(fn); return this; }
  emit(evt, arg) { (this.listeners[evt] || []).forEach((f) => f(arg, this)); }
  setTheme(theme) {
    const old = 'iso-' + this.opts.theme, nu = 'iso-' + theme;
    if (this.svg) { this.svg.classList.remove(old); this.svg.classList.add(nu); }
    if (this.figure) { this.figure.el.classList.remove(old); this.figure.el.classList.add(nu); }
    this.opts.theme = theme;
    return this;
  }
  destroy() {
    this.destroyed = true; clock.remove(this);
    if (this._io) this._io.disconnect();
    if (this.svg) this.svg.remove();
    if (this.figure) this.figure.el.remove();
    this.emit('destroy');
  }
}

function containerOf(n) { let p = n.parent; while (p && p.flat) p = p.parent; return p; }
function escAttr(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
