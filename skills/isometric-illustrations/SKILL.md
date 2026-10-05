---
name: isometric-illustrations
description: Create polished isometric illustrations, dioramas and diagrams — static or animated, optionally interactive — as self-contained HTML/SVG, plus PNG, GIF or MP4 exports. Uses the bundled Iso engine (SVG, zero dependencies) with depth sorting, prefabs (devices, buildings, trees, servers, diagram blocks), timelines and travelling objects. Use when someone asks for an isometric drawing, a 3D-looking technical illustration, an isometric architecture/system diagram, an animated hero or explainer figure, a diorama of a place or product, or a "line-art isometric" visual in any medium.
---

# Isometric illustrations with Iso

Iso draws isometric figures in 1px hairlines with near-background fills: calm, technical, legible in
dark and light. You describe objects in **world units**; the engine projects, depth-sorts, frames,
animates and exports them. Everything you need is in this folder:

| Path | What |
|---|---|
| `assets/iso.js` | The engine (browser global `Iso`). Copy it next to your page or inline it. |
| `assets/template.html` · `assets/template-spec.html` | Starting points: JS scene · JSON scene |
| `scripts/new.mjs` | Scaffold a figure: `node scripts/new.mjs out/fig.html [--spec] [--inline]` |
| `scripts/render.mjs` | Look at your work: PNG / contact sheet / GIF / MP4 / SVG, deterministic frames |
| `scripts/build.mjs` | Make a page self-contained (inlines `iso.js`) for sharing or publishing |
| `references/*.md` | API, prefabs, style, animation, composition, diagrams, JSON spec, troubleshooting |

Read `references/style.md` before your first figure and `references/api.md` when you need a detail.

## Workflow

1. **Classify the request.** One of:
   - *Object figure* — one hero object, maybe interactive (a device, a machine, a product).
   - *Diorama* — a place on a platform: many objects, an entrance, ambient motion.
   - *Diagram* — nodes, edges, zones, flowing packets; data-driven (`diagram` builder).
   - *Explainer* — a short scripted sequence (timeline) that tells one idea.
2. **Plan on paper, in world units.** Pick the platform size (typically 160–620 wide), list each object
   with `at:[x, y, z]`, choose the **one lit moment** and at most **one entrance + two loops** of motion.
   Axes: `x` → screen right-down, `y` → screen left-down, `z` → up. Larger x/y/z is closer to the viewer.
3. **Scaffold.** `node scripts/new.mjs <dir>/<name>.html` (JS) or `--spec` (JSON). JSON is safer for
   simple figures and diagrams; JS for custom geometry, interaction or scripted logic.
4. **Build with prefabs first**, primitives second (see `references/prefabs.md`). Wrap any custom
   object in `Iso.define('name', (g, o) => { … })` so it is placed with `at`/`rot` like a prefab.
5. **Render and look.** Always, if you can run Node:
   - `node scripts/render.mjs fig.html` → `fig.png` at the rest pose (after entrances).
   - `--sheet sheet.png --duration 6` → 8 frames across time, to check motion and depth while moving.
   - `--actions '[{"t":0.5,"click":"pc-body"},{"t":2,"type":"hi"}]'` → test interactions.
   - The script prints page errors and exits non-zero on them. Fix every error.
   Open the PNG and check the checklist below. Iterate until it passes.
6. **Deliver.** A self-contained HTML (`node scripts/build.mjs fig.html`) is the primary artifact. Add
   exports when useful: `--gif out.gif`, `--video out.mp4`, `--svg out.svg`, or a still `--out still.png`.
   If you could not render (no Node/Playwright), say so plainly; do not claim you checked the image.

## Minimal figure (JS)

```html
<main id="app"></main>
<script src="iso.js"></script>
<script>
const s = Iso.scene('#app', { figure: { index: 'Fig. 1', title: 'Hello', hint: 'A first figure', status: 'ready' } });
s.platform({ size: [160, 120] });          // top surface is z = 0
s.laptop({ at: [-10, 0, 0] });             // prefabs: `at` = footprint centre at the base
s.card({ id: 'card', at: [44, 24, 0] });   // lit by default: the one lit moment
s.float('card', { amp: 4, period: 2.6 });  // ambient loop
s.assemble();                              // entrance: drop in back to front
</script>
```

