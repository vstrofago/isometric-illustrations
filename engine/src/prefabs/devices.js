/* Device prefabs: phone, card, laptop, monitor, keyboard, desk computer, server, database, chip, router. */
import { MARK, ICONS } from './icons.js';
import { rng, fmt } from '../math.js';
import { Face } from '../shapes.js';

/* Screen content helper on a Face: mode off | ui | lit | dots | mark */
function screen(f, mode = 'off', o = {}) {
  const pad = o.pad ?? 0.9, r = o.r ?? 1.6;
  const w = f.w - 2 * pad, h = f.h - 2 * pad;
  if (mode === 'lit') { f.rect(pad, pad, w, h, { r, fill: 'f-lit', line: 'ln-soft' }); return; }
  f.rect(pad, pad, w, h, { r, fill: mode === 'off' ? 'f-screen' : 'f-screen', line: 'ln-soft' });
  if (mode === 'ui') {
    const cols = o.cols ?? 4, rows = o.rows ?? 5, gx = w * 0.14, top = h * 0.2;
    f.grid(pad + gx, pad + top, w - 2 * gx, h * 0.62, cols, rows, { gap: Math.min(w, h) * 0.08, r: 0.6, fill: 'f-soft', line: null });
  } else if (mode === 'dots') {
    for (let j = 0; j < 7; j++) for (let i = 0; i < 4; i++) f.circle(pad + w * (0.2 + i * 0.2), pad + h * (0.2 + j * 0.1), 0.35, { fill: 'f-soft', line: null, n: 6 });
  } else if (mode === 'mark') {
    const s = Math.min(w, h) * 0.45 / 9;
    f.svg('<path class="f-lit" d="' + MARK + '"/>', { u: pad + w / 2 - 4.5 * s, v: pad + h / 2 - 4.5 * s, transform: 'scale(' + fmt(s) + ')' });
  }
}

