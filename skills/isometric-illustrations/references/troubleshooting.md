# Troubleshooting

## Something is drawn in front of what should hide it (or behind)

The engine sorts by world bounding boxes: two objects are ordered by the axis that separates them.
It fails only when boxes genuinely interpenetrate or one shape wraps around another.

- **Enclosing shapes** (rings, U-shapes, courtyards): use `tube` for rings (already segmented); split
  U/L shapes into separate boxes.
- **Concave prisms with things in the notch**: split the prism into convex boxes.
- **Objects sunk into a surface**: fine within a few units (resolved by least penetration); put them on
  the surface (`z` = surface height) to be safe.
- **Long thin lines crossing tall objects**: lines on the floor are behind anything standing on the
  floor. A line meant to pass *over* something must be higher than it.
- **A decal that must win**: `layer: 1` puts it above everything it overlaps (labels do this).
- **Parts inside a prefab** draw in the order added when the prefab uses `sort: 'none'`; reorder them.

## An arrow or the end of a line is missing

It is hidden behind a tall node: a floor point within `h` behind a node's −x/−y faces is occluded.
Use the `diagram` builder (trims automatically), approach from the front, or end the line further out.

## Text overflows a face or is unreadable

Shorten it (1–2 words), lower `size`, or move it off the face: a `label` callout, a `text` on the
floor (`plane: 'top'`), or the figure caption. Labels on lit objects use `tx-on-lit` automatically in
`block`; elsewhere pass `cls: 'tx tx-label tx-on-lit'`.

## The figure is tiny / huge / off-centre

The viewBox fits everything that is drawn — including far-away decals or a stray object at the wrong
coordinates. Check positions; use `padding`, `zoom`, `aspect`, or an explicit `view`. Moving objects
leave the fitted area? Add `extend: [top, right, bottom, left]`.

## Animation does nothing

- Targets: `'#id'`/`'id'` match ids, `'.name'` matches `class`, `'card*'` matches id prefixes.
- Two writers on one property: timelines run first, then loops (`travel`, custom `loop`), then reactive
  tweens. A `travel` will override a timeline's `x/y/z` on the same node — animate a parent group instead.
- `float` and `pulse` are additive (they combine with other motion).
- Reduced motion: the scene shows its rest pose. Test with `--theme`/real browsers; `render.mjs` forces
  motion on.

## Performance

- ~1,500 nodes and dozens of movers run at 60 fps; per-frame JS cost is ~1–3 ms.
- Expensive: re-drawing geometry every frame (`spin`, animating `h`, `rot` on big groups). Prefer moving
  (`x/y/z`), fading (`opacity`) or scaling — those are transforms.
- Thousands of trees: lower `count`, or use `kind: 'cone'` (fewer parts) for distant ones.

## render.mjs

- "Playwright not found": `npm i -D playwright && npx playwright install chromium` (or use a preinstalled
  Chromium via `CHROME_PATH`).
- Video/GIF need `ffmpeg` on PATH.
- "No Iso scene finished rendering": the page threw before rendering — the errors are printed above.
