# Prefab catalogue

Every prefab is placed with `at: [x, y, z]` = the centre of its footprint at its base, and `rot`
(degrees around z; 90° steps keep faces readable). `facing: 'right'` = `rot: -90` (fronts face +x).
All prefabs also take the common node options (`id`, `class`, `material`, `color`, `glow`, `layer` …).
Sizes are world units; the defaults are proportioned to sit together on one platform.

List them at runtime: `Object.keys(Iso.prefabs)`. Add your own with `Iso.define` (bottom of this page).

## Ground and scenery

| Prefab | Options | Notes |
|---|---|---|
| `platform` | `size:[w,d]` (240×180), `h` 10, `r` 12, `chamfer` 3, `inset` 10 (inner hairline, 0 = none), `grid` (step), `screws`, `label` (text along the front-left edge), `labelRight`, `labelSize` | Top surface at z = 0. The base of every diorama. |
| `tree` | `kind:'tiered'\|'pine'\|'cone'\|'round'\|'bush'\|'lollipop'`, `r` 6, `h` 20, `scale`, `tiers` | `tiered` matches the reference look (stacked discs). |
| `forest` | `count`, `ring:[ri, ro]` or `size:[w,d]`, `spacing`, `seed`, `kinds:[…]`, `minScale`, `maxScale`, `avoid(x,y)`, `treeClass` | Flat group: each tree sorts on its own. Trees get class `tree`. |
| `plant` | `r` 5, `h` 8, `leaves` 4, `seed` | Pot + foliage. |
| `lamp` | `h` 46, `on` (default true) | Bulb has class `lamp-bulb`. |
| `bench` | `w` 30 | |
| `car` | `length` 22, `w` 11 | Faces +x; use `rot` or `travel(…, {orient:true})`. |
| `solar` | `w` 22, `d` 14 | Dark panel on a post; tile them in a grid. |
| `pin` | `h` 18, `r` 5, `lit`, `shadow` | Map marker. |
| `zone` | `size:[w,d]`, `r`, `label`, `dash` '4 4', `fill`, `z` | Dashed region on the floor. |
| `plaque` | `text`, `size` 6, `w`, `d`, `h` | Small plate lying flat with text. |
| `desk` | `size:[w,d]` (90×46), `h` 34 | Put objects on it at `z: h`. |

## Devices

| Prefab | Options | Notes |
|---|---|---|
| `phone` | `w` 13, `h` 27, `t` 1.6, `screen:'ui'\|'dots'\|'lit'\|'mark'\|'off'`, `stand`, `lying` | Screen faces +y. |
| `card` | `w` 16, `d` 10, `t` 1.2, `lit` (true) | The default "lit moment": a glowing chip card. |
| `laptop` | `w` 40, `d` 28, `open` 105 (lid angle), `screen` | Screen faces +y. |
| `monitor` | `w` 48, `h` 30, `screen` | On a stand, faces +y. |
| `keyboard` | `w` 186, `d` 52, `h` 7 | Full keys (ids `<id>-key-<name>`) when `w ≥ 120`, a printed grid below. API: `press(name, down)`. |
| `deskComputer` | `onStatus(text, state)`, `logo` (SVG path data in a 9 × 9 box), `base` (true) | The reference Fig. 2 machine (≈276×228). API: `power(on?)`, `type(key)`, `press(key, down)`, `body`, `keyboard`, `screenNode`, `state`. CRT power-on animation built in. |
| `server` | `w` 28, `d` 34, `h` 64, `units` 6, `seed` | LEDs are panes with class `led` → `s.blink('.led', …)`. |
| `database` | `r` 16, `tiers` 3, `tierH` 8, `gap` 1.6 | Stacked discs. |
| `chip` | `size` 30, `pins` 6, `h` 3, `label`, `lit`, `die` (material) | |
| `router` | `w` 34, `d` 20, `h` 6 | Antennas; LEDs with class `led`. |

## Architecture and diagrams

