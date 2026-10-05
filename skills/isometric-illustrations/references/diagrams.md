# Isometric diagrams

Use the `diagram` builder for anything with nodes and edges: system architectures, data pipelines,
network maps, workflows. It places nodes on a grid, routes edges orthogonally on the floor, trims
them so arrowheads stay visible next to tall nodes, animates dashes and packets, and draws zones.

```js
const d = s.diagram({
  grid: 88,                 // distance between cell centres
  origin: [-222, -88],      // world position of cell [0, 0] (centre the diagram on the platform)
  nodeSize: 34,             // default block footprint
  speed: 46,                // packet speed (units/s), per edge override: speed | duration
  route: 'auto',            // default edge route: auto | x | y | xyx | yxy | straight
  zones: [{ from: [2, 0], to: [5, 2], label: 'VPC · private subnets', pad: 34 }],
  nodes: [
    { id: 'clients', cell: [0, 1], icon: 'users', label: 'Clients' },
    { id: 'api', cell: [2, 1], icon: 'server', label: 'API', size: [40, 40, 16], material: 'lit', glow: true },
    { id: 'db', cell: [4.4, 0], type: 'database', r: 16 },      // any prefab via `type`; cells can be fractional
  ],
  edges: [
    { from: 'clients', to: 'api', packets: 2, label: 'https' },
    { from: 'api', to: 'db', route: 'y', packets: 1 },
  ],
});
d.nodesById.get('api');     // the node objects
d.edges[0].line; d.edges[0].path;   // the drawn line and its world path (for your own travellers)
```

Node options: everything the node's prefab accepts (`block` by default: `icon`, `label`, `size`,
`material`, `color`, `glow`), plus `cell:[i,j]` or `at:[x,y,z]`.
Edge options: `route`, `packets` (count or true), `packet` (prefab, default `card`), `speed`/`duration`,
`offset`, `label`, `arrow` ('end' | 'start' | 'both' | null), `dash`, `flow` (dash speed, false = static),
`gap`, `radius`.

## Layout rules

- Flow along **+x** (top-left → bottom-right on screen) for the main path; branch along ±y.
- Put sources at small x (back-left), sinks at large x (front-right). Readers scan the diagonal.
- Keep 1 cell between nodes that have labels on their front faces; use fractional cells to align
  odd-sized nodes (`[4.4, 0]`).
- Route branches with `route: 'y'` (leave along y first) so they fan out from a node's side instead of
  overlapping the main path.
- Zones: one or two, as dashed floors with a short uppercase label. Do not nest more than one level.
- One lit node: the service the diagram is about.
- Labels: 1–2 words on node faces; longer explanations go in the status caption on hover.

## Interaction pattern

```js
for (const [id, node] of d.nodesById) {
  node.set('label', roles[id]);          // aria-label
  node.on('hover', () => { s.to(node, { z: 6 }, { duration: 0.22 }); s.status(roles[id]); });
  node.on('leave', () => { s.to(node, { z: 0 }, { duration: 0.22 }); s.status('requests flowing'); });
}
s.assemble([...d.nodesById.values()], { stagger: 0.07, drop: 30 });
s.drawOn(d.edges.map((e) => e.line), { delay: 0.9, duration: 0.9, stagger: 0.08 });
```

## Without the builder

For freeform diagrams use `block` prefabs and `connector`s directly. Keep connector ends outside the
nodes' footprints, and remember a ground point within `h` behind a node of height `h` (on its −x or
−y side) is hidden by it: end the connector further away or approach from the front.

## Stacks and layers

`stack` renders layered platforms (infrastructure → data → app) with callout labels; float a small
lit `card` above the top layer instead of lighting a whole layer.
