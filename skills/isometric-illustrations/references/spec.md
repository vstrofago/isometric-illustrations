# JSON scene spec

`Iso.render(spec, host)` builds a scene from plain data. Prefer it for figures without custom logic:
it is easy to generate, validate and diff, and it is exactly what the playground edits.

```json
{
  "theme": "dark",
  "colors": { "accent": "#ff6a3d" },
  "figure": { "index": "Fig. 5", "title": "Server room", "hint": "Hover a rack", "status": "healthy" },
  "label": "Isometric server room with three racks",
  "padding": 28,
  "objects": [
    { "type": "platform", "size": [300, 240], "label": "dc-1 · row b", "grid": 20 },
    { "type": "server", "id": "rack-1", "at": [-90, -60, 0], "units": 7, "h": 70 },
    { "type": "group", "id": "pair", "at": [60, 40, 0], "children": [
      { "type": "box", "size": [20, 20, 10], "r": 3 },
      { "type": "card", "at": [10, 10, 10] }
    ] },
    { "type": "connector", "from": [-90, -36], "to": [-50, 4], "route": "y", "flow": 12 },
    { "type": "label", "at": [70, 20, 34], "text": "primary" }
  ],
  "animations": [
    { "type": "assemble", "stagger": 0.08 },
    { "type": "blink", "target": ".led", "period": 1.3, "stagger": 0.37 },
    { "type": "travel", "target": ["packet-a"], "path": { "type": "line", "from": [-24, 20, 0], "to": [46, 20, 0] }, "duration": 2.4 },
    { "type": "timeline", "repeat": -1, "steps": [
      { "target": "rack-1", "to": { "z": 6 }, "duration": 0.4 },
      { "target": "rack-1", "to": { "z": 0 }, "duration": 0.4, "wait": 1 }
    ] }
  ],
  "interactions": [
    { "target": ["rack-1"], "hover": "lift", "z": 5, "label": "Rack one" },
    { "target": "pc", "click": "power" },
    { "target": "lamp", "click": "toggle", "onMaterial": "lit", "status": { "on": "lamp on", "off": "lamp off" } }
  ]
}
```

## Top level

Any scene option (`theme`, `colors`, `figure`, `label`, `padding`, `extend`, `aspect`, `zoom`, `angle`, …)
plus `objects`, `animations`, `interactions`. `host` may be given here or as the second argument.

## objects

Each item: `{ "type": <primitive | prefab | builder | "group">, …options }`. Groups take `children`.
Options are exactly those of the JS API (`api.md`, `prefabs.md`). Functions (face drawers, `avoid`)
are not available in JSON — switch to JS for those.

## animations

`type`: `assemble`, `float`, `pulse`, `blink`, `spin`, `travel`, `orbit`, `drawOn`, `typewriter`,
`timeline`. `target` uses the usual target syntax (id, `.class`, `prefix*`, array).
`path` (for `travel`): `{type: 'circle', center, r, start, ccw}` · `{type: 'line', from, to}` ·
`{type: 'rect', at, size, r}` · `{type: 'arc', center, r, from, to}` · `{type: 'hop', from, to, height}` ·
`{type: 'polyline', points, radius, closed}` · or an array of points.
`timeline`: `repeat`, `yoyo`, `delay`, `repeatDelay`, `steps: [{ target, to | from | from+to | set, duration, ease, at, wait, stagger }]`.

## interactions

`{ target, hover: 'lift', z, label, click: 'power' | 'toggle' | { to: {…}, duration } , onMaterial, offMaterial, status: {on, off} }`.

## Validating

Render it: `node scripts/render.mjs page.html`. Unknown types or animations print a console warning,
which the renderer reports as a page error.
