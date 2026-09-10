import { IconName } from './paths';
import { activityPaths } from './activityLibrary';
import { flameGlyph } from './flameLibrary';
const activity = (name: keyof typeof activityPaths) => {
  const icon = activityPaths[name];
  return `<svg x="2" y="2" width="20" height="20" viewBox="${icon.viewBox}"><path d="${icon.path}" fill="currentColor"/></svg>`;
};
const fill = (d: string) => `<path fill="currentColor" fill-rule="evenodd" d="${d}"/>`;
const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="currentColor"/>`;
/** Shared 24-unit rounded silhouettes; never copy these into screens. */
export const solidGlyphs: Partial<Record<IconName, string>> = {
  walking: activity('person-walking'),
  ruler: fill(
    'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 0v6h2V5Zm5 0v4h2V5Zm5 0v6h2V5Z',
  ),
  gear: fill('M9 2h6l1 3 3 1 3 6-3 6-3 1-1 3H9l-1-3-3-1-3-6 3-6 3-1Zm3 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z'),
  trash:
    rect(3, 4, 18, 3, 1.5) +
    rect(8, 1, 8, 3, 1.5) +
    fill('M5 9h14l-1 12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Zm3 2v8h2v-8Zm6 0v8h2v-8Z'),
  gym: `<g transform="rotate(-8 12 12)">${rect(1, 10.5, 22, 3, 1.5)}${rect(5, 4.5, 3.5, 15, 1.75)}${rect(15.5, 4.5, 3.5, 15, 1.75)}${rect(2, 7.5, 2.5, 9, 1.25)}${rect(19.5, 7.5, 2.5, 9, 1.25)}</g>`,
  heart: fill(
    'M12 21c-.6 0-1.1-.3-1.6-.7L3.5 14C-3 7.8 5.5-.8 12 5.7 18.5-.8 27 7.8 20.5 14l-6.9 6.3c-.5.4-1 .7-1.6.7Z',
  ),
  star: fill(
    'M10.7 3a1.5 1.5 0 0 1 2.6 0l2.4 4.8 5.3.8c1.3.2 1.8 1.7.9 2.6l-3.8 3.7.9 5.3c.2 1.3-1.1 2.2-2.2 1.6L12 19.3l-4.8 2.5c-1.1.6-2.4-.3-2.2-1.6l.9-5.3-3.8-3.7c-.9-.9-.4-2.4.9-2.6l5.3-.8Z',
  ),
  flame: flameGlyph,
  list: [5, 11, 17].map((y) => rect(2, y, 4, 3.5, 1.75) + rect(8, y, 14, 3.5, 1.75)).join(''),
  phone: fill('M7 1h10a3 3 0 0 1 3 3v16a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Zm0 3v14h10V4Zm3 16v1h4v-1Z'),
  lock: fill(
    'M6 9V7a6 6 0 0 1 12 0v2h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Zm3 0h6V7a3 3 0 0 0-6 0Zm3 4a1.5 1.5 0 0 0-1.5 1.5v3a1.5 1.5 0 0 0 3 0v-3A1.5 1.5 0 0 0 12 13Z',
  ),
  'lock-open': fill(
    'M6 9V7a6 6 0 0 1 11-3l-2.5 1.6A3 3 0 0 0 9 7v2h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Zm4.5 4v5h3v-5Z',
  ),
  clock: fill('M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm-1.5 5v7l5 3 1.5-2.5-3.5-2V6Z'),
  person: fill('M7 6a5 5 0 1 0 10 0A5 5 0 0 0 7 6ZM3 20c0-10 18-10 18 0 0 1.5-1 2-2 2H5c-1 0-2-.5-2-2Z'),
  'map-pin': fill(
    'M12 1a9 9 0 0 1 9 9c0 5-6 11-8 13h-2C9 21 3 15 3 10a9 9 0 0 1 9-9Zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  ),
  bell: fill('M12 2c5 0 7 3 7 7v5l2 3c.7 1 0 2-1 2H4c-1 0-1.7-1-1-2l2-3V9c0-4 2-7 7-7ZM9 21h6a3 3 0 0 1-6 0Z'),
  chart: rect(3, 13, 4, 9, 2) + rect(10, 8, 4, 14, 2) + rect(17, 2, 4, 20, 2),
  house: fill(
    'M2 10 10.5 2a2 2 0 0 1 3 0L22 10c1 1 0 3-1.5 3H20v7a2 2 0 0 1-2 2h-4v-7h-4v7H6a2 2 0 0 1-2-2v-7h-.5C2 13 1 11 2 10Z',
  ),
  shield: fill('M12 1 22 5v6c0 6-7 11-10 12C9 22 2 17 2 11V5Zm-5 10-2 2 5 5 9-9-2-2-7 7Z'),
  mail: fill('M4 3h16a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Zm0 3v3l8 6 8-6V6l-8 6Z'),
  info: fill('M12 1a11 11 0 1 0 0 22 11 11 0 0 0 0-22Zm-1.5 5v3h3V6Zm0 5v7h3v-7Z'),
};
