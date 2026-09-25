import { IconName, paths } from './paths';
import { solidGlyphs } from './solidGlyphs';
export function iconXml(name: IconName, _utility = false, _monochrome = false) {
  const body =
    solidGlyphs[name] ??
    `<path d="${paths[name]}" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;
}
