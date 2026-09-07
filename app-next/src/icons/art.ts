import { tokens as t } from '../design-system/tokens';
import { IconName, paths } from './paths';
const c = t.icon;
const drawings: Partial<Record<IconName, string>> = {
  walking: `<path fill="${c.mint}" d="M6 1C2 1 1 9 4 12l4-1C10 6 10 1 6 1M4 15l5-1 1 5c-2 4-7 4-6-4"/><path fill="${c.lilac}" d="M17 4c4 0 5 8 2 11l-4-1c-2-5-2-10 2-10M15 17l5 1c1 6-4 7-6 4z"/>`,
  gym: `<path stroke="${t.brand.decorative}" stroke-width="4" d="M6 12h12"/><rect x="3" y="5" width="6" height="14" rx="2" fill="${c.lilac}"/><rect x="15" y="5" width="6" height="14" rx="2" fill="${c.mint}"/><path stroke="${c.lilac}" stroke-width="3" stroke-linecap="round" d="M2 9v6"/><path stroke="${c.mint}" stroke-width="3" stroke-linecap="round" d="M22 9v6"/>`,
  running: `<path d="M3 9l4-5 6 6 6 2c3 1 3 4 3 6H2v-7z" fill="${c.mint}"/><path d="M2 18h20v3H3c-1 0-1-2-1-3" fill="${t.brand.decorative}"/><path d="M9 8l-2 3M12 10l-2 3" stroke="${c.sky}" stroke-width="2" stroke-linecap="round"/>`,
  biking: `<circle cx="5" cy="17" r="4" fill="none" stroke="${c.lilac}" stroke-width="2.5"/><circle cx="19" cy="17" r="4" fill="none" stroke="${c.sky}" stroke-width="2.5"/><path d="M5 17l5-9 5 9H5M10 8h6M17 4l2 13M16 4h4M10 4l5 13M8 4h4" fill="none" stroke="${c.mint}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
  lock: `<path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke="${c.yellow}" stroke-width="3"/><rect x="4" y="9" width="16" height="13" rx="4" fill="${c.mint}"/><path d="M12 14v3" stroke="${t.state.success}" stroke-width="2" stroke-linecap="round"/>`,
  'lock-open': `<path d="M7 11V7a5 5 0 019-3" fill="none" stroke="${c.yellow}" stroke-width="3"/><rect x="4" y="9" width="16" height="13" rx="4" fill="${c.mint}"/><path d="M8 15l3 3 5-6" fill="none" stroke="${t.state.success}" stroke-width="2" stroke-linecap="round"/>`,
};
const colors: Partial<Record<IconName, string>> = {
  shield: c.sky,
  bell: c.yellow,
  ruler: c.lilac,
  flame: c.coral,
  'map-pin': c.coral,
  heart: c.coral,
  chart: c.mint,
  list: c.sky,
  house: c.mint,
  gear: c.lilac,
  star: c.yellow,
};
export function iconXml(name: IconName, utility = false, monochrome = false) {
  const body =
    !utility && drawings[name]
      ? drawings[name]
      : `<path d="${paths[name]}" fill="none" stroke="${utility ? 'currentColor' : (colors[name] ?? 'currentColor')}" stroke-width="${t.stroke.glyph}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const themed = monochrome ? body.replace(/(fill|stroke)="#[0-9a-f]+"/gi, '$1="currentColor"') : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${themed}</svg>`;
}