| Prefab | Options | Notes |
|---|---|---|
| `building` | `w` 40, `d` 32, `h` 60, `floors`, `windows:'grid'\|'bands'`, `lit` (fraction of lit windows), `seed`, `door`, `roof` (false = none), `antenna` | Window grids on both visible faces. |
| `tower` | `r` 14, `h` 50, `bands`, `ribs`, `cap` | Round building / silo. |
| `gate` | `w` 40, `h` 46, `t` 4, `axis:'x'\|'y'` | Two posts, a beam and a glass pane. `axis:'y'` spans along y (pane faces +x). |
| `conveyor` | `length` 120, `w` 18, `h` 8, `axis:'x'\|'y'`, `rollers`, `legs` (default when `h > 10`), `rails`, `belt`, `legSpacing` | Flat group: tall belts stand on legs with side rails, so boxes ride between the rails and sort correctly. API: `track(lift)` → a world path along the belt for `travel`. |
| `stack` | `layers:[{label, icon, material, color, glow}]` (bottom → top), `size:[w,d]`, `t` 6, `gap` 14, `labels:'callout'\|'face'`, `labelSide` | Layer boxes get class `layer` and ids `<id>-<i>`. |
| `block` | `size:[w,d,h]` (36×36×12), `icon` (name or SVG path), `iconSize`, `label` (front face), `labelSize`, `r`, `chamfer` | The diagram node. Icons: see below. |

## Logistics

| Prefab | Options | Notes |
|---|---|---|
| `parcel` | `size:[w,d,h]` (16×13×11), `open` (flaps up, dark mouth), `label` (printed sticker on the front), `labelLit`, `material` ('paper'), `flapAngle` | API: `open(bool)`, `label(bool)` — switch state cheaply while it travels. |
| `pallet` | `size:[w,d]` (30×26), `load:[cols, rows, layers]`, `boxH`, `partial` (fraction missing on top), `seed` | Wooden pallet, optionally stacked with taped parcels. |
| `rack` | `size:[w,d]` (70×24), `h` 54, `levels` 3, `fill` 0.7, `seed` | Uprights, shelves and parcels (seeded). |
| `forklift` | `lift` (fork height), `load` | Faces +x. Drive it with `travel(…, { yoyo: true, ease: Iso.ease.inOutSine })` — it reverses without turning. |
| `truck` | `length` 90, `w` 40, `h` 44, `floor` 12, `open` (true), `text` | Box truck whose open rear faces +x: point a conveyor at it and fade boxes out at the door. |
| `scanner` | `axis` (belt direction), `w` 30 (clear width), `h` 38, `beamFrom` (belt height), `beamOpacity`, `glow` | Flat group: posts, housing and a lit beam (id `<id>-beam`, class `scan-beam`) that boxes pass through. |
| `tunnel` | `axis`, `length` 30, `w` 30, `h` 36, `roof` 7 | Flat group: a machine hood over a belt with a strip curtain at the exit and a status light (id `<id>-led`). |

See `examples/packing-line.html` for all of them working together: boxes change from open to taped to
labelled as they pass the stations, computed from their position along the path.

## Builders

| Builder | |
|---|---|
| `tube` | Ring/hollow cylinder (see api.md). |
| `label` | Screen-facing callout with a leader line. |
| `diagram` | Nodes + edges + zones + packets (see diagrams.md). |

## Icons

`Iso.ICONS` (24-unit grid, stroke): database, server, user, users, lock, cloud, bolt, globe, code,
terminal, cpu, mail, chart, gear, key, file, search, cart, shield, layers, queue, plug, spark, phone,
wifi, check, bell, play, box, card, pin, eye, clock, flow. Use by name in `block`/`stack`, or draw on
any face: `f.svg(Iso.icon('cloud'), { u: 6, v: 6, transform: 'scale(.6)' })`.

## Defining your own

```js
Iso.define('kiosk', (g, o) => {
  const h = o.h ?? 40;
  g.box({ center: [0, 0, 0], size: [16, 12, h], r: 2, chamfer: 1,
    left: (f) => f.rect(2, 4, f.w - 4, 18, { r: 1.5, fill: 'f-screen', line: 'ln' }) });
  g.cylinder({ at: [0, 0, h], r: 4, h: 3 });
  return { flash() { this.scene.to(this, { z: 4 }, { duration: 0.15 }).then(() => this.scene.to(this, { z: 0 })); } };
}, { sort: 'auto' });

s.kiosk({ id: 'k1', at: [40, 20, 0], h: 44 });
s.get('k1').flash();
```

- Build in local coordinates around the origin (footprint centre, z = 0 at the base).
- `sort: 'auto'` (default) depth-sorts the parts; `'none'` keeps the order you added them (back to front),
  which is right for stacked parts (tree tiers) and for content drawn on faces.
- `flat: true` makes the parts sort individually in the parent (use for scatterings like `forest`).
- Methods you return are merged into the group; `this.scene` is available after the group is added.
  An `onMount(scene)` method runs when the prefab joins a scene (register loops there).
