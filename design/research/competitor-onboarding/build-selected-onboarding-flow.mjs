import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.dirname(new URL(import.meta.url).pathname);
const outputDir = path.join(root, 'selected-onboarding-flow');
fs.mkdirSync(outputDir, { recursive: true });

const sources = {
  dawg: { label: 'DAWG', dir: 'fitness/01-dawg' },
  lockIn: { label: 'Lock In', dir: 'fitness/02-lock-in' },
  otterLife: { label: 'OtterLife', dir: 'fitness/03-otterlife' },
  unrot: { label: 'Unrot', dir: 'fitness-lock/02-unrot' },
  blankSpaces: { label: 'Blank Spaces', dir: 'fitness-lock/03-blank-spaces' },
  opal: { label: 'Opal', dir: 'screen-time/01-opal' },
  appBlock: { label: 'AppBlock', dir: 'screen-time/02-appblock' },
};

const screen = (source, sequence) => ({ source, sequence });

// Every source screen touched by Johan's red annotations appears exactly once.
// Chronological screens always advance horizontally. A vertical stack is used
// only when the screens communicate essentially the same information and are
// therefore genuine alternatives for one ExcerLock step.
const stages = [
  {
    title: 'Core promise',
    note: 'Alternative ways to promise app blocking.',
    screens: [screen('appBlock', 3), screen('unrot', 14)],
  },
  {
    title: 'Tracking benefits',
    note: 'Explain what progress tracking unlocks.',
    screens: [screen('appBlock', 4)],
  },
  {
    title: 'Welcome',
    note: 'Open the guided setup.',
    screens: [screen('appBlock', 9)],
  },
  {
    title: 'Choose improvement',
    note: 'Alternative versions of the same intent question.',
    screens: [screen('blankSpaces', 3), screen('opal', 2)],
  },
  {
    title: 'Name the distraction',
    note: 'Identify what takes the user’s time.',
    screens: [screen('blankSpaces', 4)],
  },
  {
    title: 'Emotional prompt I',
    note: 'Begin the motivation sequence.',
    screens: [screen('dawg', 13)],
  },
  {
    title: 'Emotional prompt II',
    note: 'Continue the motivation sequence.',
    screens: [screen('dawg', 14)],
  },
  {
    title: 'Emotional prompt III',
    note: 'Continue the motivation sequence.',
    screens: [screen('dawg', 15)],
  },
  {
    title: 'Emotional prompt IV',
    note: 'Complete the motivation sequence.',
    screens: [screen('dawg', 16)],
  },
  {
    title: 'Reason to change',
    note: 'Turn reflection into motivation.',
    screens: [screen('dawg', 17)],
  },
  {
    title: 'Set the goal',
    note: 'Choose the desired outcome.',
    screens: [screen('otterLife', 15)],
  },
  {
    title: 'Age',
    note: 'Add age context for personalization.',
    screens: [screen('opal', 3)],
  },
  {
    title: 'Occupation',
    note: 'Add work context for personalization.',
    screens: [screen('opal', 4)],
  },
  {
    title: 'Name',
    note: 'Personalize the experience.',
    screens: [screen('appBlock', 8)],
  },
  {
    title: 'Personal setup',
    note: 'Configure the initial experience.',
    screens: [screen('appBlock', 10)],
  },
  {
    title: 'Acquisition source',
    note: 'Ask how the user found the app.',
    screens: [screen('unrot', 5)],
  },
  {
    title: 'Usage estimate',
    note: 'Alternative versions of the same baseline question.',
    screens: [screen('appBlock', 11), screen('opal', 1)],
  },
  {
    title: 'Reality-check intro',
    note: 'Prepare the user for a usage calculation.',
    screens: [screen('opal', 7)],
  },
  {
    title: 'Quick calculation',
    note: 'Begin the screen-time cost sequence.',
    screens: [screen('unrot', 24)],
  },
  {
    title: 'A year of life',
    note: 'Translate use into annual cost.',
    screens: [screen('unrot', 25)],
  },
  {
    title: 'Free time left',
    note: 'Show the remaining time tradeoff.',
    screens: [screen('unrot', 26)],
  },
  {
    title: 'Scrolling cost',
    note: 'Connect scrolling to lost opportunity.',
    screens: [screen('unrot', 27)],
  },
  {
    title: 'Lifetime cost',
    note: 'Alternative ways to reveal the same long-term cost.',
    screens: [screen('dawg', 12), screen('blankSpaces', 7), screen('opal', 8)],
  },
  {
    title: 'Reaction to cost',
    note: 'Let the user process the result.',
    screens: [screen('unrot', 28)],
  },
  {
    title: 'Outcome proof',
    note: 'Show the healthier trajectory.',
    screens: [screen('unrot', 31)],
  },
  {
    title: 'Trial explainer',
    note: 'Explain how the trial works.',
    screens: [screen('otterLife', 37)],
  },
  {
    title: 'Offer',
    note: 'Present the paid plan.',
    screens: [screen('otterLife', 38)],
  },
  {
    title: 'Testimonial I',
    note: 'First social-proof step.',
    screens: [screen('otterLife', 39)],
  },
  {
    title: 'Testimonial II',
    note: 'Second social-proof step.',
    screens: [screen('otterLife', 40)],
  },
  {
    title: 'Review prompt',
    note: 'Ask for an App Store rating.',
    screens: [screen('opal', 9)],
  },
  {
    title: 'Review confirmation',
    note: 'Close the rating sequence.',
    screens: [screen('opal', 10)],
  },
];