export default function install(define) {
  /* Standing phone, screen toward +y (use facing:'right' to turn it). screen: off | ui | lit | dots | mark */
  define('phone', (g, o) => {
    const w = o.w ?? 13, h = o.h ?? 27, t = o.t ?? 1.6, r = o.r ?? 2.2, mode = o.screen || 'ui';
    let z = 0;
    if (o.stand) { g.box({ center: [0, 0, 0], size: [w * 0.75, 7, 2.2], r: 1.2, chamfer: 0.5 }); z = 2.2; }
    if (o.lying) {
      g.panel({ plane: 'top', at: [-w / 2, -h / 2, t], w, h, t, r, front: (f) => { screen(f, mode, { r: r - 0.6 }); f.rect(w / 2 - 2, 1.6, 4, 1, { r: 0.5, fill: 'f-ink', line: null }); } });
      return;
    }
    g.panel({
      plane: 'left', at: [-w / 2, t / 2, z], w, h, t, r, material: o.material,
      front: (f) => {
        screen(f, mode, { r: r - 0.6 });
        f.rect(w / 2 - 2, 1.7, 4, 1.1, { r: 0.55, fill: mode === 'lit' ? 'f-ink' : 'f-bg', line: null });
      },
    });
  }, { sort: 'none' });

  /* Thin card lying flat; lit by default (the "one lit moment") */
  define('card', (g, o) => {
    const w = o.w ?? 16, d = o.d ?? 10, t = o.t ?? 1.2, lit = o.lit !== false;
    g.box({
      center: [0, 0, 0], size: [w, d, t], r: o.r ?? 1.2, material: lit ? 'lit' : o.material, glow: o.glow ?? lit,
      top: (f) => { f.rect(2, 2.2, 3.4, 2.6, { r: 0.6, line: 'ln-soft' }); f.line(2, d - 2.4, w * 0.55, d - 2.4, 'ln-soft'); },
    });
  }, { sort: 'none' });

  /* Open laptop facing +y. open: lid angle in degrees from the base (default 105). */
  define('laptop', (g, o) => {
    const w = o.w ?? 40, d = o.d ?? 28, t = 2.2, lt = 1.2, ang = ((o.open ?? 105) * Math.PI) / 180, L = d * 0.92;
    g.box({ at: [-w / 2, -d / 2, 0], size: [w, d, t], r: 1.6, chamfer: 0.5, material: o.material,
      top: (f) => { f.grid(4, 3.5, w - 8, d * 0.42, 12, 4, { gap: 0.8, r: 0.3, line: 'ln-faint' }); f.rect(w / 2 - 7, d * 0.58, 14, d * 0.3, { r: 1, line: 'ln-faint' }); } });
    const dir = [0, Math.cos(ang), Math.sin(ang)], back = [0, -Math.sin(ang) * lt, Math.cos(ang) * lt];
    const hinge = [-w / 2, -d / 2 + lt, t];
    g.slab({ origin: hinge, u: [w, 0, 0], v: [dir[0] * L, dir[1] * L, dir[2] * L], w: [back[0], back[1], back[2]], material: o.material });
    const mode = o.screen || 'ui';
    g.custom({
      bounds: [-w / 2, -d / 2, t, w / 2, -d / 2 + lt, t + L],
      draw: (dd) => {
        const top = [hinge[0], hinge[1] + dir[1] * L, hinge[2] + dir[2] * L];
        const f = Face.local(dd, top, [1, 0, 0], [0, -dir[1], -dir[2]], w, L);
        const s = f.sub(1.8, 1.8, w - 3.6, L - 3.6);
        screen(s, mode, { r: 1, pad: 0, cols: 6, rows: 3 });
      },
    });
  }, { sort: 'none' });

  /* Monitor on a stand facing +y */
  define('monitor', (g, o) => {
    const w = o.w ?? 48, h = o.h ?? 30, t = 2;
    g.box({ center: [0, -2, 0], size: [16, 10, 1.6], r: 2, chamfer: 0.5 });
    g.box({ center: [0, -3.5, 1.6], size: [4, 2, 10], r: 0.8 });
    g.panel({ plane: 'left', at: [-w / 2, 0, 8], w, h, t, r: 1.6, material: o.material, front: (f) => screen(f, o.screen || 'ui', { r: 1, cols: 6, rows: 3, pad: 1.4 }) });
  }, { sort: 'none' });

  /* Keyboard; keys are nodes with id `${id}-key-<name>` so they can be pressed. */
  define('keyboard', (g, o) => {
    const w = o.w ?? 186, d = o.d ?? 52, h = o.h ?? 7;
    buildKeyboard(g, { x: -w / 2, y: -d / 2, z: 0, w, d, h, id: o.id });
    return keyboardAPI(g);
  }, { sort: 'none' });

  /* Fig. 02 · the reference desk computer: base plate, body with CRT screen, keyboard, coiled cable.
     API: power(on?), type(key), press(key, down). Emits status through opts.onStatus(text). */
  define('deskComputer', (g, o) => {
    const ox = -138, oy = -114; // stoico coordinates → centred
    const X = (x) => x + ox, Y = (y) => y + oy;
    const BASE = { w: 276, d: 228, h: 14 }, BODY = { x: 70, y: 24, w: 130, d: 118, h: 168, z: 14 }, KB = { x: 40, y: 162, w: 186, d: 52, h: 7, z: 14 };
    const YF = Y(BODY.y + BODY.d), XR = X(BODY.x + BODY.w), z0 = BODY.z;
    if (o.base !== false) {
      g.group({ id: o.id ? o.id + '-base' : undefined, sort: 'none' }, (b) => {
        b.box({ at: [X(0), Y(0), 0], size: [BASE.w, BASE.d, BASE.h], r: 12, chamfer: 3 });
        b.rect({ at: [X(11), Y(11), BASE.h], size: [BASE.w - 22, BASE.d - 22], r: 6, line: 'ln-soft' });
        for (const [cx, cy] of [[18, 18], [BASE.w - 18, 18], [18, BASE.d - 18], [BASE.w - 18, BASE.d - 18]]) b.circle({ at: [X(cx), Y(cy), BASE.h], r: 1.7, line: 'ln-soft' });
      });
    }
    const bx = X(BODY.x + 11), bz = z0 + 56;
    const body = g.box({
      id: o.id ? o.id + '-body' : undefined, at: [X(BODY.x), Y(BODY.y), z0], size: [BODY.w, BODY.d, BODY.h], r: 10, chamfer: 3,
      top: (f) => f.rect(22, 50, BODY.w - 44, 8, { r: 4, line: 'ln-soft' }),
      left: (f) => {
        f.rect(11, BODY.h - 56 - 90, 108, 90, { r: 9, fill: 'f-bevel', line: 'ln-soft' });
        f.vlines(13, BODY.h - 36, 8 * 3.3 - 3.3, 22, 8);
        f.rect(72, BODY.h - 24 - 7, 48, 7, { r: 3.5, line: 'ln-soft' });
        f.line(78, BODY.h - 27.5, 114, BODY.h - 27.5);
      },
      right: (f) => {
        f.vlines(62, BODY.h - 148, 8 * 3.6, 44, 9);
        f.rect(98, BODY.h - 38, 11, 20, { r: 2, line: 'ln-soft' });
        f.line(103.5, BODY.h - 36, 103.5, BODY.h - 28);
      },
    });
    /* the screen: its own node so it can animate without redrawing the body */
    const scr = g.pane({
      id: o.id ? o.id + '-screen' : undefined, plane: 'left', at: [bx + 6, YF, bz + 6 + 78], w: 96, h: 78, fill: false, line: false,
      power: 0, text: '', cursor: true, logo: o.logo,
      draw: (f, n) => drawCRT(f, n),
    });
    const led = g.pane({ id: o.id ? o.id + '-led' : undefined, plane: 'left', at: [X(BODY.x + 14), YF, z0 + 45], w: 3, h: 3, r: 1.5, fill: 'f-soft', line: null });
    g.box({ at: [XR, YF - 52, z0 + 8], size: [7, 9, 7], r: 2, n: 3 });
    const kb = g.group({ id: o.id ? o.id + '-keyboard' : undefined, sort: 'none' }, (k) => buildKeyboard(k, { x: X(KB.x), y: Y(KB.y), z: KB.z, w: KB.w, d: KB.d, h: KB.h, id: o.id }));
    g.helix({ a: [XR + 7, YF - 47.5, z0 + 11.5], b: [X(KB.x + KB.w + 2), Y(KB.y + 12), KB.z + 5], r: 2.6, turns: 15 });
    g.box({ at: [X(KB.x + KB.w), Y(KB.y + 9), KB.z + 2], size: [4, 6, 5], r: 1.6, n: 3 });

    const state = { on: false, text: '', count: 0, last: '' };
    const status = () => { if (o.onStatus) o.onStatus(state.on ? 'on · ' + state.count + ' chars' + (state.last ? ' · key ' + state.last : '') : 'off', state); };
    const kapi = keyboardAPI(kb);
    return {
      state, screenNode: scr, body, keyboard: kb,
      onMount(scene) {
        scene.loop((t) => { if (scr.opts.power >= 1) scr.set('cursor', Math.floor(t * 1.9) % 2 === 0); });
        status();
      },
      power(on = !state.on) {
        const s = this.scene;
        state.on = on;
        if (!on) { state.text = ''; state.count = 0; state.last = ''; scr.set('text', ''); }
        led.set('fill', on ? 'f-lit' : 'f-soft'); led.set('glow', on);
        if (s) s.to(scr, { power: on ? 1 : 0 }, { duration: on ? 1.1 : 0.32, ease: 'linear' });
        else scr.set('power', on ? 1 : 0);
        this.set('pressed', on);
        status();
        return this;
      },
      type(key) {
        if (!state.on) return this;
        state.last = key === ' ' ? 'space' : key;
        if (key.length === 1) { state.text += key; state.count++; }
        else if (key === 'Backspace') state.text = state.text.slice(0, -1);
        else if (key === 'Enter') state.text = '';
        scr.set('text', state.text);
        status();
        return this;
      },
      press: kapi.press,
    };
  }, { sort: 'none' });

  /* Server rack facing +y; LEDs have class "led" (blink them with scene.blink('.led')). */
  define('server', (g, o) => {
    const w = o.w ?? 28, d = o.d ?? 34, h = o.h ?? 64, units = o.units ?? 6, R = rng(o.seed ?? 2);
    const uh = (h - 8) / units;
    g.box({
      at: [-w / 2, -d / 2, 0], size: [w, d, h], r: 2, chamfer: 1, material: o.material,
      left: (f) => {
        for (let i = 0; i < units; i++) {
          const v = 4 + i * uh;
          f.rect(3, v + 0.8, w - 6, uh - 1.6, { r: 0.8, fill: 'f-bevel', line: 'ln-soft' });
          f.hlines(w * 0.45, v + uh * 0.3, w * 0.38, uh * 0.4, 3, 'ln-faint');
        }
      },
      right: (f) => { f.vlines(5, 8, d - 10, h * 0.35, 10, 'ln-faint'); },
      top: (f) => f.rect(3, 3, w - 6, d - 6, { r: 1, line: 'ln-faint' }),
    });
    for (let i = 0; i < units; i++) {
      const v = 4 + i * uh;
      for (let k = 0; k < 2; k++) {
        g.pane({ id: o.id ? o.id + '-led-' + i + '-' + k : undefined, class: 'led', plane: 'left', at: [-w / 2 + 5.5 + k * 3.2, d / 2 + 0.05, h - v - uh * 0.5 + 0.8], w: 1.6, h: 1.6, r: 0.8, fill: R() < 0.6 ? 'f-lit' : 'f-soft', line: null });
      }
    }
  }, { sort: 'none' });

  /* Database: stacked discs */
  define('database', (g, o) => {
    const r = o.r ?? 16, tiers = o.tiers ?? 3, th = o.tierH ?? 8, gap = o.gap ?? 1.6;
    for (let i = 0; i < tiers; i++) g.cylinder({ at: [0, 0, i * (th + gap)], r, h: th, chamfer: 0.8, material: o.material, bands: o.bands, rings: i === tiers - 1 ? [r * 0.55] : undefined });
  }, { sort: 'none' });

  /* Chip with pins and a die */
  define('chip', (g, o) => {
    const s = o.size ?? 30, n = o.pins ?? 6, t = o.h ?? 3;
    const pitch = s / (n + 1);
    for (let i = 1; i <= n; i++) {
      const p = -s / 2 + i * pitch - 0.9;
      g.box({ at: [p, -s / 2 - 2.6, 0.4], size: [1.8, 2.6, 0.8] });
      g.box({ at: [-s / 2 - 2.6, p, 0.4], size: [2.6, 1.8, 0.8] });
      g.box({ at: [p, s / 2, 0.4], size: [1.8, 2.6, 0.8] });
      g.box({ at: [s / 2, p, 0.4], size: [2.6, 1.8, 0.8] });
    }
    g.box({ at: [-s / 2, -s / 2, 0], size: [s, s, t], r: 1.5, chamfer: 0.6, material: o.material });
    const ds = s * 0.56;
    g.box({ at: [-ds / 2, -ds / 2, t], size: [ds, ds, 1.4], r: 1, material: o.die || (o.lit ? 'lit' : 'dark'), glow: !!o.lit,
      top: o.label ? (f) => f.text(o.label, ds / 2, ds / 2 + 1.6, { size: Math.min(4.5, ds / o.label.length * 1.4), anchor: 'middle', cls: o.lit ? 'tx-strong' : 'tx' }) : undefined });
  });

  /* Router / hub: box with antennas and LEDs */
  define('router', (g, o) => {
    const w = o.w ?? 34, d = o.d ?? 20, h = o.h ?? 6;
    g.box({ at: [-w / 2, -d / 2, 0], size: [w, d, h], r: 2.5, chamfer: 0.8, material: o.material, top: (f) => f.hlines(w * 0.3, d * 0.3, w * 0.4, d * 0.4, 4, 'ln-faint') });
    for (const x of [-w / 2 + 4, w / 2 - 4]) g.cylinder({ at: [x, -d / 2 + 3, h], r: 0.9, h: 16 });
    for (let i = 0; i < 4; i++) g.pane({ class: 'led', plane: 'left', at: [-w / 2 + 6 + i * 4, d / 2 + 0.05, h * 0.62], w: 1.6, h: 1.2, r: 0.5, fill: 'f-lit', line: null });
  }, { sort: 'none' });
}

