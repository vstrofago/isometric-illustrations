# Visual language

The look: technical line drawings in true isometric, quiet enough to breathe, with one thing that
glows. Think architectural axonometrics and product cutaways, not 3D-rendered blobs.

## Line

- 1px hairlines, non-scaling, round joins. The engine handles this; never thicken lines to fix a weak
  composition.
- Three weights, by role: `ln` for silhouettes and primary edges, `ln-soft` for drawn detail
  (vents, slots, panel seams), `ln-faint` for texture (window mullions, floor grids, belts).
- Use `ln-strong` / `ln-bold` sparingly: an arrow, a selected path, a dotted wire to a lit object.

## Fill

- Fills sit a hair off the page colour. Three tones imply light: top > left > right (dark themes),
  so solids occlude without outlines doing all the work.
- No gradients, no drop shadows, no textures painted on surfaces. Depth comes from occlusion, tone
  and line.
- `screen` (dark glass) for displays, `dark` for asphalt/panels/wheels, `glass` for panes you can see
  through, `ghost`/`wire` for things that are planned, hidden or "not yet".

## The lit moment

- At most one idea glows: a card, a screen, a selected node, the windows that are on, LEDs.
- Lit surfaces are small. A lit area larger than ~15% of the figure turns into a white blob — light the
  object's screen or a small part instead (a chip die, a card on top of a big layer).
- Pair `material: 'lit'` with `glow: true` on small objects; leave glow off for many tiny lights
  (lit windows, LEDs) — the contrast is enough.

## Form

- Machined, rounded objects: `r` (plan radius ≥ the bevel) and a `chamfer` of 1–3 units on boxes that
  are bigger than ~20 units. Tiny parts (keys, pins) keep `chamfer` ≤ 0.8.
- Details are drawn, not implied: vents, keys, screws, windows, cables. A face with nothing on it is
  fine only if the object is genuinely plain.
- Proportions: real-world proportions read best. A phone is ~13×27, a laptop ~40×28, a door ~8×20,
  a person-scale building floor ~10 units.

## Composition

- One focal point. Put it slightly off-centre on the platform; let everything else support it.
- Empty space is material: leave 15–25% of the platform clear. Do not fill every corner.
- Diorama hierarchy: platform → large structures → medium objects → small scatter (trees, lamps).
- Repeated objects (trees, phones, windows) vary slightly (seeded scale, kind) — never randomly per load.
- Text belongs in the caption frame or on planes as engraved labels (`plane: 'top'`), mono, uppercase,
  tracked. Use `label` callouts in diagrams. Keep in-figure text short (1–3 words).

## Frame

`figure: { index, title, hint, status }` gives the caption grammar used by the references:
`Fig. 2` (top-left) · `DESK COMPUTER` (top-right) · `TYPE ON IT · CLICK IT TO SWITCH` (bottom-left) ·
`on · 4 chars · key k` (bottom-right, live state). Update the state with `s.status(text)`.

## Colour and themes

- Default `dark`: near-black page, warm off-white ink. `light` and `paper` invert tone order so the top
  stays closest to paper. `blueprint` and `terminal` are expressive variants — use when asked.
- A brand colour enters as `colors: { accent }` + `material: 'accent'` on the one lit object, or as
  `color: '#hex'` tints on a few objects. Never more than one hue besides the neutrals.

## Motion

- Physical and optional: ease-out entrances (`ease: 'out'`), 0.2–1s transitions, loops ≥ 2s.
- One entrance per figure (usually `assemble`, back to front). At most two ambient loops (e.g. travel
  + blink). Motion should explain something: data flowing, a device responding, a process cycling.
- Interaction is a bonus, not a requirement: hover lifts, click toggles, typing. Always keyboard
  operable (the engine makes clickable nodes focusable; give them a `label`).

## Never

People at laptops, generic office stock, third-party logos, emoji, rainbow palettes, heavy glows,
3D "blob" characters, perspective (keep it isometric), text paragraphs inside the drawing.
