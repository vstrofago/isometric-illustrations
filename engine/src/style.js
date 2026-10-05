// SPDX-License-Identifier: Apache-2.0
/* Theme and materials. Everything a scene paints reads a custom property, so a theme or a
   material is only a set of property values. Derived tones are declared together with the
   base colours (custom properties resolve where they are declared). */

/* A theme: base colours + how much of `fg` goes into each tone.
   Dark themes light the top; light themes keep the top closest to paper. */
export const THEMES = {
  dark: { bg: '#111214', fg: '#ecebe6', top: 6.5, left: 3.2, right: 1.2, bevel: 10, line: 30, soft: 15, faint: 7, strong: 60, text: 50, dark: '#060607', road: 3.2 },
  light: { bg: '#f7f6f2', fg: '#121211', top: 0, left: 4.5, right: 8, bevel: 2.5, line: 42, soft: 20, faint: 9, strong: 72, text: 55, dark: '#d9d7d0', road: 3 },
  paper: { bg: '#efe9dd', fg: '#2a241b', top: 1, left: 6, right: 11, bevel: 3, line: 48, soft: 24, faint: 10, strong: 75, text: 60, dark: '#d6ccb9', road: 4 },
  blueprint: { bg: '#0d2a4a', fg: '#d8ecff', top: 9, left: 5, right: 2.5, bevel: 13, line: 55, soft: 26, faint: 10, strong: 80, text: 70, dark: '#081d35', road: 5 },
  terminal: { bg: '#07110b', fg: '#9dffbf', top: 7, left: 3.5, right: 1.5, bevel: 11, line: 42, soft: 20, faint: 8, strong: 70, text: 60, dark: '#030805', road: 3 },
};

function themeVars(t) {
  const mix = (p, base = 'var(--iso-bg)') => `color-mix(in oklab, var(--iso-fg) ${p}%, ${base})`;
  const a = (p) => `color-mix(in oklab, var(--iso-fg) ${p}%, transparent)`;
  return `--iso-bg:${t.bg};--iso-fg:${t.fg};` + derived(t, mix, a);
}
function derived(t, mix, a) {
  return `--iso-top:${mix(t.top)};--iso-left:${mix(t.left)};--iso-right:${mix(t.right)};--iso-bevel:${mix(t.bevel)};` +
    `--iso-line:${a(t.line)};--iso-line-soft:${a(t.soft)};--iso-line-faint:${a(t.faint)};--iso-line-strong:${a(t.strong)};` +
    `--iso-text:${a(t.text)};--iso-ink:${mix(t.strong)};--iso-road:${mix(t.road)};` +
    `--iso-dark:${t.dark};--iso-screen:color-mix(in oklab, ${t.dark} 70%, var(--iso-bg));--iso-screen-on:${mix(t.top + 3)};--iso-key:${mix(t.top + 1)};` +
    `--iso-lit:var(--iso-fg);--iso-glow:${a(55)};--iso-glow-soft:${a(22)};--iso-glass:${a(7)};--iso-glass-edge:${a(t.line)};` +
    `--iso-accent:var(--iso-fg);--iso-focus:var(--iso-fg);`;
}

/* Materials: overrides of the tone properties, scoped to a node. */
const M = (top, left, right, bevel, line, soft) =>
  `--iso-top:${top};--iso-left:${left};--iso-right:${right};--iso-bevel:${bevel};` + (line ? `--iso-line:${line};` : '') + (soft ? `--iso-line-soft:${soft};` : '');
const mixF = (c, p, base = 'var(--iso-bg)') => `color-mix(in oklab, ${c} ${p}%, ${base})`;

