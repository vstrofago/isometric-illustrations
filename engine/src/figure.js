/* Figure frame: a quiet card with mono captions at the four corners
   (index · name · hint · state), the same grammar as the reference figures. */
import { injectCSS } from './style.js';

export function figure(host, o = {}) {
  injectCSS();
  host = typeof host === 'string' ? document.querySelector(host) : host;
  const fig = document.createElement('figure');
  fig.className = 'iso-fig iso-' + (o.theme || 'dark') + (o.class ? ' ' + o.class : '');
  const cap = (pos, text, live) => {
    const p = document.createElement('p');
    p.className = 'iso-cap iso-cap-' + pos;
    if (live) p.setAttribute('aria-live', 'polite');
    p.textContent = text || '';
    if (!text && !live) p.hidden = true;
    fig.appendChild(p);
    return p;
  };
  const caps = { tl: cap('tl', o.index), tr: cap('tr', o.title) };
  const stage = document.createElement('div');
  stage.className = 'iso-stage';
  fig.appendChild(stage);
  caps.bl = cap('bl', o.hint);
  caps.br = cap('br', o.status, true);
  if (o.maxWidth) stage.style.maxWidth = typeof o.maxWidth === 'number' ? o.maxWidth + 'px' : o.maxWidth, stage.style.margin = '0 auto';
  host.appendChild(fig);
  return {
    el: fig,
    stage,
    caps,
    status(text) { caps.br.textContent = text; caps.br.hidden = false; return this; },
    caption(pos, text) { const c = caps[pos]; if (c) { c.textContent = text; c.hidden = !text; } return this; },
  };
}
