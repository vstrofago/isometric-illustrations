# Iso API reference

Load `iso.js` with a `<script>` tag (global `Iso`) or import `dist/iso.esm.js` as a module.
All lengths are world units (≈ px at the fitted size). Angles are degrees.

## Coordinates and projection

- `x` → screen right-down, `y` → screen left-down, `z` → up. Larger x, y or z = closer to the viewer.
- True isometric (30°) by default; `angle: 26.565` gives the 2:1 "pixel" dimetric look.
- Visible faces of a solid: **top** (+z), **left** (+y, screen-left), **right** (+x, screen-right).
- Plan angles (circles, paths, `rot`) are measured from +x toward +y, which is **clockwise on screen**.
- The viewBox fits the drawing automatically (with `padding`), so you never compute screen offsets.

## Iso namespace

| Member | Purpose |
|---|---|
| `Iso.scene(host, opts)` | Create a scene in a selector/element. Returns a `Scene`. |
| `Iso.render(spec, host?)` | Build a scene from a JSON spec (see `spec.md`). |
| `Iso.define(name, build, meta?)` | Register a prefab: `build(g, opts, Iso)` fills group `g` in local coords (origin = footprint centre, base). `meta`: `{ sort: 'auto' \| 'none', flat: bool }`. May return an object of methods merged into the group. |
| `Iso.make(type, opts)` | Create a detached node of any type (primitive, builder or prefab). |
| `Iso.prefabs`, `Iso.shapes` | Registries. `Object.keys(Iso.prefabs)` lists prefabs. |
| `Iso.path.*` | World paths: `line(a,b)`, `polyline(pts,{radius,closed})`, `circle({center,r,start,ccw})`, `arc({center,r,from,to})`, `bezier(p0,p1,p2,p3)`, `hop(a,b,height)`, `rect({at,size,r})`, `join(...)`. A path has `length`, `at(u)`, `tangent(u)`, `heading(u)`, `points`, `reverse()`, `offset(dx,dy,dz)`. |
| `Iso.ease` | Easing functions (see Animation). |
| `Iso.rng(seed)` | Seeded random: `r()`, `r.range(a,b)`, `r.int(a,b)`, `r.pick(arr)`, `r.chance(p)`. |
| `Iso.ICONS`, `Iso.icon(name, cls)`, `Iso.MARK` | Built-in 24-grid line icons; the 9×9 pixel star. |
| `Iso.THEMES`, `Iso.MATERIALS` | Theme parameters and material definitions. |
| `Iso.manual = true`, `Iso.advance(dt)`, `Iso.scenes()` | Manual clock for export/tests (`render.mjs` does this for you). |
| `Iso.figure(host, opts)` | Just the caption frame, if you need it without a scene. |

## Scene options

```js
Iso.scene('#app', {
  theme: 'dark',          // dark | light | paper | blueprint | terminal | inherit (uses host --bg/--fg)
  colors: { bg: '#0f1012', fg: '#f0efe9', accent: '#ff6a3d' },   // optional brand palette
  figure: { index: 'Fig. 1', title: 'Name', hint: 'What to do', status: 'state', maxWidth: 900 },
  label: 'Accessible description of the figure',
  padding: 24,            // fit padding (world units)
  extend: [top, right, bottom, left],   // extra room for things that move outside the rest pose
  aspect: 16 / 9,         // force the viewBox aspect
  zoom: 1.2,              // crop into the fitted view
  view: [x, y, w, h],     // explicit viewBox (disables fitting)
  height: 480,            // fixed CSS height
  angle: 30,              // projection angle
  autoplay: true,         // start the clock
  reducedMotion: 'static',// 'static': show the rest pose when the user prefers reduced motion; 'ignore'
  restTime: 2.5,          // time shown under reduced motion (default: after finite timelines)
});
```

## Scene methods

