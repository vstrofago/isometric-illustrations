#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/* Render an Iso scene (any HTML page that uses the engine) to PNG, MP4, GIF, WebM or SVG.
   The page runs with a manual clock, so every frame is deterministic.

   node render.mjs page.html                       → page.png (rest pose, after entrances)
   node render.mjs page.html --time 2.5 --out a.png
   node render.mjs page.html --video out.mp4 --duration 6 --fps 30
   node render.mjs page.html --gif out.gif --duration 4 --fps 20 --width 720
   node render.mjs page.html --svg out.svg          (portable SVG, colours inlined)
   node render.mjs page.html --sheet sheet.png --duration 4   (contact sheet of 8 frames)

   Interactions (scripted, deterministic): --actions '[{"t":0.5,"click":"pc-body"},{"t":2,"type":"hello"},{"t":3,"key":"Enter"}]'
     click: a node id (data-id) or CSS selector · type: text typed key by key (keydown/keyup on window) · key: one key
   Options: --selector <css> (default: .iso-fig, else svg.iso) · --width <px> viewport width (1200)
            --scale <dpr> (2) · --theme <name> · --wait <ms> extra settle time · --quiet
   Needs Playwright (npm i -D playwright) and, for video/gif, ffmpeg on PATH. */
import { mkdtempSync, rmSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const opt = { _: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; opt[k] = v; }
  else opt._.push(a);
}
if (!opt._[0]) { console.error('usage: render.mjs <page.html|url> [--out file.png] [--time s] [--video f.mp4|--gif f.gif|--webm f.webm] [--duration s] [--fps n] [--svg f.svg] [--sheet f.png]'); process.exit(1); }

async function loadPlaywright() {
  const tries = ['playwright', 'playwright-core', '@playwright/test'];
  for (const t of tries) { try { return await import(t); } catch {} }
  /* global install */
  try {
    const req = createRequire(import.meta.url);
    const npmRoot = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim();
    return req(join(npmRoot, 'playwright'));
  } catch {}
  console.error('Playwright not found. Install it with: npm i -D playwright  (then: npx playwright install chromium)');
  process.exit(2);
}

const target = opt._[0];
const url = /^https?:|^file:/.test(target) ? target : pathToFileURL(resolve(target)).href;
const stem = /^https?:/.test(target) ? 'render' : basename(target, extname(target));
const width = +(opt.width || 1200), scale = +(opt.scale || 2), fps = +(opt.fps || 30);
const log = (...m) => { if (!opt.quiet) console.log(...m); };

const pw = await loadPlaywright();
const chromium = pw.chromium || (pw.default && pw.default.chromium);
let browser;
try { browser = await chromium.launch(); }
catch (e) {
  const exe = ['/opt/pw-browsers/chromium/chrome-linux/chrome', process.env.CHROME_PATH].filter(Boolean).find(existsSync);
  if (!exe) throw e;
  browser = await chromium.launch({ executablePath: exe });
}
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: scale, reducedMotion: 'no-preference' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
await page.addInitScript(() => { window.__ISO_MANUAL__ = true; });
await page.goto(url, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.Iso && Iso.scenes().length > 0 && Iso.scenes().every((s) => s.built), null, { timeout: 8000 });
} catch {
  console.error('No Iso scene finished rendering.' + (errors.length ? '\n' + errors.join('\n') : ''));
  await browser.close(); process.exit(3);
}
if (opt.theme) await page.evaluate((t) => Iso.scenes().forEach((s) => s.setTheme(t)), opt.theme);
await page.evaluate(() => document.fonts && document.fonts.ready);
if (opt.wait) await page.waitForTimeout(+opt.wait);

const sel = opt.selector || (await page.evaluate(() => (document.querySelector('.iso-fig') ? '.iso-fig' : 'svg.iso')));
const el = await page.$(sel);
if (!el) { console.error('selector not found: ' + sel); await browser.close(); process.exit(4); }

