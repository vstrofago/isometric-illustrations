# Motion recipes

All motion is a function of scene time, so `render.mjs` can export any frame exactly and reduced-motion
users see a clean rest pose. Combine: one entrance + up to two loops + optional interactions.

## Entrances

```js
s.assemble();                                          // everything, back to front
s.assemble('.tree', { stagger: 0.006, drop: 24 });     // just the trees, fast
s.assemble(s.root.items().filter((n) => n.prefab !== 'platform'), { stagger: 0.02 });
s.drawOn(d.edges.map((e) => e.line), { delay: 0.9 }); // diagram edges draw themselves after nodes land
s.timeline({ delay: 1.8 }).from(['card-*'], { opacity: 0 }, { duration: 0.6 });   // late arrivals
```

Exclude moving objects (cards, packets) from `assemble` and fade them in after it, otherwise they
travel over an empty platform during the entrance.

## Loops

```js
s.float('card', { amp: 4, period: 2.6 });                                // hover in place
s.travel(cards, Iso.path.circle({ center: [0, 0, 22], r: 145 }), { duration: 16, orient: true, orientOffset: 90 });
s.travel(phones, belt.track(0.2), { duration: 9 });                      // along a conveyor
s.orbit('satellite', { center: [0, 0, 60], r: 80, duration: 10 });
s.blink('.led', { period: 1.3, duty: 0.6, stagger: 0.37 });              // LEDs out of phase
s.pulse('.dock', { min: 0.8, max: 1, period: 3 });                       // breathing light
s.spin('fan', { speed: 90 });                                            // small objects only
```

`travel` with several nodes spreads them evenly along the path (`spread` = 1/n by default).

## Coordinated loops (react to where things are)

Compute positions analytically in a `loop` — no physics, still deterministic:

```js
const LAP = 16;
s.loop((t) => {
  phones.forEach((p) => {
    let b = 0;
    for (let j = 0; j < 3; j++) {                       // three cards, spread by 1/3 of a lap
      const ca = ((t / LAP + j / 3) * 360) % 360;
      const d = Math.abs(((p.angle - ca + 540) % 360) - 180);
      if (d < 14) b = Math.max(b, 0.5 + 0.5 * Math.cos((Math.PI * d) / 14));
    }
    p.set('z', b * 24);                                  // rise as a card passes underneath
  });
});
```

## Objects that change at stations

Derive each traveller's position along the path from time, then switch its state when it passes a
station. State switches are cheap (`hidden` toggles inside the prefab), so do it every frame:

```js
const line = Iso.path.polyline([[150, -128, 16], [150, 81, 16], [-148, 81, 16]], { radius: 11 });
const N = 11, LAP = line.length / 21;                       // 21 units per second
const boxes = Array.from({ length: N }, (_, i) => s.parcel({ id: 'box-' + i, at: [150, -128, 16], open: true }));
s.travel(boxes, line, { duration: LAP, orient: true });       // travel spreads them by 1/N
const uAt = (pred) => { for (let u = 0; u <= 1; u += 0.0005) if (pred(line.at(u))) return u; return 1; };
const uTape = uAt((p) => p[1] >= -60), uScan = uAt((p) => p[0] <= -70);
s.loop((t) => boxes.forEach((b, i) => {
  const u = (((t / LAP + i / N) % 1) + 1) % 1, at = u * line.length;
  b.open(u < uTape);                                          // taped after the tunnel
  b.label(u > uScan);                                         // labelled after the scanner
  s.nudge(b, 'opacity', Math.max(0, Math.min(1, at / 10, (line.length - at) / 12)));   // emerge and vanish
}));
```

Use `s.nudge(node, 'opacity', k)` (multiplicative, per frame) rather than `set('opacity')` inside loops
so entrance fades from timelines still apply.

## Scripted sequences (explainers)

```js
const tl = s.timeline({ repeat: -1, repeatDelay: 1.2 });
tl.to('lid', { rot: 90 }, { duration: 0.8, ease: 'inOutCubic' })
  .fromTo('chip', { z: 30, opacity: 0 }, { z: 0, opacity: 1 }, { duration: 0.6, ease: 'out' })
  .set('chip', { material: 'lit', glow: true })
  .call(() => s.status('installed'))
  .wait(1.5)
  .to('lid', { rot: 0 }, { duration: 0.6 })
  .set('chip', { material: undefined, glow: false });
```

## Interaction

```js
node.set({ interactive: true, label: 'Server rack. Press Enter for details.' });
node.on('click', () => { … });                          // mouse, Enter and Space
node.on('hover', () => s.to(node, { z: 6 }));            // reactive tweens start from current values
node.on('leave', () => s.to(node, { z: 0 }));
s.hoverLift('.rack', { z: 5 });                           // shorthand
s.on('render', () => s.svg.addEventListener('click', () => s.toggle()));   // click anywhere to pause
```

Test interactions headlessly: `node scripts/render.mjs fig.html --sheet s.png --actions '[{"t":0.5,"click":"rack-1"}]'`.

## Device behaviours

- `deskComputer`: `pc.power()` runs the CRT sequence (line → opening → glow → logo), `pc.type(key)`,
  `pc.press(key, down)`; status via `onStatus`.
- `keyboard`: `kb.press('a', true)`.
- `conveyor`: `belt.track()` gives the path for `travel`.

## Timing guide

| Motion | Duration |
|---|---|
| Hover / press feedback | 0.06–0.22 s |
| State change (switch on, open) | 0.3–1.1 s |
| Entrance per object | 0.6–0.8 s, stagger 0.005–0.1 s |
| Ambient loops | 2–16 s per cycle |
| Exported GIF/MP4 | one full cycle of the main loop (4–8 s) |