| Method | |
|---|---|
| `s.<primitive>(opts)`, `s.<prefab>(opts)` | Add an object to the root; returns the node. |
| `s.group(opts, fn)` | Add a group; `fn(g)` fills it. `opts`: `at`, `rot`, `flat`, `sort`. |
| `s.add(node)` / `s.add('type', opts)` | Add a detached node, or by type name. |
| `s.get(id)`, `s.find(pred)`, `s.all(pred)` | Look nodes up. |
| `s.resolve(target)` | Targets everywhere accept: a node, an id, `'#id'`, `'.class'`, `'prefix*'`, an array, or a predicate. |
| `s.timeline(opts)` | New deterministic timeline (see Animation). |
| `s.to(target, props, opts)` | Reactive tween from current values (`duration` 0.3, `ease` 'out'). Returns a thenable. |
| `s.loop(fn)` | Per-frame `fn(time, dt, scene)`; returns `{ stop() }`. |
| `s.float / pulse / blink / spin / travel / orbit / assemble / drawOn / typewriter / hoverLift` | Motion presets (see Animation). |
| `s.play()`, `s.pause()`, `s.toggle()`, `s.seek(t)`, `s.reset()`, `s.time`, `s.timeScale` | Clock. |
| `s.status(text)` | Update the figure's state caption (scenes made with `figure`). |
| `s.setTheme(name)` | Switch theme live. |
| `s.project([x,y,z])` | World point → CSS px inside the SVG (for HTML overlays/tooltips). |
| `s.refit()` | Recompute the viewBox after big changes. |
| `s.toSVG(opts)` · `s.toPNG({scale})` · `s.download(name, 'svg'\|'png')` | Export (colours inlined). |
| `s.toString()` | SVG markup at rest (works without a DOM). |
| `s.on('render'\|'tick'\|'destroy', fn)`, `s.destroy()` | Lifecycle. |

## Nodes

Every object accepts: `id`, `class` (space-separated; used by `'.class'` targets), `opacity` (initial), `material`,
`color` (tint), `glow`, `layer` (lower draws first when overlapping; labels use 1), `hidden`, `style`
(CSS custom properties object), `anchor` (`'bottom'|'center'|'top'` for scale), and for interaction
`interactive`, `label` (aria-label), `role`, `pressed`.

```js
node.set('z', 10); node.set({ x: 4, opacity: 0.5 });   // x/y/z are world offsets from the rest pose
node.set('h', 40);                                     // any geometry option re-draws the node
node.get('z');
node.to({ z: 6 }, { duration: 0.2 });                  // reactive tween
node.on('click', fn);  // also: press, hover, leave, focus, down, up. click/press make it focusable (Enter/Space).
node.remove();
group.add(node); group.find(pred); group.findAll(pred); group.items(); group.children;
```

Animatable: `x`, `y`, `z`, `scale`, `opacity`, and any numeric option (`h`, `r`, `rot`, `reveal`, `chars`, `power`, …).
Arrays (e.g. `points`) can be set but not tweened.

## Primitives

### Solids

| Type | Options |
|---|---|
| `box` | `at` (min corner) or `center:[cx,cy,z]`; `size:[w,d,h]`; `r` plan corner radius; `chamfer` top bevel; `rot` around its own centre; `n` arc samples; `tone:{top,left,right,bevel}` fill classes; face drawers `top`, `left`, `right` = `(face, node) => …`; `faces: (get) => …` with `get('left'\|'right'\|'top'\|'back-left'\|'back-right')`. |
| `prism` | `points:[[x,y],…]` plan polygon (convex or concave), `at` offset, `z`, `h`, `chamfer` (convex only). |
| `cylinder` | `at` (base centre), `r`, `h`, `rTop` (frustum), `chamfer`, `bands:[z…]` rings on the side, `ribs:n` vertical lines (`ribFrom`, `ribTo`), `rings:[r…]` on the top, `top:false`, `topFace(face)`. |
| `cone` | Like `cylinder` with `rTop: 0`. Inverted cones: `r: 0.01, rTop: R`. |
| `tube` | Hollow cylinder split into angular `segments` (default 16) so things inside sort correctly: `at`, `r`, `ri`, `h`, `bands`, `ribs`, `innerBands`, `topRings`, `topRadials`. |
| `sphere` | `at` (centre), `r`, `equator`. |
| `panel` | Rounded slab standing on a plane — phones, screens, signs: `plane:'left'\|'right'\|'top'`, `at` = bottom-left of the front face (`top`: back-left of the top face), `w`, `h`, `t` thickness, `r`, `front(face)`. |
| `hull` | Convex polyhedron: `vertices:[[x,y,z]…]`, `faces:[[i,j,k,…]…]`, `crease` (deg, default 28: smaller angles render smooth). |
| `slab` | Parallelepiped: `origin`, edge vectors `u`, `v`, `w` (tilted lids, ramps). |
| `wedge` | `at` (min corner), `size:[w,d,h]`, `up:'x'\|'-x'\|'y'\|'-y'` (the high side). |
| `pyramid` | `at` (base centre), `size:[w,d]`, `h`. |
| `roof` | Gable: `at` (min corner), `size:[w,d,h]`, `axis:'x'\|'y'` (ridge direction). |

