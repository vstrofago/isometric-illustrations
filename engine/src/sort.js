// SPDX-License-Identifier: Apache-2.0
/* Depth sorting for isometric scenes.
   Every item has a world AABB. Two items only need an order when their screen silhouettes
   (hexagons) overlap; then a separating axis tells which one is behind: if A ends where B begins
   on x, y or z, A is behind B (the viewer sits at +x +y +z). Items with no separating axis
   intersect; they fall back to a depth key. A topological sort turns the pairwise constraints
   into a drawing order. Lower `layer` always draws first. */

const E = 1e-3;

/* Hexagon intervals of an AABB in a projection with z-scale zs:
   h = x − y, u = x − z·zs, v = y − z·zs. */
export function hexOf(b, zs) {
  return [b[0] - b[4], b[3] - b[1], b[0] - b[5] * zs, b[3] - b[2] * zs, b[1] - b[5] * zs, b[4] - b[2] * zs];
}

export function hexOverlap(h1, h2) {
  return h1[0] < h2[1] - E && h2[0] < h1[1] - E &&
    h1[2] < h2[3] - E && h2[2] < h1[3] - E &&
    h1[4] < h2[5] - E && h2[4] < h1[5] - E;
}

function behind(a, b) {
  return a[3] <= b[0] + E || a[4] <= b[1] + E || a[5] <= b[2] + E;
}

/* −1: a draws before b, 1: after, 0: free. Items: {box, hex, layer, order, key} */
export function compareItems(a, b) {
  if (a.layer !== b.layer) return a.layer < b.layer ? -1 : 1;
  const ab = behind(a.box, b.box), ba = behind(b.box, a.box);
  if (ab && !ba) return -1;
  if (ba && !ab) return 1;
  if (ab && ba) {
    /* touching on several axes (coplanar decals, flush neighbours): authoring order */
    return a.order <= b.order ? -1 : 1;
  }
  /* intersecting volumes (an object sunk into its support, overlapping props): resolve along
     the axis of least penetration, the way a collision would be separated */
  const A = a.box, B = b.box;
  let best = Infinity, res = 0;
  for (let k = 0; k < 3; k++) {
    const p1 = A[k + 3] - B[k], p2 = B[k + 3] - A[k]; // a behind by p1, or b behind by p2
    const p = Math.min(p1, p2);
    if (p < best - E) { best = p; res = p1 < p2 ? -1 : p2 < p1 ? 1 : 0; }
  }
  if (res) return res;
  if (Math.abs(a.key - b.key) > E) return a.key < b.key ? -1 : 1;
  return a.order <= b.order ? -1 : 1;
}

export function makeItem(node, box, zs, order) {
  const key = box ? (box[0] + box[3]) / 2 + (box[1] + box[4]) / 2 + ((box[2] + box[5]) / 2) * zs : 0;
  return { node, box, hex: box ? hexOf(box, zs) : null, layer: node.layer || 0, order, key };
}

/* Topological depth sort. Returns a new array of items in drawing order. */
export function depthSort(items) {
  const n = items.length;
  if (n < 2) return items.slice();
  const succ = Array.from({ length: n }, () => []);
  const indeg = new Int32Array(n);
  /* sweep along h to prune pairs */
  const idx = [];
  for (let i = 0; i < n; i++) if (items[i].hex) idx.push(i);
  idx.sort((p, q) => items[p].hex[0] - items[q].hex[0]);
  for (let a = 0; a < idx.length; a++) {
    const i = idx[a], hi = items[i].hex;
    for (let b = a + 1; b < idx.length; b++) {
      const j = idx[b], hj = items[j].hex;
      if (hj[0] >= hi[1] - E) break;
      if (!hexOverlap(hi, hj)) continue;
      const c = compareItems(items[i], items[j]);
      if (c < 0) { succ[i].push(j); indeg[j]++; } else if (c > 0) { succ[j].push(i); indeg[i]++; }
    }
  }
  /* Kahn with a priority (layer, key, order) */
  const pri = (i) => items[i];
  const less = (p, q) => {
    const A = pri(p), B = pri(q);
    if (A.layer !== B.layer) return A.layer < B.layer;
    if (Math.abs(A.key - B.key) > E) return A.key < B.key;
    return A.order < B.order;
  };
  const heap = [];
  const push = (i) => { heap.push(i); let k = heap.length - 1; while (k) { const p = (k - 1) >> 1; if (less(heap[k], heap[p])) { [heap[k], heap[p]] = [heap[p], heap[k]]; k = p; } else break; } };
  const pop = () => {
    const top = heap[0], last = heap.pop();
    if (heap.length) {
      heap[0] = last; let k = 0;
      for (;;) {
        const l = 2 * k + 1, r = l + 1; let m = k;
        if (l < heap.length && less(heap[l], heap[m])) m = l;
        if (r < heap.length && less(heap[r], heap[m])) m = r;
        if (m === k) break;
        [heap[k], heap[m]] = [heap[m], heap[k]]; k = m;
      }
    }
    return top;
  };
  for (let i = 0; i < n; i++) if (!indeg[i]) push(i);
  const out = [], done = new Uint8Array(n);
  while (out.length < n) {
    if (!heap.length) {
      /* cycle: release the remaining item with the lowest priority */
      let best = -1;
      for (let i = 0; i < n; i++) if (!done[i] && (best < 0 || less(i, best))) best = i;
      indeg[best] = 0; push(best);
    }
    const i = pop();
    if (done[i]) continue;
    done[i] = 1; out.push(items[i]);
    for (const j of succ[i]) if (!done[j] && --indeg[j] === 0) push(j);
  }
  return out;
}

/* Place moving items among a fixed sorted list of static items.
   Returns, for each dynamic item, the index of the static item it must follow (−1 = first). */
export class Placer {
  constructor(statics, cell = 96) {
    this.statics = statics;
    this.cell = cell;
    this.grid = new Map();
    statics.forEach((it, i) => {
      it.index = i;
      if (!it.hex) return;
      this._cells(it.hex, (k) => { let a = this.grid.get(k); if (!a) this.grid.set(k, (a = [])); a.push(it); });
    });
  }
  _cells(h, fn) {
    /* bin on (h, u) intervals: enough to prune */
    const c = this.cell;
    const h0 = Math.floor(h[0] / c), h1 = Math.floor(h[1] / c), u0 = Math.floor(h[2] / c), u1 = Math.floor(h[3] / c);
    for (let i = h0; i <= h1; i++) for (let j = u0; j <= u1; j++) fn(i + ',' + j);
  }
  slot(d) {
    let lo = -1, hi = this.statics.length;
    if (!d.hex) return lo;
    const seen = new Set();
    this._cells(d.hex, (k) => {
      const a = this.grid.get(k);
      if (!a) return;
      for (const s of a) {
        if (seen.has(s)) continue;
        seen.add(s);
        if (!hexOverlap(s.hex, d.hex)) continue;
        const c = compareItems(s, d);
        if (c < 0) { if (s.index > lo) lo = s.index; } else if (c > 0) { if (s.index < hi) hi = s.index; }
      }
    });
    /* after everything behind it; on a conflict (lo ≥ hi) the "behind" constraints win */
    return lo;
  }
}