const escapeXml = (value) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

function pngSize(buffer) {
  if (buffer.toString('ascii', 1, 4) !== 'PNG') throw new Error('Expected PNG');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function resolveScreen({ source, sequence }) {
  const sourceInfo = sources[source];
  const sourceDir = path.join(root, sourceInfo.dir);
  const prefix = `${String(sequence).padStart(3, '0')}-`;
  const file = fs.readdirSync(sourceDir).find((name) => name.startsWith(prefix) && name.endsWith('.png'));
  if (!file) throw new Error(`Missing ${sourceInfo.label} screen ${sequence}`);
  return { ...sourceInfo, sequence, file, absolutePath: path.join(sourceDir, file) };
}

const columnWidth = 392;
const columnGap = 56;
const left = 72;
const top = 270;
const imageWidth = 320;
const cardPadding = 20;
const cardWidth = imageWidth + cardPadding * 2;
const cardGap = 30;
const stageHeaderHeight = 170;
const maxScreens = Math.max(...stages.map((stage) => stage.screens.length));
const selectedCount = stages.reduce((total, stage) => total + stage.screens.length, 0);
const sample = resolveScreen(stages[0].screens[0]);
const sampleSize = pngSize(fs.readFileSync(sample.absolutePath));
const imageHeight = Math.round(imageWidth * sampleSize.height / sampleSize.width);
const cardHeight = imageHeight + 78;
const width = left * 2 + stages.length * columnWidth + (stages.length - 1) * columnGap;
const height = top + stageHeaderHeight + maxScreens * (cardHeight + cardGap) + 84;

const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  `<rect width="${width}" height="${height}" fill="#141719"/>`,
  `<text x="${left}" y="70" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="46" font-weight="700">ExcerLock onboarding — red-marked reference synthesis</text>`,
  `<text x="${left}" y="120" fill="#A8B0B5" font-family="Arial, sans-serif" font-size="24">Read left to right. Only informationally equivalent alternatives are stacked; chronological screens remain separate steps.</text>`,
  `<rect x="${left}" y="162" width="160" height="8" rx="4" fill="#FF3B30"/>`,
  `<text x="${left + 180}" y="176" fill="#D5DADD" font-family="Arial, sans-serif" font-size="20">${selectedCount} red-selected screens · ${stages.length} proposed steps · source and sequence preserved</text>`,
];