/* ── keyboard (shared) ── */
function chars(s) { return s.split('').map((c) => [c, 1]); }
const ROWS = [
  [['`', 1]].concat(chars('1234567890-='), [['backspace', 2]]),
  [['tab', 1.5]].concat(chars('qwertyuiop[]'), [['\\', 1.5]]),
  [['capslock', 1.75]].concat(chars("asdfghjkl;'"), [['enter', 2.25]]),
  [['shift', 2.25]].concat(chars('zxcvbnm,./'), [['shift', 2.75]]),
  [['control', 1.25], ['alt', 1.25], ['meta', 1.25], ['space', 7.5], ['meta', 1.25], ['alt', 1.25], ['control', 1.25]],
];
function buildKeyboard(g, K) {
  g.box({ at: [K.x, K.y, K.z], size: [K.w, K.d, K.h], r: 6, chamfer: 1.5, top: (f) => f.rect(5, 5, K.w - 10, K.d - 10, { r: 3, line: 'ln-soft' }) });
  const top = K.z + K.h, unit = (K.w - 12) / 15, pitch = (K.d - 12) / 5, k0x = K.x + 6, k0y = K.y + 6;
  ROWS.forEach((row, ri) => {
    let x = k0x;
    row.forEach(([name, kw]) => {
      const w = kw * unit - 1.8;
      g.box({ id: (K.id ? K.id + '-' : '') + 'key-' + name + (g.find((n) => n.id === (K.id ? K.id + '-' : '') + 'key-' + name) ? '-2' : ''), class: 'key', key: name,
        at: [x + 0.9, k0y + ri * pitch + 0.8, top], size: [w, pitch - 1.8, 3], r: 1.3, chamfer: 0.7, n: 2, tone: { top: 'f-key' } });
      x += kw * unit;
    });
  });
}
function keyboardAPI(kb) {
  return {
    press(name, down = true) {
      const s = kb.scene;
      kb.findAll((n) => n.opts.key === name).forEach((k) => {
        k.set('material', down ? 'paper' : undefined);
        if (s) s.to(k, { z: down ? -1.4 : 0 }, { duration: 0.06, ease: 'outQuad' }); else k.set('z', down ? -1.4 : 0);
      });
    },
  };
}

