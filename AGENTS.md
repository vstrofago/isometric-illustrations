# Agent guide

This repository contains **Iso**, an isometric illustration/animation engine, and a portable skill.

- To *make an illustration, diorama or diagram*: follow `skills/isometric-illustrations/SKILL.md`
  (also linked at `.claude/skills/isometric-illustrations`). It is self-contained: engine, templates,
  render and build scripts, references.
- To *change the engine*: sources are in `engine/src/` (ES modules). After editing run
  `npm run build` (bundles `dist/` and refreshes `skills/isometric-illustrations/assets/iso.js`) and
  `npm test` (unit tests + every example rendered in Chromium with no page errors).
- Look at visual changes, don't guess: `node skills/isometric-illustrations/scripts/render.mjs <page.html>`
  writes a PNG; `--sheet` gives frames across time; `tools/debug/*.mjs` print draw order and timings.
- Keep the style rules in `skills/isometric-illustrations/references/style.md` when adding prefabs:
  hairlines, near-background fills, rounded/chamfered forms, one lit moment, colours only via CSS
  custom properties (never literal colours in geometry code).
- New prefabs go in `engine/src/prefabs/` and must be listed in `references/prefabs.md`.
- Contribution rules, release steps and licensing are in `CONTRIBUTING.md`. The project is Apache-2.0:
  new source files start with `// SPDX-License-Identifier: Apache-2.0`, and option values that reach SVG
  markup go through the sanitisers in `engine/src/math.js`.
- `npm run validate:skill` checks the skill frontmatter, bundled files and plugin manifests; run it after
  touching `skills/` or `.claude-plugin/`.
