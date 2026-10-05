/* Iso — an isometric illustration and animation engine. SVG, zero dependencies. */
import * as math from './math.js';
import { Node, Group } from './node.js';
import { Box, Prism, Cylinder, TubeSegment, Sphere, Hull, Panel, Flat, Line, Ribbon, Helix, Text, Pane, Grid, Custom, Face, slabVertices, SLAB_FACES, routePoints, filletPolyline } from './shapes.js';
import { Scene, clock } from './scene.js';
import { Timeline, ease, getEase } from './anim.js';
import { Path, path } from './paths.js';
import { css, injectCSS, THEMES, MATERIALS } from './style.js';
import { figure } from './figure.js';
import { depthSort } from './sort.js';
import { installPrefabs, ICONS, MARK, icon } from './prefabs/index.js';
import { buildDiagram } from './diagram.js';
import { renderSpec, pathFrom } from './spec.js';
import './behaviors.js';
import './export.js';

export const VERSION = '0.1.0';

/* ── primitive factories ── */
function wedgeHull(o) {
  const [x, y, z] = o.at || [0, 0, 0], [w, d, h] = o.size || [20, 20, 10], up = o.up || 'x';
  /* canonical: rises toward +x in a unit cube, then mapped */
  const unit = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [1, 0, 1], [1, 1, 1]];
  const map = { x: (p) => p, '-x': (p) => [1 - p[0], p[1], p[2]], y: (p) => [p[1], p[0], p[2]], '-y': (p) => [p[1], 1 - p[0], p[2]] }[up] || ((p) => p);
  const vertices = unit.map(map).map((p) => [x + p[0] * w, y + p[1] * d, z + p[2] * h]);
  return new Hull({ ...o, at: [0, 0, 0], vertices, faces: [[0, 1, 2, 3], [1, 4, 5, 2], [0, 3, 5, 4], [0, 1, 4], [3, 2, 5]] });
}
function pyramidHull(o) {
  const [cx, cy, z] = o.at || [0, 0, 0], [w, d] = o.size || [20, 20], h = o.h ?? 20;
  const v = [[cx - w / 2, cy - d / 2, z], [cx + w / 2, cy - d / 2, z], [cx + w / 2, cy + d / 2, z], [cx - w / 2, cy + d / 2, z], [cx, cy, z + h]];
  return new Hull({ ...o, at: [0, 0, 0], vertices: v, faces: [[0, 1, 2, 3], [0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]] });
}
function roofHull(o) {
  /* gable roof on a footprint; ridge along `axis` */
  const [x, y, z] = o.at || [0, 0, 0], [w, d, h] = o.size || [40, 30, 14], ax = o.axis || 'x';
  const v = ax === 'x'
    ? [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x, y + d / 2, z + h], [x + w, y + d / 2, z + h]]
    : [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x + w / 2, y, z + h], [x + w / 2, y + d, z + h]];
  const f = ax === 'x' ? [[0, 1, 2, 3], [0, 1, 5, 4], [3, 2, 5, 4], [0, 3, 4], [1, 2, 5]] : [[0, 1, 2, 3], [0, 3, 5, 4], [1, 2, 5, 4], [0, 1, 4], [3, 2, 5]];
  return new Hull({ ...o, at: [0, 0, 0], vertices: v, faces: f });
}

export const shapes = {
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
  rect: (o) => new Flat({ ...o, shape: 'rect' }),
  circle: (o) => new Flat({ ...o, shape: 'circle' }),
  ring: (o) => new Flat({ ...o, shape: 'ring' }),
  poly: (o) => new Flat({ ...o, shape: 'poly' }),
  line: (o) => new Line(o),
  connector: (o) => new Line({ arrow: 'end', ...o, points: routePoints(o.from, o.to, o) }),
  ribbon: (o) => new Ribbon(o),
  helix: (o) => new Helix(o),
  text: (o) => new Text(o),
  pane: (o) => new Pane(o),
  grid: (o) => new Grid(o),
  custom: (o) => new Custom(o),
};

