import basics from './basics.js';
import devices from './devices.js';
import architecture from './architecture.js';
export { ICONS, MARK, icon } from './icons.js';

export function installPrefabs(define, Iso) {
  basics(define, Iso);
  devices(define, Iso);
  architecture(define, Iso);
}
