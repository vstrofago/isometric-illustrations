// SPDX-License-Identifier: Apache-2.0
import { pathData, cssClass } from '../math.js';

/* Line icons on a 24-unit grid (stroke only, round caps). Drawn for this engine.
   Use them on faces: face.svg(Iso.icon('database'), { transform: 'scale(0.5)' }) or the `block` prefab. */
export const ICONS = {
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  server: 'M4 4h16v6H4zM4 14h16v6H4zM7.5 7h.01M7.5 17h.01M11 7h5M11 17h5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-6 8-6s8 2 8 6',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c2.1.6 3.5 2.4 3.5 5.2',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2',
  cloud: 'M7 18h10.5a4 4 0 0 0 .4-7.98A6 6 0 0 0 6.3 9 4.5 4.5 0 0 0 7 18Z',
  bolt: 'M13 3 5 14h6l-1 7 8-11h-6l1-7Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16',
  terminal: 'M3.5 5h17v14h-17zM7 9.5l3 2.5-3 2.5M12 15h5',
  cpu: 'M7 7h10v10H7zM10 10h4v4h-4zM9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5',
  mail: 'M3 6h18v12H3zM3.5 6.5l8.5 6 8.5-6',
  chart: 'M4 20V11M10 20V5M16 20v-6M2.5 20h19',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  key: 'M8 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 12h9M18 12v3M21 12v2',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6',
  search: 'M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM15.5 15.5 21 21',
  cart: 'M2.5 4h2.5l2.5 11h11l2-8H6.3M9 19.5h.01M17.5 19.5h.01',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3ZM8.5 12l2.5 2.5 4.5-5',
  layers: 'M12 3 2.5 8 12 13l9.5-5L12 3ZM2.5 12.5 12 17.5l9.5-5M2.5 16.5 12 21.5l9.5-5',
  queue: 'M4 6h16M4 12h16M4 18h10',
  plug: 'M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8ZM12 17v4',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z',
  phone: 'M8 2.5h8a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1ZM11 18.5h2',
  wifi: 'M2.5 9a14 14 0 0 1 19 0M5.8 12.5a9.5 9.5 0 0 1 12.4 0M9 16a5 5 0 0 1 6 0M12 19.5h.01',
  check: 'M5 12.5l4.5 4.5L19 7',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 20.5a2 2 0 0 0 4 0',
  play: 'M8 5v14l11-7L8 5Z',
  box: 'M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9L12 3ZM3.5 7.5 12 12l8.5-4.5M12 12v9',
  card: 'M3 6h18v12H3zM3 10h18M6.5 14.5h4',
  pin: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  eye: 'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  flow: 'M5 6.5a2.5 2.5 0 1 0 0-.01M19 17.5a2.5 2.5 0 1 0 0-.01M7.5 6.5H13a3 3 0 0 1 3 3v5a3 3 0 0 0 3 3',
};

/* The 9×9 pixel star (filled). */
export const MARK = 'M3 3h3v3H3zM4 2h1v1H4zM6 4h1v1H6zM4 6h1v1H4zM2 4h1v1H2zM4 1h1v1H4zM7 4h1v1H7zM4 7h1v1H4zM1 4h1v1H1zM4 0h1v1H4zM8 4h1v1H8zM4 8h1v1H4zM0 4h1v1H0zM2 2h1v1H2zM6 2h1v1H6zM6 6h1v1H6zM2 6h1v1H2z';

/* a built-in icon by name, or raw path data (anything else is dropped) */
export function iconPath(name) { return ICONS[name] || pathData(name); }
export function icon(name, cls = 'ln-strong') {
  return '<path class="' + cssClass(cls) + '" d="' + iconPath(name) + '"/>';
}
