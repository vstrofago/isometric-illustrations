// SPDX-License-Identifier: Apache-2.0
/* Playground presets. JSON presets go through Iso.render(spec); JS presets run with (Iso, host). */
window.ISO_PRESETS = {
  hello: {
    label: 'Hello · first figure',
    mode: 'json',
    spec: {
      figure: { index: 'Fig. 1', title: 'Hello', hint: 'Edit the JSON on the left', status: 'ready' },
      objects: [
        { type: 'platform', size: [160, 120] },
        { type: 'laptop', at: [-10, 0, 0] },
        { type: 'card', id: 'card', at: [44, 24, 0] },
      ],
      animations: [{ type: 'assemble' }, { type: 'float', target: 'card', amp: 4, period: 2.6 }],
    },
  },
  diagram: {
    label: 'Diagram · services',
    mode: 'json',
    spec: {
      figure: { index: 'Fig. 2', title: 'Request path', hint: 'Hover a node', status: 'live' },
      objects: [
        { type: 'platform', size: [380, 220], label: 'api · production' },
        {
          type: 'diagram', grid: 90, origin: [-135, -40], speed: 40,
          zones: [{ from: [2, 0], to: [3, 1], label: 'private', pad: 34 }],
          nodes: [
            { id: 'user', cell: [0, 0], icon: 'user', label: 'User' },
            { id: 'api', cell: [1, 0], icon: 'server', label: 'API', material: 'lit', glow: true },
            { id: 'db', cell: [3, 0], type: 'database', r: 15 },
            { id: 'jobs', cell: [2, 1], icon: 'queue', label: 'Jobs' },
            { id: 'mail', cell: [3, 1], icon: 'mail', label: 'Mail' },
          ],
          edges: [
            { from: 'user', to: 'api', packets: 2, label: 'https' },
            { from: 'api', to: 'db', packets: 1 },
            { from: 'api', to: 'jobs', route: 'y', packets: 1 },
            { from: 'jobs', to: 'mail', packets: 1 },
          ],
        },
      ],
      animations: [{ type: 'assemble', stagger: 0.06 }],
      interactions: [{ target: ['user', 'api', 'jobs', 'mail'], hover: 'lift', z: 6 }],
    },
  },
  workspace: {
    label: 'Workspace · desk',
    mode: 'json',
    spec: {
      figure: { index: 'Fig. 3', title: 'Workspace', hint: 'A quiet desk', status: 'focus' },
      objects: [
        { type: 'platform', size: [200, 150] },
        { type: 'desk', id: 'desk', at: [0, -10, 0], size: [120, 56], h: 34 },
        { type: 'monitor', at: [0, -24, 34], w: 52, h: 30 },
        { type: 'keyboard', at: [0, 4, 34], w: 52, d: 14, h: 2 },
        { type: 'plant', at: [48, -26, 34], r: 5 },
        { type: 'lamp', id: 'lamp', at: [-48, -24, 34], h: 30 },
        { type: 'card', id: 'note', at: [34, 8, 34], w: 10, d: 7, lit: false },
        { type: 'tree', at: [76, 50, 0], kind: 'round' },
      ],
      animations: [{ type: 'assemble', stagger: 0.08 }, { type: 'pulse', target: 'lamp', min: 0.85, max: 1, period: 3 }],
    },
  },
  city: {
    label: 'City block · traffic',
    mode: 'js',
    code: `// JS mode: you get Iso and host. Return the scene.
const s = Iso.scene(host, { figure: { index: 'Fig. 4', title: 'City block', hint: 'Cars loop the block', status: 'rush hour' } });
s.platform({ size: [300, 260] });
const road = Iso.path.rect({ at: [-110, -96, 0], size: [220, 192], r: 18 });
s.ribbon({ path: road, width: 16, fill: 'f-road', center: '4 5' });
const R = Iso.rng(4);
[[-50, -36], [12, -40], [60, -30], [-50, 30], [10, 34], [62, 36]].forEach(([x, y], i) =>
  s.building({ at: [x, y, 0], w: 34, d: 34, h: 30 + R() * 50, lit: 0.15, seed: i + 3 }));
for (let i = 0; i < 10; i++) s.tree({ at: [-140 + i * 31, 118, 0], kind: 'round', scale: 0.8 });
const cars = [0, 1, 2, 3].map((i) => s.car({ id: 'car-' + i, at: [-110, -96, 0], length: 16, w: 8 }));
s.travel(cars, road, { duration: 14, orient: true });
s.assemble(s.root.items().filter((n) => n.prefab === 'building' || n.prefab === 'tree'), { stagger: 0.05 });
return s;`,
  },
  layers: {
    label: 'Stack · layers',
    mode: 'json',
    spec: {
      figure: { index: 'Fig. 5', title: 'Platform layers', hint: 'Bottom to top', status: '4 layers' },
      objects: [
        { type: 'stack', id: 'stack', size: [110, 84], t: 7, gap: 18,
          layers: [{ label: 'Hardware', icon: 'cpu' }, { label: 'Runtime', icon: 'terminal' }, { label: 'Services', icon: 'layers' }, { label: 'Product', icon: 'spark' }] },
        { type: 'card', id: 'spark', at: [0, 0, 84], w: 18, d: 12 },
      ],
      animations: [{ type: 'assemble', target: '.layer', stagger: 0.12, drop: 40 }, { type: 'float', target: 'spark', amp: 4, period: 2.8 }],
    },
  },
  computer: {
    label: 'Desk computer · interactive',
    mode: 'js',
    code: `// Click the machine to switch it on, then type.
const s = Iso.scene(host, { figure: { index: 'Fig 2', title: 'Desk computer', hint: 'Type on it · click it to switch', status: 'off' }, padding: 28 });
const pc = s.deskComputer({ id: 'pc', onStatus: (t) => s.status(t) });
pc.body.set({ interactive: true, label: 'Desk computer' });
pc.body.on('click', () => pc.power());
const kd = (e) => { if (e.target.closest && e.target.closest('textarea,input,select')) return; pc.press(e.key === ' ' ? 'space' : e.key.toLowerCase(), true); pc.type(e.key); };
const ku = (e) => pc.press(e.key === ' ' ? 'space' : e.key.toLowerCase(), false);
addEventListener('keydown', kd); addEventListener('keyup', ku);
s.on('destroy', () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); });
return s;`,
  },
};