### Flats, lines, text

| Type | Options |
|---|---|
| `rect` | On a horizontal plane: `at` (min corner, z = plane height), `size:[w,d]`, `r`, `rot`, `fill` (class or null), `line` (class or null), `dash`. |
| `circle` · `ring` · `poly` | `at` (centre / offset), `r`, `ri` (ring), `points` (poly); same fill/line/dash. |
| `grid` | `at`, `size:[w,d]`, `step`, `line`. |
| `ribbon` | A strip along `points`/`path`: `width`, `z`, `fill` (default `f-road`), `line`, `center` (dash string), `flow`. |
| `line` | `points:[[x,y,z]…]` or `path`; `line` class; `dash`; `flow` (dash speed, units/s); `width`; `arrow:'end'\|'start'\|'both'`; `arrowSize`; `dots` (end dot radius); `closed`; `reveal` (0–1, draw-on). |
| `connector` | Orthogonal route on a plane: `from:[x,y]`, `to:[x,y]`, `z`, `route:'auto'\|'x'\|'y'\|'xyx'\|'yxy'\|'straight'\|[[x,y]…]`, `radius`; plus `line` options. Arrow at the end by default. |
| `helix` | Coil between `a` and `b`: `r`, `turns`. |
| `text` | `text` (`\n` for lines), `at`, `plane:'screen'\|'top'\|'left'\|'right'\|'top-y'`, `size`, `anchor:'start'\|'middle'\|'end'`, `cls`, `weight`, `spacing`, `dx`/`dy` (screen only), `chars` (typewriter). |
| `label` | Screen-facing callout with a leader: `at`, `text`, `lift` (leader height, 28), `size`, `anchor`, `dot`. |
| `pane` | 2D content on a plane: `at` (top-left corner), `plane`, `w`, `h`, `r`, `fill` (default glass, or `false`), `line` (or `false`), custom axes `u`/`v`, `draw(face, node)`. |
| `custom` | Escape hatch: `draw(d, node)` with the Draw context; give `bounds:[x0,y0,z0,x1,y1,z1]` for sorting. |
| `diagram` | Grid of nodes + routed edges + zones + packets — see `diagrams.md`. |

### Face drawers

Face callbacks receive a `Face` whose `(u, v)` origin is the face's top-left as seen on screen,
`u` → right, `v` → down, in world units; `face.w`, `face.h` are its size.

```js
left: (f) => {
  f.rect(6, 6, f.w - 12, 30, { r: 3, fill: 'f-screen', line: 'ln' });   // a screen
  f.hlines(8, 44, 20, 10, 5);                                           // vents (n lines)
  f.vlines(u, v, w, h, n, cls);
  f.grid(4, 4, f.w - 8, f.h - 8, cols, rows, { gap: 2, fill: 'f-screen', each: (i, j) => (i === j ? { fill: 'f-lit' } : null) });
  f.circle(u, v, r, { fill, line });
  f.line(u1, v1, u2, v2, 'ln-soft');
  f.poly([[u, v], …], { fill, line, close });
  f.text('LABEL', f.w / 2, f.h / 2, { size: 5, anchor: 'middle', cls: 'tx tx-label' });
  f.svg('<path class="ln-strong" d="…"/>', { u: 4, v: 4, transform: 'scale(.5)' });   // any SVG in face units
  f.sub(u, v, w, h);   // a sub-face
}
```

## Materials and classes

Materials (`material: '…'`): `lit` (bright, pair with `glow: true`), `screen` (dark glass), `dark`,
`glass` (translucent), `wire` (no fill), `ghost` (faint lines), `solid` (ink), `paper` (lighter),
`accent` (uses `--iso-accent`), and `color: '#hex'` (tint).

Fill classes for face drawers and flats: `f-top f-left f-right f-bevel f-dark f-screen f-screen-on f-key
f-lit f-glass f-ink f-road f-bg f-accent f-soft`. Line classes: `ln` (edges), `ln-soft` (detail),
`ln-faint` (texture), `ln-strong`, `ln-bold`, `ln-lit`, `ln-accent`. Text classes: `tx`, `tx-label`
(mono uppercase, tracked), `tx-lit`, `tx-strong`, `tx-on-lit`.

