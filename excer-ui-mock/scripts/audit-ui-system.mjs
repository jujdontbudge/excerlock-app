import fs from 'node:fs';
import path from 'node:path';

const roots = ['src/app', 'src/features'];
const ignoredSegments = new Set(['__tests__']);
const checks = [
  { label: 'raw color', pattern: /(?:#[0-9a-fA-F]{6}|rgba?\()/ },
  { label: 'raw font size', pattern: /fontSize:\s*\d/ },
  { label: 'raw corner radius', pattern: /borderRadius:\s*[1-9]\d*/ },
  { label: 'raw animation duration', pattern: /duration:\s*\d/ },
  { label: 'raw spacing', pattern: /(?:padding|margin|gap)(?:Top|Bottom|Left|Right|Horizontal|Vertical)?:\s*[1-9]\d*/ },
  { label: 'text chevron', pattern: />\s*[‹›]\s*</ },
];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredSegments.has(entry.name)) return [];
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(target);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [target] : [];
  });
}

const violations = [];
for (const root of roots) {
  for (const file of walk(root)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const check of checks) {
        if (check.pattern.test(line)) violations.push(`${file}:${index + 1} ${check.label}: ${line.trim()}`);
      }
    });
  }
}

if (violations.length > 0) {
  console.error('UI system audit failed. Move these values into shared tokens or components:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('UI system audit passed: feature and route code uses shared colors, type, radii, motion, and chevrons.');
