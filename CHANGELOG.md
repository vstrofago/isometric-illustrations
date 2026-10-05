# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `render.mjs --bare` hides the figure captions and floor labels (`tx-floor`); `--hide <css>` hides
  anything else. Useful for clean clips in a video or a post.

### Fixed
- `drawOn` draws a line by cutting it to the revealed length. Dashed reveals broke with non-scaling strokes
  and with flowing dashes, so diagram edges showed before they were drawn.
- Diagram packets and edge labels fade in when their edge finishes drawing, not before.

### Changed
- The architecture example is now five services with straight edges.

## [0.1.0] - 2026-10-05

First public release.

### Engine
- True isometric (30°) and 2:1 dimetric projection, automatic framing, figure frame with mono captions.
- Primitives: rounded and chamfered boxes, prisms, cylinders, cones, segmented tubes, spheres, panels,
  hulls, slabs, wedges, pyramids, roofs, flats, lines and connectors, ribbons, helices, text on planes,
  panes and face drawers.
- Depth sorting by separating axes with least-penetration fallback; moving objects are re-placed every
  frame, ordered against each other, and folded back into the static order when they stop.
- Deterministic animation: timelines, reactive tweens, easing, paths, and presets (`assemble`, `float`,
  `travel`, `orbit`, `pulse`, `blink`, `spin`, `drawOn`, `typewriter`, `hoverLift`). Reduced motion shows
  the rest pose.
- Interaction (click, hover, keyboard), themes (dark, light, paper, blueprint, terminal, brand
  `colors`), materials, SVG and PNG export.
- 35 prefabs, 34 line icons, a `diagram` builder and JSON scenes (`Iso.render`).
- Option values that reach the markup are sanitised.

### Skill
- `skills/isometric-illustrations/`: SKILL.md, references (API, prefabs, style, animation, composition,
  diagrams, JSON spec, troubleshooting), templates, and `new`, `render` and `build` scripts.
- Claude Code plugin marketplace manifest (`.claude-plugin/`).

### Examples and tools
- Desk computer, packing line, service architecture, server room, hello; gallery and playground.
- Unit and visual tests, CI, release workflow.

[Unreleased]: https://github.com/vstrofago/isometric-illustrations/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/vstrofago/isometric-illustrations/releases/tag/v0.1.0
