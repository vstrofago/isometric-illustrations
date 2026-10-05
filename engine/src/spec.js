/* Declarative scenes: Iso.render(spec) builds a scene from plain JSON.
   {
     host: '#app', theme: 'dark', figure: {index, title, hint, status}, padding, angle,
     objects: [ {type: 'box'|'platform'|..., id, ...opts, children: [...] (for type 'group')} ],
     animations: [ {type: 'assemble'|'float'|'travel'|'orbit'|'pulse'|'blink'|'spin'|'drawOn'|'typewriter'|'timeline', target, ...} ],
     interactions: [ {target, hover: 'lift', click: 'power'|'toggle'|{to:{...}}, status: 'text'} ]
   } */
import { path as P } from './paths.js';

export function pathFrom(p) {
  if (!p) return null;
  if (p.points && p.length !== undefined) return p; // already a Path
  if (Array.isArray(p)) return P.polyline(p);
  switch (p.type) {
    case 'circle': return P.circle(p);
    case 'arc': return P.arc(p);
    case 'line': return P.line(p.from, p.to);
    case 'rect': return P.rect(p);
    case 'hop': return P.hop(p.from, p.to, p.height);
    case 'bezier': return P.bezier(...p.points);
    default: return P.polyline(p.points || [], { radius: p.radius, closed: p.closed });
  }
}

function addObjects(parent, list) {
  for (const raw of list || []) {
    const { type, children, ...o } = raw;
    if (type === 'group') { const g = parent.group(o); addObjects(g, children); continue; }
    if (typeof parent[type] !== 'function') { console.warn('Iso.render: unknown object type "' + type + '"'); continue; }
    const n = parent[type](o);
    if (children && n && n.isGroup) addObjects(n, children);
  }
}

export function renderSpec(Iso, spec, hostOverride) {
  const { objects, animations, interactions, host, ...opts } = spec;
  const s = Iso.scene(hostOverride || host, opts);
  addObjects(s.root, objects);
  for (const a of animations || []) {
    const { type, target, ...o } = a;
    if (o.path) o.path = pathFrom(o.path);
    switch (type) {
      case 'assemble': s.assemble(target, o); break;
      case 'float': s.float(target, o); break;
      case 'pulse': s.pulse(target, o); break;
      case 'blink': s.blink(target, o); break;
      case 'spin': s.spin(target, o); break;
      case 'travel': s.travel(target, o.path, o); break;
      case 'orbit': s.orbit(target, o); break;
      case 'drawOn': s.drawOn(target, o); break;
      case 'typewriter': s.typewriter(target, o); break;
      case 'timeline': {
        const tl = s.timeline({ repeat: o.repeat, yoyo: o.yoyo, delay: o.delay, repeatDelay: o.repeatDelay });
        for (const st of o.steps || []) {
          const m = st.from && st.to ? 'fromTo' : st.from ? 'from' : st.set ? 'set' : 'to';
          const tg = st.target || target;
          if (m === 'fromTo') tl.fromTo(tg, st.from, st.to, st, st.at);
          else if (m === 'set') tl.set(tg, st.set, st.at);
          else tl[m](tg, st.props || st.to || st.from, st, st.at);
          if (st.wait) tl.wait(st.wait);
        }
        break;
      }
      default: console.warn('Iso.render: unknown animation "' + type + '"');
    }
  }
  for (const it of interactions || []) {
    const nodes = s.resolve(it.target);
    if (it.hover === 'lift') s.hoverLift(nodes, { z: it.z ?? 4 });
    for (const n of nodes) {
      if (it.label) n.set('label', it.label);
      if (!it.click) continue;
      n.on('click', () => {
        if (it.click === 'power' && typeof n.power === 'function') n.power();
        else if (it.click === 'toggle') { const on = !n.opts.pressed; n.set('pressed', on); n.set('material', on ? it.onMaterial || 'lit' : it.offMaterial); if (it.status) s.status(on ? it.status.on : it.status.off); }
        else if (typeof it.click === 'object' && it.click.to) s.to(n, it.click.to, it.click);
      });
    }
  }
  return s;
}
