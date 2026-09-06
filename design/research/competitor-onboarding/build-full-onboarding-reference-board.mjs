import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const sourceDir = path.join(root, 'horizontal-review');
const outputDir = path.join(root, 'selected-onboarding-flow');
fs.mkdirSync(outputDir, { recursive: true });

const files = [
  '01-fitness-dawg.svg',
  '02-fitness-lock-in.svg',
  '03-fitness-otterlife.svg',
  '04-fitness-lock-one-sec.svg',
  '05-fitness-lock-unrot.svg',
  '06-fitness-lock-blank-spaces.svg',
  '07-reference-opal.svg',
  '08-reference-appblock.svg',
];

const headerHeight = 240;
const rowHeight = 1200;
const rowGap = 96;
const width = 23528;
const height = headerHeight + files.length * rowHeight + (files.length - 1) * rowGap + 96;

const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  `<rect width="${width}" height="${height}" fill="#101315"/>`,
  `<text x="48" y="72" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="46" font-weight="700">Complete source onboarding flows</text>`,
  `<text x="48" y="124" fill="#A8B0B5" font-family="Arial, sans-serif" font-size="24">Every recorded screen, preserved chronologically from left to right. Reference only; the curated ExcerLock synthesis remains above.</text>`,
  `<rect x="48" y="164" width="192" height="8" rx="4" fill="#B8FF36"/>`,
  `<text x="264" y="178" fill="#D5DADD" font-family="Arial, sans-serif" font-size="20">8 complete app flows</text>`,
];

files.forEach((file, index) => {
  const content = fs.readFileSync(path.join(sourceDir, file), 'utf8');
  const inner = content
    .replace(/^<svg[^>]*>\s*/, '')
    .replace(/\s*<\/svg>\s*$/, '');
  const y = headerHeight + index * (rowHeight + rowGap);
  parts.push(`<g id="full-flow-${String(index + 1).padStart(2, '0')}" transform="translate(0 ${y})">${inner}</g>`);
});

parts.push('</svg>');
fs.writeFileSync(
  path.join(outputDir, 'excerlock-complete-source-onboarding-flows.svg'),
  parts.join('\n'),
);