## Minimal figure (JSON)

```js
Iso.render({
  figure: { index: 'Fig. 2', title: 'Request path' },
  objects: [
    { type: 'platform', size: [300, 180] },
    { type: 'diagram', grid: 90, origin: [-90, 0],
      nodes: [ { id: 'web', cell: [0, 0], icon: 'globe', label: 'Web' },
               { id: 'api', cell: [1, 0], icon: 'server', label: 'API', material: 'lit', glow: true },
               { id: 'db',  cell: [2, 0], type: 'database' } ],
      edges: [ { from: 'web', to: 'api', packets: 2 }, { from: 'api', to: 'db', packets: 1 } ] }
  ],
  animations: [ { type: 'assemble', stagger: 0.08 } ],
  interactions: [ { target: ['web', 'api'], hover: 'lift' } ]
}, '#app');
```

## Placement conventions (the most common source of mistakes)

| Thing | `at` means |
|---|---|
| Prefabs (`laptop`, `tree`, `server`, …) and groups | footprint **centre** at the base; `rot` turns around it (use 90° steps) |
| `box`, `rect`, `roof`, `wedge` | **min corner** `[x, y, z]` with `size: [w, d, h]` — or use `center: [cx, cy, z]` |
| `cylinder`, `cone`, `tube`, `circle`, `pyramid` | centre of the base |
| `sphere` | centre |
| `panel`, `pane` | a corner of the face (see api.md) |
| `platform` | centre; its top surface is z = 0 |

Things on a platform start at `z: 0`; things on a box of height `h` start at `z: h`.
Screens and fronts face **+y (screen-left)** by default; `facing: 'right'` turns a prefab to +x.

## Style rules (short form — full version in references/style.md)

- **Hairlines carry the form.** Fills stay a hair off the background; no gradients, no drop shadows.
- **One lit moment.** At most one object (or one kind of small object) uses `material: 'lit'` / `glow`.
  Never light a large surface.
- **Detail is drawn, not implied**: vents, slots, keys, windows, screws — via face drawers.
- **Rounded and chamfered**: boxes get `r` (plan radius) and `chamfer` (top bevel) for a machined look.
- **Quiet motion**: one entrance, ≤ 2 ambient loops, durations 0.2–1s for transitions, loops ≥ 2s.
  Everything is optional under reduced motion (handled by the engine).
- **Captions in mono** through the figure frame: index · name · hint · state.
- **Themes**: `dark` (default), `light`, `paper`, `blueprint`, `terminal`, or `colors: {bg, fg, accent}`.
- No people at laptops, no third-party logos, no emoji. Brand marks only when the user supplies them.

## Before you deliver — checklist

- [ ] Rendered PNG inspected: nothing floats, nothing sinks, nothing pokes through what is in front of it.
- [ ] Moving objects checked in a contact sheet: they pass behind and in front of things correctly.
- [ ] Text is legible at the delivered size; labels do not collide; the figure frame captions make sense.
- [ ] One lit moment; materials and lines consistent; the composition breathes (padding, empty space).
- [ ] No page errors from `render.mjs`; interactions work with mouse and keyboard (Tab + Enter).
- [ ] The delivered HTML is self-contained (built with `build.mjs`) or ships with `iso.js` beside it.
- [ ] You told the user what you made, how to open it, and anything you could not verify.

## When something looks wrong

See `references/troubleshooting.md`. The usual suspects: an object placed by its corner instead of its
centre; a concave or enclosing shape sorted as one piece (split it, or use `tube` for rings); a flat
decal at the wrong `z`; an arrow hidden behind a tall node (use the `diagram` builder, which trims
edges); text overflowing a face (shorten it, or use a `label` callout).
