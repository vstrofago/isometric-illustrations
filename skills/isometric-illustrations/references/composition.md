# Composing a figure

## Think in world units on a grid

Sketch the plan view first (looking down): x to the right, y downward on your sketch. In the drawing,
+x runs toward the bottom-right and +y toward the bottom-left; the corner `(-x, -y)` is the back
(top of the screen), `(+x, +y)` is the front (bottom of the screen).

```
            back (-x,-y)
             ◇
   left     ◇ ◇     right
 (-x,+y)   ◇   ◇   (+x,-y)
             ◇
           front (+x,+y)
```

- Put the focal object near the centre or slightly toward the front.
- Tall objects belong toward the back (smaller x + y) so they do not hide others.
- Paths that should be visible (roads, conveyors, edges) run in front of tall things, not behind.

## Scale

| Thing | Typical size |
|---|---|
| Platform for an object figure | 160–280 wide |
| Platform for a diorama | 400–640 wide |
| Diagram grid step | 80–100 between node centres, nodes 32–40 wide |
| Tree | r 5–7, h 18–24 |
| Phone / card | 13×27 / 16×10 |
| Laptop / monitor | 40×28 / 48×30 |
| Server rack | 28×34×64 |
| Building | 30–60 footprint, 10 per floor |

Mixing scales is fine in a diorama (oversized devices on a campus read as "the subject"), but keep
each category consistent.

## Layering a diorama

1. `platform` (and decks/extensions as boxes at `z: -10`).
2. Ground decals: roads (`ring`, `ribbon`), ponds (`circle` with `f-dark`), lots (`rect`), engraved
   labels (`text` with `plane: 'top'`). All at `z: 0`.
3. Structures: `tube` rings, `building`s, `tower`s, gates, conveyors.
4. Props: devices, lamps, cars, benches, solar fields.
5. Scatter: `forest` with `avoid(x, y)` to keep paths and structures clear.
6. Movers: cards, packets, vehicles on paths — excluded from `assemble`, faded in after.

## Objects on objects

- On a box of height `h`: `at: [x, y, h]`.
- On the ring roof of a `tube` of height `h`: `z = h`.
- On a desk: `z = desk.h`.
- Stacks: each part starts where the previous ends; leave no gap unless the gap is the point.

## Framing

- The viewBox fits the drawing; adjust `padding` (18–40) for breathing room.
- Things that move above their rest pose (lifts, hops) may need `extend: [top, right, bottom, left]`.
- `aspect: 16/9` for heroes and videos; `zoom: 1.15` to crop a busy edge.
- The figure frame adds the captions; skip `figure` for a bare SVG (e.g. inside your own layout).

## Accessibility

- `label` on the scene: one sentence describing what is shown.
- Interactive nodes need a `label` (aria-label) and respond to Enter/Space automatically.
- Do not encode meaning only in the lit/unlit difference — say it in a caption or label too.
