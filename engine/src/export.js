/* Export: portable SVG (computed colours inlined), PNG, and downloads. */
import { Scene } from './scene.js';

const PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'fill-opacity', 'stroke-opacity', 'font-family', 'font-size', 'letter-spacing', 'text-transform', 'display', 'filter'];
let ctx2d = null;
const cache = new Map();
function rgba(c) {
  if (!c || c === 'none' || c.startsWith('url(')) return c;
  if (cache.has(c)) return cache.get(c);
  if (!ctx2d) { const cv = document.createElement('canvas'); cv.width = cv.height = 1; ctx2d = cv.getContext('2d', { willReadFrequently: true }); }
  ctx2d.clearRect(0, 0, 1, 1);
  ctx2d.fillStyle = '#000'; ctx2d.fillStyle = c;
  ctx2d.fillRect(0, 0, 1, 1);
  const d = ctx2d.getImageData(0, 0, 1, 1).data;
  const out = d[3] === 255 ? `rgb(${d[0]},${d[1]},${d[2]})` : d[3] === 0 ? 'none' : `rgba(${d[0]},${d[1]},${d[2]},${(d[3] / 255).toFixed(3)})`;
  cache.set(c, out);
  return out;
}

Object.assign(Scene.prototype, {
  /* Self-contained SVG string: every computed paint inlined, so it renders anywhere. */
  toSVG(o = {}) {
    if (!this.svg) this.render();
    const src = this.svg, clone = src.cloneNode(true);
    const a = src.querySelectorAll('*'), b = clone.querySelectorAll('*');
    for (let i = 0; i < a.length; i++) {
      const cs = getComputedStyle(a[i]), el = b[i];
      if (a[i].tagName === 'title') continue;
      if (cs.display === 'none') { el.setAttribute('display', 'none'); continue; }
      for (const p of PROPS) {
        let v = cs.getPropertyValue(p);
        if (!v || v === 'normal' || v === 'auto') continue;
        if (p === 'fill' || p === 'stroke') v = rgba(v);
        if (p === 'filter') { if (v === 'none') continue; }
        if (p === 'opacity' && v === '1') continue;
        if (p === 'text-transform') { if (v === 'uppercase') el.textContent = el.textContent.toUpperCase(); continue; }
        el.setAttribute(p, v);
      }
      if (el.getAttribute('vector-effect') === null && /^(path|line|polyline|rect|circle|ellipse)$/.test(el.tagName)) el.setAttribute('vector-effect', 'non-scaling-stroke');
      el.removeAttribute('class');
      el.removeAttribute('style');
      el.removeAttribute('tabindex');
    }
    clone.removeAttribute('class');
    clone.removeAttribute('style');
    const vb = this.vb, w = o.width || Math.round(vb[2] * (o.scale || 1)), h = Math.round((w * vb[3]) / vb[2]);
    clone.setAttribute('width', w); clone.setAttribute('height', h);
    if (o.background !== false) {
      const bg = o.background || rgba(getComputedStyle(src).getPropertyValue('--iso-bg').trim() || '#111');
      const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      r.setAttribute('x', vb[0]); r.setAttribute('y', vb[1]); r.setAttribute('width', vb[2]); r.setAttribute('height', vb[3]); r.setAttribute('fill', bg);
      clone.insertBefore(r, clone.firstChild);
    }
    return new XMLSerializer().serializeToString(clone);
  },
  /* PNG blob. o: scale (default 2), background */
  toPNG(o = {}) {
    const scale = o.scale || 2, vb = this.vb;
    const svg = this.toSVG({ ...o, width: Math.round(vb[2] * scale) });
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    return new Promise((res, rej) => {
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        c.getContext('2d').drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        c.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png');
      };
      img.onerror = rej;
      img.src = url;
    });
  },
  async download(name = 'illustration', type = 'svg', o = {}) {
    const blob = type === 'png' ? await this.toPNG(o) : new Blob([this.toSVG(o)], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name + '.' + type;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
});
