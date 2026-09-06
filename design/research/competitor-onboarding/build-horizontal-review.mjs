import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.dirname(new URL(import.meta.url).pathname);
const outputDir = path.join(root, 'horizontal-review');
fs.mkdirSync(outputDir, { recursive: true });

const apps = [
  ['fitness/01-dawg', '01-fitness-dawg', 'Fitness #1 — DAWG', '$4.00 revenue/download'],
  ['fitness/02-lock-in', '02-fitness-lock-in', 'Fitness #2 — Lock In', '$2.31 revenue/download'],
  ['fitness/03-otterlife', '03-fitness-otterlife', 'Fitness #3 — OtterLife', '$1.00 revenue/download'],
  ['screen-time/03-one-sec', '04-fitness-lock-one-sec', 'Fitness lock #1 — one sec', '$2.22 revenue/download'],
  ['fitness-lock/02-unrot', '05-fitness-lock-unrot', 'Fitness lock #2 — Unrot', '$1.86 revenue/download'],
  ['fitness-lock/03-blank-spaces', '06-fitness-lock-blank-spaces', 'Fitness lock #3 — Blank Spaces', '$1.82 revenue/download'],
  ['screen-time/01-opal', '07-reference-opal', 'Broader blocker reference — Opal', '$3.25 revenue/download'],
  ['screen-time/02-appblock', '08-reference-appblock', 'Broader blocker reference — AppBlock', '$3.00 revenue/download'],
];

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

function pngSize(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('Expected PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

for (const [relativeDir, outputName, title, metric] of apps) {
  const sourceDir = path.join(root, relativeDir);
  const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith('.png')).sort();
  const screenWidth = 432;
  const gap = 28;
  const left = 48;
  const imageTop = 190;
  const firstBuffer = fs.readFileSync(path.join(sourceDir, files[0]));
  const firstSize = pngSize(firstBuffer);
  const screenHeight = Math.round(screenWidth * firstSize.height / firstSize.width);
  const width = left * 2 + files.length * screenWidth + (files.length - 1) * gap;
  const height = imageTop + screenHeight + 76;

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" fill="#171717"/>`,
    `<text x="48" y="54" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="34" font-weight="700">${escapeXml(title)}</text>`,
    `<text x="48" y="92" fill="#AFAFAF" font-family="Arial, sans-serif" font-size="22">${escapeXml(metric)} · ${files.length} screens · left to right</text>`,
  ];

  files.forEach((file, index) => {
    const buffer = index === 0 ? firstBuffer : fs.readFileSync(path.join(sourceDir, file));
    const size = pngSize(buffer);
    const renderedHeight = Math.round(screenWidth * size.height / size.width);
    const x = left + index * (screenWidth + gap);
    const sequence = String(index + 1).padStart(3, '0');
    const screenId = path.basename(file, '.png').split('-').at(-1);
    const converted = spawnSync('magick', [path.join(sourceDir, file), '-resize', `${screenWidth}x`, '-quality', '84', 'jpeg:-'], {
      maxBuffer: 32 * 1024 * 1024,
    });
    if (converted.status !== 0) throw new Error(converted.stderr.toString());
    const data = converted.stdout.toString('base64');
    parts.push(
      `<g id="screen-${sequence}" transform="translate(${x} 0)">`,
      `<g id="include-${sequence}">`,
      `<rect x="0" y="116" width="${screenWidth}" height="56" rx="28" fill="#2F6FED"/>`,
      `<text x="${screenWidth / 2}" y="152" text-anchor="middle" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="22" font-weight="700">☐ INCLUDE ${sequence}</text>`,
      `</g>`,
      `<image x="0" y="${imageTop}" width="${screenWidth}" height="${renderedHeight}" href="data:image/jpeg;base64,${data}"/>`,
      `<text x="${screenWidth / 2}" y="${imageTop + renderedHeight + 34}" text-anchor="middle" fill="#8F8F8F" font-family="Arial, sans-serif" font-size="17">Screen ${sequence} · ID ${screenId}</text>`,
      `</g>`,
    );
  });

  parts.push('</svg>');
  fs.writeFileSync(path.join(outputDir, `${outputName}.svg`), parts.join('\n'));
}