/* ── CRT screen (power 0 → 1: line, open, glow) ── */
function drawCRT(f, n) {
  const o = n.opts, w = f.w, h = f.h, p = o.power || 0, id = 'crt' + n.uid;
  f.rect(0, 0, w, h, { r: 6, fill: 'f-screen', line: 'ln' });
  if (p <= 0) return;
  const lineP = Math.min(1, p / 0.16), openP = Math.max(0, Math.min(1, (p - 0.16) / 0.34)), easeO = 1 - Math.pow(1 - openP, 3);
  const flash = openP < 1 ? 0.55 * (1 - openP) : Math.max(0, 0.25 - (p - 0.5) * 0.6);
  const hh = Math.max(1.2, h * easeO), y0 = (h - hh) / 2;
  let s = '<defs><clipPath id="' + id + 'c"><rect x="0" y="' + fmt(y0) + '" width="' + w + '" height="' + fmt(hh) + '" rx="6"/></clipPath>' +
    '<radialGradient id="' + id + 'g" cx="50%" cy="42%" r="62%"><stop offset="0" style="stop-color:var(--iso-lit);stop-opacity:.16"/><stop offset="1" style="stop-color:var(--iso-lit);stop-opacity:0"/></radialGradient></defs>';
  if (openP <= 0) {
    const lw = w * (0.15 + 0.85 * lineP);
    s += '<path class="ln-lit" d="M' + fmt((w - lw) / 2) + ' ' + fmt(h / 2) + 'H' + fmt((w + lw) / 2) + '" style="filter:drop-shadow(0 0 2px var(--iso-glow))"/>';
    f.svg(s);
    return;
  }
  s += '<g clip-path="url(#' + id + 'c)">';
  s += '<rect class="f-screen-on" x="0" y="0" width="' + w + '" height="' + h + '"/>';
  s += '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#' + id + 'g)"/>';
  if (openP > 0.4) {
    const a = Math.min(1, (openP - 0.4) / 0.6);
    const logo = o.logo || MARK, logoIsPath = /^M/.test(logo);
    s += '<g style="opacity:' + fmt(a) + '">';
    s += logoIsPath ? '<path class="f-lit" transform="translate(31.8 12) scale(3.6)" d="' + logo + '" style="filter:drop-shadow(0 0 2.5px var(--iso-glow))"/>' : logo;
    const shown = (o.text || '').slice(-17);
    s += '<text class="tx-lit" x="9" y="60" font-size="6" style="white-space:pre">&gt; ' + esc(shown) + '</text>';
    if (o.cursor && p >= 1) s += '<rect class="f-lit" x="' + fmt(9 + (2 + shown.length) * 3.62) + '" y="54.6" width="3.2" height="6.2"/>';
    s += '</g>';
  }
  if (flash > 0) s += '<rect class="f-lit" x="0" y="0" width="' + w + '" height="' + h + '" style="opacity:' + fmt(flash) + '"/>';
  s += '</g>';
  if (openP < 1) {
    s += '<path class="ln-lit" d="M0 ' + fmt(y0) + 'H' + w + 'M0 ' + fmt(y0 + hh) + 'H' + w + '" style="opacity:' + fmt(1 - openP) + '"/>';
  }
  f.svg(s);
}
function esc(s) { return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
export { ICONS };