/* scripted actions, run when the clock passes their time */
const actions = opt.actions ? JSON.parse(opt.actions).sort((a, b) => a.t - b.t) : [];
await page.evaluate((acts) => { window.__isoActions = acts; window.__isoActIdx = 0; }, actions);
/* advance all scenes to absolute time t, stepping at 60 Hz so callbacks fire in order */
const goTo = (t) => page.evaluate((t) => {
  const s0 = Iso.scenes()[0], cur = s0 ? s0.time : 0, step = 1 / 60;
  const run = (a) => {
    const fire = (type, key) => { const e = new KeyboardEvent(type, { key, bubbles: true, cancelable: true }); (document.activeElement || document.body).dispatchEvent(e); };
    if (a.click) {
      const el = document.querySelector('[data-id="' + a.click + '"]') || document.querySelector(a.click);
      if (el) { el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })); }
    }
    if (a.hover) { const el = document.querySelector('[data-id="' + a.hover + '"]') || document.querySelector(a.hover); if (el) el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); }
    if (a.type) for (const ch of a.type) { fire('keydown', ch); fire('keyup', ch); }
    if (a.key) { fire('keydown', a.key); fire('keyup', a.key); }
  };
  let now = cur;
  const due = () => { const A = window.__isoActions; while (window.__isoActIdx < A.length && A[window.__isoActIdx].t <= now + 1e-9) run(A[window.__isoActIdx++]); };
  due();
  while (now < t - 1e-9) { const dt = Math.min(step, t - now); Iso.advance(dt); now += dt; due(); }
}, t);
const stats = await page.evaluate(() => Iso.scenes().map((s) => ({ nodes: s.byUid.size - 1, settle: +s.settleTime().toFixed(2), timelines: s.timelines.length, loops: s.behaviors.length, viewBox: s.vb && s.vb.map((v) => Math.round(v)) })));

const ffmpeg = (a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });

if (opt.video || opt.gif || opt.webm || opt.sheet) {
  const dur = +(opt.duration || Math.max(4, stats[0].settle + 2));
  const dir = mkdtempSync(join(tmpdir(), 'iso-frames-'));
  const n = opt.sheet ? 8 : Math.round(dur * fps);
  const start = +(opt.start || 0);
  await goTo(start);
  for (let i = 0; i < n; i++) {
    const t = opt.sheet ? start + (dur * i) / (n - 1) : start + i / fps;
    await goTo(t);
    await el.screenshot({ path: join(dir, String(i).padStart(5, '0') + '.png') });
  }
  const pat = join(dir, '%05d.png');
  if (opt.video) { ffmpeg(['-framerate', String(fps), '-i', pat, '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', opt.video]); log('video →', opt.video); }
  if (opt.webm) { ffmpeg(['-framerate', String(fps), '-i', pat, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', opt.webm]); log('webm →', opt.webm); }
  if (opt.gif) {
    const w = +(opt.gifWidth || 720);
    ffmpeg(['-framerate', String(fps), '-i', pat, '-vf', `scale=${w}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`, opt.gif]);
    log('gif →', opt.gif);
  }
  if (opt.sheet) { ffmpeg(['-i', pat, '-vf', 'scale=800:-1,tile=2x4:padding=8:color=black', '-frames:v', '1', opt.sheet]); log('sheet →', opt.sheet); }
  rmSync(dir, { recursive: true, force: true });
} else if (opt.svg) {
  await goTo(opt.time !== undefined ? +opt.time : stats[0].settle);
  const svg = await page.evaluate(() => Iso.scenes()[0].toSVG());
  writeFileSync(opt.svg, svg); log('svg →', opt.svg);
} else {
  const t = opt.time !== undefined ? +opt.time : stats[0].settle;
  await goTo(t);
  const out = opt.out || stem + '.png';
  await el.screenshot({ path: out });
  log(`png → ${out}  (t=${t}s)`);
}
log('scenes:', JSON.stringify(stats));
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exitCode = 5; }
await browser.close();