Colour always comes from CSS custom properties, so themes and materials switch without re-drawing.
Override per scene with `colors`, per node with `style: { '--iso-accent': '#e05a2b' }`.

## Animation

### Timelines (deterministic, seekable)

```js
const tl = s.timeline({ repeat: -1, yoyo: false, delay: 0.5, repeatDelay: 1 });
tl.to('card', { z: 12 }, { duration: 0.6, ease: 'out' })
  .to('card', { x: 40 }, { duration: 1 }, '<')       // same start as the previous step
  .from('.tree', { opacity: 0, z: 20 }, { duration: 0.5, stagger: { each: 0.03, from: 'depth' } })
  .fromTo('lid', { rot: 0 }, { rot: 90 }, { duration: 0.8 }, '+=0.2')
  .set('led', { material: 'lit' }, 2)                 // instant change at t = 2
  .call(() => s.status('done'))
  .wait(1);
```

Positions: a number (absolute), `'<'` (start of previous), `'>'` (end), `'+=0.2'`, `'-=0.2'`, `'<0.3'`.
Stagger: a number, or `{ each | amount, from: 'start'|'end'|'center'|'random'|'depth'|'front' }`.
Eases: `linear`, `in/out/inOut` + `Quad|Cubic|Quart|Expo|Sine|Back`, `outElastic`, `outBounce`,
`out` (0.16,1,0.3,1 — the default for entrances), `standard`, `smooth`, `Iso.ease.bezier(x1,y1,x2,y2)`,
`Iso.ease.steps(n)`, `Iso.ease.spring(k)`, or any `t => t` function.

### Presets

| Preset | Options |
|---|---|
| `s.assemble(target?, o)` | Entrance: drop in and fade. Default target: every top-level item. `drop` 36, `duration` 0.8, `stagger` 0.05, `from` 'depth', `delay` 0.15, `filter`. |
| `s.float(target, o)` | Vertical bob (additive): `amp` 3, `period` 3, `phase`, `stagger` 0.17. |
| `s.travel(target, path, o)` | Move along a world path: `duration` or `speed`, `offset`, `spread` (between several nodes), `orient`, `orientOffset`, `yoyo`, `once`, `lift`, `ease`. The node's footprint centre rides the path. |
| `s.orbit(target, o)` | `travel` on a circle: `center`, `r`, `start`, `ccw`. |
| `s.pulse(target, o)` | Opacity breathing: `min` .35, `max` 1, `period` 2, `stagger`. |
| `s.blink(target, o)` | On/off: `period` 1, `duty` .5, `stagger`, `low` 0. |
| `s.spin(target, o)` | Rotate around z: `speed` (deg/s). Re-draws each frame: keep it to small objects. |
| `s.drawOn(target, o)` | Lines draw themselves: `duration`, `stagger`, `delay`. |
| `s.typewriter(target, o)` | Text appears letter by letter: `perChar` .05 or `duration`. |
| `s.hoverLift(target, o)` | Raise on hover: `z` 4. |

Moving objects are re-sorted every frame against everything they overlap, so they pass behind and
in front of other objects correctly. Under `prefers-reduced-motion` the scene shows its rest pose.

## Export (browser)

`await s.toPNG({ scale: 2 })` → Blob · `s.toSVG()` → string with every colour inlined ·
`s.download('figure', 'png')`. For video and frame-exact stills use `scripts/render.mjs`.

## render.mjs (Node + Playwright)

```
node scripts/render.mjs page.html [--out a.png] [--time 2.5]
node scripts/render.mjs page.html --sheet sheet.png --duration 6       # 8 frames across time
node scripts/render.mjs page.html --gif a.gif --duration 4 --fps 15 --gifWidth 720
node scripts/render.mjs page.html --video a.mp4 --duration 6 --fps 30   # needs ffmpeg
node scripts/render.mjs page.html --svg a.svg
  --actions '[{"t":0.5,"click":"node-id"},{"t":1,"hover":"node-id"},{"t":2,"type":"text"},{"t":3,"key":"Enter"}]'
  --selector <css> --width 1200 --scale 2 --theme light --start 0 --quiet
```

It prints `scenes: [{nodes, settle, timelines, loops, viewBox}]` and any page errors (exit code 5).