export const MATERIALS = {
  /* matte: the default (theme tones) */
  lit: M('var(--iso-lit)', mixF('var(--iso-lit)', 82), mixF('var(--iso-lit)', 68), mixF('var(--iso-lit)', 92), mixF('var(--iso-lit)', 70, 'transparent'), mixF('var(--iso-bg)', 30, 'transparent')),
  screen: M('var(--iso-screen)', 'var(--iso-screen)', 'var(--iso-screen)', 'var(--iso-screen)'),
  dark: M(mixF('var(--iso-dark)', 55), mixF('var(--iso-dark)', 70), mixF('var(--iso-dark)', 80), mixF('var(--iso-dark)', 45)),
  glass: M(mixF('var(--iso-fg)', 9, 'transparent'), mixF('var(--iso-fg)', 6, 'transparent'), mixF('var(--iso-fg)', 4, 'transparent'), mixF('var(--iso-fg)', 10, 'transparent'), 'var(--iso-glass-edge)'),
  wire: M('transparent', 'transparent', 'transparent', 'transparent'),
  ghost: M('transparent', 'transparent', 'transparent', 'transparent', mixF('var(--iso-fg)', 12, 'transparent'), mixF('var(--iso-fg)', 7, 'transparent')),
  solid: M('var(--iso-ink)', mixF('var(--iso-ink)', 85), mixF('var(--iso-ink)', 72), 'var(--iso-ink)', mixF('var(--iso-fg)', 75, 'transparent')),
  paper: M(mixF('var(--iso-fg)', 14), mixF('var(--iso-fg)', 9), mixF('var(--iso-fg)', 6), mixF('var(--iso-fg)', 18)),
  accent: M('var(--iso-accent)', mixF('var(--iso-accent)', 78), mixF('var(--iso-accent)', 62), mixF('var(--iso-accent)', 90), mixF('var(--iso-accent)', 70, 'transparent')),
  tint: M(mixF('var(--iso-tint)', 26), mixF('var(--iso-tint)', 17), mixF('var(--iso-tint)', 11), mixF('var(--iso-tint)', 34), mixF('var(--iso-tint)', 60, 'transparent'), mixF('var(--iso-tint)', 32, 'transparent')),
};