/* Factories that build small groups. */
const builders = {
  /* hollow cylinder split into angular segments (ring buildings, rims, tracks) */
  tube(o) {
    const n = o.segments || 16, g = new Group({ id: o.id, flat: true, class: o.class, material: o.material });
    const [cx, cy, z] = o.at || [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const seg = new TubeSegment({ ...o, id: o.id ? o.id + '-' + i : undefined, at: [cx, cy, z], r: o.r ?? 40, ri: o.ri ?? (o.r ?? 40) * 0.7, h: o.h ?? 10, a0: (360 * i) / n, a1: (360 * (i + 1)) / n });
      g.add(seg);
    }
    return g;
  },
  /* screen-facing label with a leader line from an anchor point */
  label(o) {
    const [x, y, z] = o.at || [0, 0, 0], lift = o.lift ?? 28, g = new Group({ id: o.id, layer: o.layer ?? 1, class: o.class, sort: 'none' });
    if (lift) g.add(new Line({ points: [[x, y, z], [x, y, z + lift]], line: o.line || 'ln-soft' }));
    if (o.dot !== false) g.add(new Flat({ shape: 'circle', at: [x, y, z], r: o.dotSize || 1.6, fill: 'f-ink', line: null }));
    g.add(new Text({ text: o.text, at: [x, y, z + lift], size: o.size || 7, anchor: o.anchor || 'middle', dy: o.dy ?? -5, cls: o.cls || 'tx tx-label', spacing: o.spacing }));
    return g;
  },
  diagram: (o) => buildDiagram(o, make),
};
/* make any object by type name: primitive, builder or prefab */
export function make(type, opts = {}) {
  if (shapes[type]) return shapes[type](opts);
  if (builders[type]) return builders[type](opts);
  return makePrefab(type, opts);
}

/* ── prefabs ── */
export const prefabs = {};
/* define(name, build(g, opts, Iso)) — build populates the group in local coordinates
   (origin = footprint centre at the base); `at` and `rot` place it. */
export function define(name, build, meta = {}) {
  prefabs[name] = { build, meta };
  Group.prototype[name] = function (opts = {}) { return this.add(makePrefab(name, opts)); };
  if (!Scene.prototype[name]) Scene.prototype[name] = function (opts) { return this.root[name](opts); };
  return build;
}
export function makePrefab(name, opts = {}) {
  const p = prefabs[name];
  if (!p) throw new Error('Iso: unknown prefab "' + name + '"');
  const rot = (opts.rot || 0) + ({ right: -90, back: 180, 'back-right': 180, 'back-left': 90 }[opts.facing] || 0);
  const g = new Group({ ...opts, rot, sort: opts.sort || p.meta.sort || 'auto', flat: opts.flat ?? p.meta.flat });
  g.prefab = name;
  const api = p.build(g, opts, Iso);
  if (api && typeof api === 'object') Object.assign(g, api);
  return g;
}

for (const k in shapes) {
  Group.prototype[k] = function (o = {}) { return this.add(shapes[k](o)); };
  Scene.prototype[k] = function (o) { return this.root[k](o); };
}
for (const k in builders) {
  Group.prototype[k] = function (o = {}) { return this.add(builders[k](o)); };
  Scene.prototype[k] = function (o) { return this.root[k](o); };
}
Group.prototype.group = function (opts = {}, fn) {
  if (typeof opts === 'function') { fn = opts; opts = {}; }
  const g = new Group(opts);
  if (fn) fn(g);
  return this.add(g);
};

/* Iso.scene(host, opts): host may be a selector or element. With opts.figure, the scene is
   framed with captions and scene.status(text) updates the state caption. */
function scene(host, opts = {}) {
  if (opts.figure && host) {
    const f = figure(host, { theme: opts.theme, ...opts.figure });
    if (opts.colors && opts.colors.bg) f.el.style.setProperty('--iso-fig-bg', 'color-mix(in oklab, ' + opts.colors.bg + ' 92%, ' + (opts.colors.fg || '#fff') + ')');
    if (opts.colors && opts.colors.fg) { f.el.style.setProperty('--iso-fig-cap', 'color-mix(in oklab, ' + opts.colors.fg + ' 45%, transparent)'); f.el.style.setProperty('--iso-fig-cap-strong', 'color-mix(in oklab, ' + opts.colors.fg + ' 70%, transparent)'); }
    const s = new Scene(f.stage, opts);
    s.figure = f;
    s.status = (t) => { f.status(t); return s; };
    return s;
  }
  const s = new Scene(host, opts);
  s.status = () => s;
  return s;
}

export const Iso = {
  VERSION, scene, Scene, Node, Group, Face, Timeline, Path, path, ease, getEase, clock,
  shapes, prefabs, define, make, makePrefab, figure, pathFrom,
  render: (spec, host) => renderSpec(Iso, spec, host), css, injectCSS, THEMES, MATERIALS, depthSort,
  math, rng: math.rng, routePoints, filletPolyline, ICONS, MARK, icon,
  advance: (dt) => clock.advance(dt),
  set manual(v) { clock.manual = !!v; },
  get manual() { return clock.manual; },
  scenes: () => Array.from(clock.scenes),
};
Scene.path = path;
installPrefabs(define, Iso);
export default Iso;
