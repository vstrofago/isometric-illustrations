// SPDX-License-Identifier: Apache-2.0
/* Diagrams: nodes on a grid, orthogonal edges with flowing dashes and travelling packets, zones.
   s.diagram({ grid: 80, nodes: [{id, cell:[i,j], type:'block', icon, label}], edges: [{from, to, packets, label}], zones: [{from:[i,j], to:[i,j], label}] }) */
import { Group } from './node.js';
import { Line, Text, routePoints } from './shapes.js';
import { Path } from './paths.js';

export function buildDiagram(o, make) {
  const grid = o.grid ?? 80, gz = o.z ?? 0, origin = o.origin || [0, 0];
  const g = new Group({ id: o.id, flat: true });
  const cellXY = (c) => [origin[0] + c[0] * grid, origin[1] + c[1] * grid];
  const nodes = new Map();
  /* zones first (they lie on the floor) */
  for (const z of o.zones || []) {
    const a = cellXY(z.from), b = cellXY(z.to), pad = z.pad ?? grid * 0.42;
    const x0 = Math.min(a[0], b[0]) - pad, x1 = Math.max(a[0], b[0]) + pad, y0 = Math.min(a[1], b[1]) - pad, y1 = Math.max(a[1], b[1]) + pad;
    g.add(make('zone', { id: z.id, at: [(x0 + x1) / 2, (y0 + y1) / 2, gz], size: [x1 - x0, y1 - y0], label: z.label, r: z.r ?? 10, fill: z.fill, dash: z.dash }));
  }
  for (const n of o.nodes || []) {
    const [x, y] = n.at ? n.at : cellXY(n.cell || [0, 0]);
    const type = n.type || 'block';
    const size = n.size || (type === 'block' ? [o.nodeSize ?? 36, o.nodeSize ?? 36, n.h ?? 12] : undefined);
    const opts = { ...n, at: [x, y, (n.at && n.at[2]) || gz], size };
    delete opts.cell; delete opts.type;
    const node = make(type, opts);
    const h = size ? size[2] ?? 12 : type === 'database' ? (n.tiers ?? 3) * ((n.tierH ?? 8) + 1.6) : n.h ?? 24;
    node.diagram = { x, y, half: (size ? Math.max(size[0], size[1]) : (n.r ? n.r * 2 : 36)) / 2, h };
    nodes.set(n.id, node);
    g.add(node);
  }
  const edges = [];
  for (const e of o.edges || []) {
    const A = nodes.get(e.from), B = nodes.get(e.to);
    if (!A || !B) continue;
    const a = [A.diagram.x, A.diagram.y], b = [B.diagram.x, B.diagram.y];
    const route = e.route || o.route || 'auto';
    const z = (e.z ?? gz) + 0.01;
    /* first leg direction decides which side the edge leaves from */
    let pts = routePoints(a, b, { route, z, radius: 0 });
    const trim = (p, q, by) => { const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1; return [p[0] + (dx / L) * by, p[1] + (dy / L) * by, p[2]]; };
    /* a ground point within `h` behind a node's back faces (−x, −y) is hidden by the node: trim further there */
    const gap = e.gap ?? 4;
    const dir = (p, q) => [Math.sign(Math.round(q[0] - p[0])), Math.sign(Math.round(q[1] - p[1]))];
    const d0 = dir(pts[0], pts[1]), d1 = dir(pts[pts.length - 2], pts[pts.length - 1]);
    const leavesBack = d0[0] < 0 || d0[1] < 0, entersBack = d1[0] > 0 || d1[1] > 0;
    pts[0] = trim(pts[0], pts[1], A.diagram.half + gap + (leavesBack ? A.diagram.h * 0.9 : 0));
    pts[pts.length - 1] = trim(pts[pts.length - 1], pts[pts.length - 2], B.diagram.half + gap + 2 + (entersBack ? B.diagram.h + 2 : 0));
    const ptsR = routePoints(pts[0], pts[pts.length - 1], { route: pts.length > 2 ? pts.slice(1, -1).map((p) => [p[0], p[1]]) : 'straight', z, radius: e.radius ?? o.radius ?? 8 });
    const line = new Line({ id: e.id, points: ptsR, arrow: e.arrow ?? 'end', line: e.line || 'ln', dash: e.dash, flow: e.flow === false ? undefined : e.flow ?? o.flow ?? 14, arrowSize: 4.5 });
    g.add(line);
    const path = new Path(ptsR);
    if (e.label) {
      const mid = path.at(0.5);
      g.add(new Text({ text: e.label, at: mid, size: e.labelSize || 5.5, anchor: 'middle', dy: -5, cls: 'tx tx-label', layer: 1 }));
    }
    edges.push({ spec: e, line, path, from: A, to: B });
  }
  g.nodesById = nodes;
  g.edges = edges;
  /* packets travelling along edges */
  g.onMount = (scene) => {
    for (const ed of edges) {
      const k = ed.spec.packets === true ? 1 : ed.spec.packets || 0;
      if (!k) continue;
      const cards = [];
      for (let i = 0; i < k; i++) {
        const p0 = ed.path.at(0);
        const card = make(ed.spec.packet || 'card', { at: [p0[0], p0[1], p0[2]], w: 7, d: 5, t: 1.2, id: (ed.spec.id || ed.spec.from + '-' + ed.spec.to) + '-packet-' + i });
        g.add(card);
        cards.push(card);
      }
      scene.travel(cards, ed.path, { duration: ed.spec.duration ?? ed.path.length / (ed.spec.speed ?? o.speed ?? 40), spread: 1 / k, lift: 0.4, offset: ed.spec.offset || 0 });
    }
  };
  return g;
}