export function css() {
  let s = '';
  s += `.iso{${themeVars(THEMES.dark)}--iso-font:ui-monospace,"Geist Mono","SF Mono","JetBrains Mono",Menlo,Consolas,monospace;display:block;width:100%;height:auto;overflow:visible;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}`;
  for (const k in THEMES) s += `.iso.iso-${k}{${themeVars(THEMES[k])}}`;
  /* host tokens (e.g. a design system's --fg/--bg) */
  s += `.iso.iso-inherit{--iso-bg:var(--bg,#111214);--iso-fg:var(--fg,#ecebe6);${derived(THEMES.dark, (p) => `color-mix(in oklab, var(--iso-fg) ${p}%, var(--iso-bg))`, (p) => `color-mix(in oklab, var(--iso-fg) ${p}%, transparent)`)}}`;
  for (const k in MATERIALS) s += `.iso .m-${k}{${MATERIALS[k]}}`;
  s += `.iso path,.iso rect,.iso circle,.iso ellipse,.iso line,.iso polyline{fill:none;stroke:none;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}`;
  const fills = { top: 'top', left: 'left', right: 'right', bevel: 'bevel', dark: 'dark', screen: 'screen', 'screen-on': 'screen-on', key: 'key', lit: 'lit', glass: 'glass', ink: 'ink', road: 'road', bg: 'bg', accent: 'accent', soft: 'line-faint' };
  for (const k in fills) s += `.iso .f-${k}{fill:var(--iso-${fills[k]});stroke:var(--iso-${fills[k]});stroke-width:.6}`;
  s += `.iso .f-glass,.iso .m-glass [class^="f-"],.iso .m-wire [class^="f-"],.iso .m-ghost [class^="f-"]{stroke:none}`;
  s += `.iso .f-ink{stroke:none}`;
  s += `.iso .ln{stroke:var(--iso-line);stroke-width:1}.iso .ln-soft{stroke:var(--iso-line-soft);stroke-width:1}.iso .ln-faint{stroke:var(--iso-line-faint);stroke-width:1}.iso .ln-strong{stroke:var(--iso-line-strong);stroke-width:1}`;
  s += `.iso .ln-lit{stroke:var(--iso-lit);stroke-width:1.25}.iso .ln-accent{stroke:var(--iso-accent);stroke-width:1.25}.iso .ln-bold{stroke:var(--iso-line-strong);stroke-width:1.6}`;
  s += `.iso .tx{fill:var(--iso-text);stroke:none;font-family:var(--iso-font);font-weight:400}.iso .tx-label{letter-spacing:.08em;text-transform:uppercase}.iso .tx-lit{fill:var(--iso-lit);stroke:none;font-family:var(--iso-font)}.iso .tx-strong{fill:var(--iso-line-strong);stroke:none;font-family:var(--iso-font)}.iso .tx-on-lit{fill:color-mix(in oklab, var(--iso-bg) 72%, transparent)}`;
  s += `.iso .glow{filter:drop-shadow(0 0 2px var(--iso-glow)) drop-shadow(0 0 9px var(--iso-glow-soft))}`;
  s += `.iso .hit{cursor:pointer;outline:none}.iso .focus-ring{fill:none;stroke:none;pointer-events:none}.iso .hit:focus-visible>.focus-ring{stroke:var(--iso-focus);stroke-width:1.25;stroke-dasharray:3 3}`;
  s += `.iso [data-flow]{stroke-dasharray:3 5}`;
  /* figure frame (caption grammar: index, name, hint, state) */
  s += `.iso-fig{--iso-fig-bg:#151618;--iso-fig-border:rgba(255,255,255,.06);--iso-fig-cap:rgba(236,235,230,.38);--iso-fig-cap-strong:rgba(236,235,230,.62);position:relative;margin:0;border:1px solid var(--iso-fig-border);border-radius:14px;background:var(--iso-fig-bg);padding:64px 32px;overflow:hidden;box-sizing:border-box;font-family:ui-monospace,"Geist Mono","SF Mono",Menlo,monospace}`;
  s += `.iso-fig.iso-light{--iso-fig-bg:#fbfaf7;--iso-fig-border:rgba(0,0,0,.08);--iso-fig-cap:rgba(18,18,17,.45);--iso-fig-cap-strong:rgba(18,18,17,.7)}`;
  s += `.iso-fig.iso-paper{--iso-fig-bg:#f3eee4;--iso-fig-border:rgba(42,36,27,.12);--iso-fig-cap:rgba(42,36,27,.5);--iso-fig-cap-strong:rgba(42,36,27,.75)}`;
  s += `.iso-fig.iso-blueprint{--iso-fig-bg:#0f2f52;--iso-fig-border:rgba(216,236,255,.12);--iso-fig-cap:rgba(216,236,255,.5);--iso-fig-cap-strong:rgba(216,236,255,.8)}`;
  s += `.iso-fig.iso-terminal{--iso-fig-bg:#08140d;--iso-fig-border:rgba(157,255,191,.1);--iso-fig-cap:rgba(157,255,191,.45);--iso-fig-cap-strong:rgba(157,255,191,.75)}`;
  s += `.iso-fig .iso-cap{position:absolute;margin:0;font-size:11px;line-height:1;letter-spacing:.08em;color:var(--iso-fig-cap);pointer-events:none;white-space:nowrap}`;
  s += `.iso-fig .iso-cap-tl{top:22px;left:24px}.iso-fig .iso-cap-tr{top:22px;right:24px;text-transform:uppercase}.iso-fig .iso-cap-bl{bottom:22px;left:24px;text-transform:uppercase}.iso-fig .iso-cap-br{bottom:22px;right:24px;color:var(--iso-fig-cap-strong)}`;
  s += `@media (max-width:520px){.iso-fig{padding:52px 12px}.iso-fig .iso-cap-bl{display:none}}`;
  s += `.iso-stage{position:relative}`;
  return s;
}

let injected = false;
export function injectCSS(doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || injected || doc.getElementById('iso-engine-css')) { injected = true; return; }
  const el = doc.createElement('style');
  el.id = 'iso-engine-css';
  el.textContent = css();
  doc.head.appendChild(el);
  injected = true;
}