stages.forEach((stage, stageIndex) => {
  const x = left + stageIndex * (columnWidth + columnGap);
  const stageNumber = String(stageIndex + 1).padStart(2, '0');
  parts.push(
    `<g id="stage-${stageNumber}" transform="translate(${x} ${top})">`,
    `<rect x="0" y="0" width="${cardWidth}" height="128" rx="24" fill="#20262A" stroke="#39434A" stroke-width="2"/>`,
    `<circle cx="34" cy="34" r="22" fill="#B8FF36"/>`,
    `<text x="34" y="42" text-anchor="middle" fill="#101411" font-family="Arial, sans-serif" font-size="18" font-weight="700">${stageNumber}</text>`,
    `<text x="68" y="42" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="24" font-weight="700">${escapeXml(stage.title)}</text>`,
    `<text x="24" y="84" fill="#A8B0B5" font-family="Arial, sans-serif" font-size="17">${escapeXml(stage.note)}</text>`,
    `<text x="24" y="110" fill="#6F7A81" font-family="Arial, sans-serif" font-size="15">${stage.screens.length} reference${stage.screens.length === 1 ? '' : 's'} stacked below</text>`,
  );

  stage.screens.map(resolveScreen).forEach((item, screenIndex) => {
    const buffer = fs.readFileSync(item.absolutePath);
    const size = pngSize(buffer);
    const renderedHeight = Math.round(imageWidth * size.height / size.width);
    const converted = spawnSync('magick', [item.absolutePath, '-resize', `${imageWidth}x`, '-quality', '84', 'jpeg:-'], {
      maxBuffer: 32 * 1024 * 1024,
    });
    if (converted.status !== 0) throw new Error(converted.stderr.toString());
    const data = converted.stdout.toString('base64');
    const y = stageHeaderHeight + screenIndex * (cardHeight + cardGap);
    const screenId = path.basename(item.file, '.png').split('-').at(-1);
    parts.push(
      `<g id="${item.label.toLowerCase().replaceAll(' ', '-')}-${String(item.sequence).padStart(3, '0')}" transform="translate(0 ${y})">`,
      `<rect x="0" y="0" width="${cardWidth}" height="${renderedHeight + 78}" rx="24" fill="#20262A" stroke="#303940" stroke-width="2"/>`,
      `<rect x="0" y="0" width="7" height="${renderedHeight + 78}" rx="4" fill="#FF3B30"/>`,
      `<text x="${cardPadding}" y="30" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(item.label)} · screen ${String(item.sequence).padStart(3, '0')}</text>`,
      `<text x="${cardWidth - cardPadding}" y="30" text-anchor="end" fill="#7E8A91" font-family="Arial, sans-serif" font-size="14">ID ${screenId}</text>`,
      `<image x="${cardPadding}" y="48" width="${imageWidth}" height="${renderedHeight}" href="data:image/jpeg;base64,${data}"/>`,
      `</g>`,
    );
  });
  parts.push('</g>');

  if (stageIndex < stages.length - 1) {
    const arrowX = x + cardWidth + 10;
    parts.push(
      `<path d="M ${arrowX} ${top + 64} H ${arrowX + 28}" stroke="#66737B" stroke-width="4" stroke-linecap="round"/>`,
      `<path d="M ${arrowX + 20} ${top + 54} L ${arrowX + 30} ${top + 64} L ${arrowX + 20} ${top + 74}" fill="none" stroke="#66737B" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
});

parts.push('</svg>');
fs.writeFileSync(path.join(outputDir, 'excerlock-red-selected-onboarding-flow.svg'), parts.join('\n'));

const manifest = stages.flatMap((stage, stageIndex) => stage.screens.map((entry, stackIndex) => ({
  step: stageIndex + 1,
  stepTitle: stage.title,
  stackIndex: stackIndex + 1,
  source: sources[entry.source].label,
  screen: entry.sequence,
})));
fs.writeFileSync(path.join(outputDir, 'selection-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
