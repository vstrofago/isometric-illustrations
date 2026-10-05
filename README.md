# Iso

**Isometric illustrations, dioramas and diagrams, drawn in hairlines.**
An SVG engine with depth sorting, animation and export, plus an agent skill that teaches Claude (or any
agent that reads `SKILL.md`) to plan, build, check and ship these figures.

[![CI](https://github.com/vstrofago/isometric-illustrations/actions/workflows/ci.yml/badge.svg)](https://github.com/vstrofago/isometric-illustrations/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
![Zero runtime dependencies](https://img.shields.io/badge/runtime%20dependencies-0-lightgrey.svg)

**[Gallery and playground](https://vstrofago.github.io/isometric-illustrations/)** · [Español](README.es.md)

![Packing line: boxes ride an L-shaped conveyor from a box former through a taping tunnel and a scanner into a truck](docs/img/packing-line.gif)

| | |
|---|---|
| ![Desk computer powering on](docs/img/desk-computer.gif) | ![Service architecture diagram: clients, API, database, queue and worker, with packets in flight](docs/img/architecture.gif) |
| **Desk computer**: click to power on (a CRT line opens into the picture), then type. | **Service architecture**: a diagram from data: edges draw on, then packets flow. |

## Why

Isometric line art explains systems well: machines, places, pipelines, architectures. It is also slow
to draw by hand and hard to animate. Iso lets you describe objects in world units and does the rest:
projection, occlusion, framing, motion and export. The skill packages the know-how so an agent produces
a polished figure from a one-line request.

## Quick start

```html
<div id="app"></div>
<script src="https://cdn.jsdelivr.net/gh/vstrofago/isometric-illustrations@v0.1.0/dist/iso.min.js"></script>
<script>
  const s = Iso.scene('#app', { figure: { index: 'Fig. 1', title: 'Hello' } });
  s.platform({ size: [160, 120] });          // the top surface is z = 0
  s.laptop({ at: [-10, 0, 0] });             // prefabs: `at` is the centre of the footprint
  s.card({ id: 'card', at: [44, 24, 0] });   // the one lit moment
  s.float('card', { amp: 4 });
  s.assemble();                              // drop in, back to front
</script>
```

The same scene as data:

```js
Iso.render({
  figure: { index: 'Fig. 1', title: 'Hello' },
  objects: [
    { type: 'platform', size: [160, 120] },
    { type: 'laptop', at: [-10, 0, 0] },
    { type: 'card', id: 'card', at: [44, 24, 0] },
  ],
  animations: [{ type: 'assemble' }, { type: 'float', target: 'card', amp: 4 }],
}, '#app');
```

Or as an ES module: `import Iso from './dist/iso.esm.js'`.

## The agent skill

`skills/isometric-illustrations/` is a self-contained [Agent Skill](https://agentskills.io): `SKILL.md`,
references, the bundled engine, templates, and scripts to scaffold, render and package figures.

**Claude Code**: add this repository as a plugin marketplace and install the plugin:

```
/plugin marketplace add vstrofago/isometric-illustrations
/plugin install isometric-illustrations@vstrofago
```

**Copy the folder** (Claude Code, or any agent that loads skill folders):

```bash
tools/install-skill.sh                   # ~/.claude/skills
tools/install-skill.sh --project ../app  # ../app/.claude/skills
tools/install-skill.sh --dest <dir>      # anywhere else
```

**claude.ai**: download `isometric-illustrations.zip` from the
[latest release](https://github.com/vstrofago/isometric-illustrations/releases) (or run
`npm run skill:zip`) and upload it in the Skills section of claude.ai settings.

Then ask in plain words:

> Make an animated isometric diagram of our checkout flow: web, API, orders, Postgres and a queue.
>
> Draw a small isometric warehouse with a conveyor and boxes for our landing page hero, dark theme, as an MP4.

The agent plans in world units, builds with prefabs, renders a PNG to check occlusion and framing, and
hands you a single self-contained HTML file (plus PNG, GIF or MP4 if you ask).

## What's inside

- **Primitives**: rounded and chamfered boxes, prisms, cylinders, cones, segmented tubes, spheres,
  panels, hulls, text on planes, orthogonal connectors, ribbons, 2D content on any face.
- **Depth**: topological sorting by separating axes; moving objects re-sort every frame and pass
  behind and in front of things correctly.
- **Motion**: deterministic timelines and presets (`assemble`, `float`, `travel`, `orbit`, `pulse`,
  `blink`, `spin`, `drawOn`, `typewriter`, `hoverLift`); respects `prefers-reduced-motion`.
- **35 prefabs**: devices (phone, laptop, monitor, server, database, chip, a CRT desk computer),
  logistics (boxes, pallets, racks, forklift, truck, conveyor, scanner), architecture (buildings,
  gate, layered stacks, diagram blocks), scenery (platforms, trees, lamps, cars). 34 line icons.
- **Diagrams**: `s.diagram({ nodes, edges, zones })` places nodes on a grid, routes edges, keeps
  arrowheads visible next to tall nodes and animates packets.
- **Themes**: dark, light, paper, blueprint, terminal, or your palette via `colors`.
- **Export**: SVG and PNG in the browser; frame-exact PNG, GIF, MP4 and WebM from the command line.
- About 35 KB gzipped, no runtime dependencies.

## Examples and playground

```bash
npm install
npm run serve        # http://localhost:8080
```

- `examples/desk-computer.html`, `examples/packing-line.html`, `examples/architecture.html`,
  `examples/server-room.html` (pure JSON), `examples/hello.html`
- `playground/`: edit JSON or JS live, switch themes, export SVG, PNG or a self-contained page

Every example is a single HTML file and also works from `file://`.

## Rendering and export

```bash
node skills/isometric-illustrations/scripts/render.mjs page.html                     # PNG at rest
node skills/isometric-illustrations/scripts/render.mjs page.html --sheet sheet.png   # frames over time
node skills/isometric-illustrations/scripts/render.mjs page.html --video out.mp4 --duration 6
node skills/isometric-illustrations/scripts/render.mjs page.html --gif out.gif --duration 4
node skills/isometric-illustrations/scripts/build.mjs page.html                      # one self-contained file
```

Rendering needs Playwright with Chromium; video and GIF also need ffmpeg.

## Documentation

- [SKILL.md](skills/isometric-illustrations/SKILL.md): workflow, placement conventions, checklist
- [API](skills/isometric-illustrations/references/api.md) ·
  [Prefabs](skills/isometric-illustrations/references/prefabs.md) ·
  [Style](skills/isometric-illustrations/references/style.md) ·
  [Animation](skills/isometric-illustrations/references/animation.md) ·
  [Composition](skills/isometric-illustrations/references/composition.md) ·
  [Diagrams](skills/isometric-illustrations/references/diagrams.md) ·
  [JSON spec](skills/isometric-illustrations/references/spec.md) ·
  [Troubleshooting](skills/isometric-illustrations/references/troubleshooting.md)

## Project layout

```
engine/src/                      the engine (ES modules) and prefabs
dist/                            iso.js (global), iso.min.js, iso.esm.js (built, committed)
skills/isometric-illustrations/  the agent skill (self-contained)
examples/ playground/            figures and the live editor
tests/                           unit tests (node:test) and visual tests (Playwright)
tools/                           bundler, skill validator and installer, debug helpers
.claude-plugin/                  Claude Code plugin and marketplace manifests
```

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the drawing
style rules and how to add a prefab. Please follow the [Code of Conduct](CODE_OF_CONDUCT.md), and report
security issues privately as described in [SECURITY.md](SECURITY.md).

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE). The licence doesn't grant rights to the pixel-star
mark or the Stoico and vstrofago names; replace the mark with your own in products.

The visual language comes from the Stoico design system: 1px lines, fills a hair off the page colour,
one lit moment.
