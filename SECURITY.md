# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | yes |

## Reporting a vulnerability

Please report vulnerabilities privately through GitHub:
**Security → Report a vulnerability** on this repository
([new advisory](https://github.com/vstrofago/isometric-illustrations/security/advisories/new)).
Don't open a public issue. You'll get an acknowledgement within a few days and a fix or a plan within
two weeks for confirmed issues.

## Threat model

Iso runs in the browser and writes SVG markup. Scenes can come from code you wrote or from JSON
(`Iso.render(spec)`) that might come from someone else.

- Values from scene options that reach the markup (ids, classes, colours, styles, dash patterns, icons,
  text, labels) are escaped or dropped. `npm test` includes an injection test.
- Some APIs take markup or code by design and must only receive trusted input: face drawers'
  `face.svg(markup)`, `face.text(..., { attrs })`, `custom({ draw })`, and anything you pass as a
  function. JSON specs cannot carry functions.
- The render and build scripts run a headless browser on the page you give them; only render pages you
  trust.
