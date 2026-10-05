# Contributing to Iso

Thanks for helping. Iso is two things that move together: an SVG engine (`engine/src/`) and an agent
skill (`skills/isometric-illustrations/`). A change to one usually needs a line in the other.

## Set up

```bash
git clone https://github.com/vstrofago/isometric-illustrations
cd isometric-illustrations
npm install
npx playwright install chromium   # once, for rendering and the visual tests
npm run build                     # engine/src → dist/ (and the copy inside the skill)
npm run serve                     # http://localhost:8080 → gallery, examples, playground
```

## Make a change

1. Open an issue first for anything larger than a fix, so we agree on the shape before you build it.
2. Edit the sources in `engine/src/`. Never edit `dist/` or `skills/isometric-illustrations/assets/iso.js`
   by hand: `npm run build` regenerates both, and both are committed so the examples work from a clone
   and from GitHub Pages.
3. Look at what you changed. `node skills/isometric-illustrations/scripts/render.mjs <page.html>`
   writes a PNG; `--sheet` gives frames across time; `--actions` scripts clicks and typing.
   `tools/debug/` has helpers that print draw order, placement and frame timings.
4. Run `npm test` (unit tests plus every example rendered in Chromium with no page errors) and
   `npm run validate:skill`.
5. Add an entry to `CHANGELOG.md` under **Unreleased**.

## Style rules for the drawing

Everything the engine draws follows `skills/isometric-illustrations/references/style.md`:
hairlines, fills a hair off the background, rounded and chamfered forms, one lit moment, and colour only
through CSS custom properties (never a literal colour in geometry code). New prefabs:

- live in `engine/src/prefabs/`, are built in local coordinates around the footprint centre at z = 0,
  and take `at`, `rot` and the common node options;
- are listed with their options in `skills/isometric-illustrations/references/prefabs.md`;
- appear in a test scene (`tests/visual/prefabs.html` or an example) so the visual tests cover them.

## Changing the skill

`SKILL.md` stays short (workflow, conventions, checklist); details go in `references/`. Keep the
frontmatter valid (`npm run validate:skill`): kebab-case `name` matching the folder, a `description` under
1024 characters without angle brackets, and every file the body mentions present in the folder.

## Code

- Plain ES modules, no runtime dependencies, browser first. Node is only for tooling and tests.
- Match the surrounding code: short functions, comments that explain why, `// SPDX-License-Identifier:
  Apache-2.0` at the top of new files.
- Anything that ends up in SVG markup from user options goes through the sanitisers in `math.js`
  (`escAttr`, `cssClass`, `cssValue`, `num`, `dashArray`, `pathData`).

## Releases

Maintainers bump the version in `package.json`, `.claude-plugin/plugin.json`,
`.claude-plugin/marketplace.json` and the skill's `metadata.version`, move **Unreleased** to a dated
section in `CHANGELOG.md`, and push a `vX.Y.Z` tag. The release workflow builds, validates and attaches
the skill zip and the engine bundles.

## Licence

Iso is licensed under the Apache License 2.0. By contributing you agree that your contributions are
licensed under the same terms (Section 5 of the licence). Please only contribute work you have the right
to license, and don't include third-party logos, artwork or fonts.

## Conduct

Be kind. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
