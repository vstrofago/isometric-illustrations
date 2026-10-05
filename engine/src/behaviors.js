// SPDX-License-Identifier: Apache-2.0
/* Motion presets. Each one is a deterministic function of scene time, so scenes can be
   seeked, paused and exported frame by frame. All return a handle with stop(). */
import { Scene } from './scene.js';

const TAU = Math.PI * 2;

function anchorOf(scene, n) {
  if (!n.rest) scene.measure();
  const b = n.rest;
  if (!b) return [0, 0, 0];
  return [(b[0] + b[3]) / 2, (b[1] + b[4]) / 2, b[2]];
}

Object.assign(Scene.prototype, {
  /* gentle vertical bob (additive) */
  float(target, o = {}) {
    const nodes = this.resolve(target), amp = o.amp ?? 3, period = o.period ?? 3, phase = o.phase ?? 0, st = o.stagger ?? 0.17;
    return this.loop((t) => nodes.forEach((n, i) => this.nudge(n, 'z', amp * Math.sin(TAU * (t / period + phase + i * st)))));
  },
  /* opacity breathing between min and max (multiplicative) */
  pulse(target, o = {}) {
    const nodes = this.resolve(target), min = o.min ?? 0.35, max = o.max ?? 1, period = o.period ?? 2, st = o.stagger ?? 0;
    return this.loop((t) => nodes.forEach((n, i) => this.nudge(n, 'opacity', min + (max - min) * (0.5 + 0.5 * Math.sin(TAU * (t / period + i * st))))));
  },
  /* on/off (LEDs, cursors) */
  blink(target, o = {}) {
    const nodes = this.resolve(target), period = o.period ?? 1, duty = o.duty ?? 0.5, st = o.stagger ?? 0, low = o.low ?? 0;
    return this.loop((t) => nodes.forEach((n, i) => {
      const ph = (((t / period + (o.phase || 0) + i * st) % 1) + 1) % 1;
      if (ph >= duty) this.nudge(n, 'opacity', low);
    }));
  },
  /* rotate around the vertical axis (rebuilds geometry each frame: keep spinning objects small) */
  spin(target, o = {}) {
    const nodes = this.resolve(target), speed = o.speed ?? 30;
    const base = nodes.map((n) => n.opts.rot || 0);
    return this.loop((t) => nodes.forEach((n, i) => n.set('rot', base[i] + speed * t)));
  },
  /* move along a world path. o: duration | speed (units/s), offset (0–1), ease, yoyo, orient, spread (offsets across nodes), lift */
  travel(target, path, o = {}) {
    const nodes = this.resolve(target);
    const dur = o.duration ?? (o.speed ? path.length / o.speed : 4);
    const start = o.start ?? this.time, spread = o.spread ?? (nodes.length > 1 ? 1 / nodes.length : 0);
    const ease = o.ease ? (typeof o.ease === 'function' ? o.ease : null) : null;
    let anchors = null;
    const rot0 = nodes.map((n) => n.opts.rot || 0);
    const lift = o.lift || 0;
    return this.loop((t) => (anchors || (anchors = nodes.map((n) => anchorOf(this, n)))) && nodes.forEach((n, i) => {
      let u = (t - start) / dur + (o.offset || 0) + i * spread;
      if (o.repeat === 0 || o.once) u = Math.min(1, Math.max(0, u));
      if (o.yoyo) { const k = ((u % 2) + 2) % 2; u = k > 1 ? 2 - k : k; }
      else if (path.closed || !(o.repeat === 0 || o.once)) u = ((u % 1) + 1) % 1;
      if (ease) u = ease(u);
      const p = path.at(u), a = anchors[i];
      n.set({ x: p[0] - a[0], y: p[1] - a[1], z: p[2] - a[2] + lift });
      if (o.orient) n.set('rot', rot0[i] + path.heading(u) + (o.orientOffset || 0));
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
    tl.from(nodes, { z: o.drop ?? 36, opacity: 0 }, { duration: o.duration ?? 0.8, ease: o.ease ?? 'out', stagger: { each: o.stagger ?? 0.05, from: o.from ?? 'depth' } }, 0);
    return tl;
  },
  /* stroke draw-on for lines/connectors */
  drawOn(target, o = {}) {
    const nodes = this.resolve(target);
    const tl = this.timeline({ delay: o.delay ?? 0 });
    tl.fromTo(nodes, { reveal: 0 }, { reveal: 1 }, { duration: o.duration ?? 1, ease: o.ease ?? 'inOutCubic', stagger: o.stagger ?? 0.1 }, 0);
    return tl;
  },
  /* reveal a Text node character by character */
  typewriter(target, o = {}) {
    const nodes = this.resolve(target);
    const tl = this.timeline({ delay: o.delay ?? 0 });
    nodes.forEach((n) => {
      const len = String(n.opts.text || '').length;
      tl.fromTo(n, { chars: 0 }, { chars: len }, { duration: o.duration ?? len * (o.perChar ?? 0.05), ease: 'linear' }, o.stagger ? undefined : 0);
    });
    return tl;
  },
  /* hover: raise the object a little (reactive) */
  hoverLift(target, o = {}) {
    const nodes = this.resolve(target), z = o.z ?? 4, d = o.duration ?? 0.22;
    nodes.forEach((n) => {
      n.on('hover', () => this.to(n, { z }, { duration: d }));
      n.on('leave', () => this.to(n, { z: 0 }, { duration: d }));
      if (!n.handlers.click) n.opts.interactive = n.opts.interactive ?? false;
    });
    return { stop() {} };
  },
});
