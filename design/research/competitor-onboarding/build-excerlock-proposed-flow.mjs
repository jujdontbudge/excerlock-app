import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.dirname(new URL(import.meta.url).pathname);
const outputDir = path.join(root, 'selected-onboarding-flow');
fs.mkdirSync(outputDir, { recursive: true });

const sources = {
  dawg: { label: 'DAWG', dir: 'fitness/01-dawg' },
  appBlock: { label: 'AppBlock', dir: 'screen-time/02-appblock' },
  unrot: { label: 'Unrot', dir: 'fitness-lock/02-unrot' },
  otterLife: { label: 'OtterLife', dir: 'fitness/03-otterlife' },
  opal: { label: 'Opal', dir: 'screen-time/01-opal' },
};

const ref = (source, sequence, title, change = '') => ({ kind: 'reference', source, sequence, title, change });
const newScreen = (title, body, options = [], recommended = -1, footer = 'Continue') => ({
  kind: 'new', title, body, options, recommended, footer,
});

const preBranch = [
  ref('appBlock', 1, 'Loading', 'This blank AppBlock loading screen is the first screen. No separate intro before it.'),
  { ...ref('appBlock', 2, 'ExcerLock — Loading', 'GPT Image splash preview. Orange running-lock logo on white with a subtle orange tint at the top.'), mockup: '../../mockups/onboarding-orange/001-splash-preview.png' },
  { ...ref('appBlock', 3, 'Block apps. Exercise more.', 'Block from 12 PM to 8 PM until you arrive at the gym. Gym icon and blocking timeline.'), mockup: '../../mockups/onboarding-orange/002-block-apps-preview.png' },
  ref('appBlock', 4, 'See your progress', 'Copy AppBlock screen 004. Explain exercise and unlocked time.'),
  ref('appBlock', 5, 'Stay in control', 'Copy AppBlock screen 005. Use very short ExcerLock copy.'),
  ref('appBlock', 8, 'What should we call you?', 'Copy the name screen.'),
  ref('unrot', 5, 'How did you hear about us?', 'Copy this acquisition question.'),
  ref('opal', 3, 'How old are you?', 'Copy the age screen.'),
  ref('opal', 4, 'What do you do?', 'Copy the occupation screen.'),
  newScreen('What do you want to improve first?', 'Pick one. You can change it later.', ['More exercise', 'Less screen time', 'Overall wellness'], 0),
  ref('dawg', 17, "What's the main reason you want to make a change?", 'Copy DAWG screen 017 exactly after the improvement screen.'),
  ref('unrot', 23, 'How many hours do you currently spend scrolling each day?', 'Use Unrot screen 023 exactly.'),
  ref('unrot', 24, 'Here’s some quick math', 'Use Unrot screen 024 exactly.'),
  ref('unrot', 25, 'This is a year in your life', 'Use Unrot screen 025 exactly.'),
  ref('unrot', 26, 'This is the free time left', 'Use Unrot screen 026 exactly.'),
  ref('unrot', 27, 'This is how much time you spend scrolling', 'Use Unrot screen 027 exactly.'),
  ref('unrot', 28, 'Do you ever have any of these feelings after scrolling?', 'Use Unrot screen 028 exactly.'),
  ref('unrot', 29, 'Don’t worry, that’s going to change!', 'Use Unrot screen 029 exactly.'),
  ref('unrot', 30, 'You won’t feel guilt or shame after scrolling', 'Use Unrot screen 030 exactly.'),
  ref('unrot', 31, 'Live more and scroll less', 'Use Unrot screen 031 exactly.'),
  newScreen('Good news.', 'We can turn the urge to scroll into a reason to move.', ['Use my screen habit to exercise more'], 0),
  newScreen('Your brain learns from rewards.', 'Apps give quick dopamine. That makes you come back.', ['Tiny reward → repeat the habit'], -1),
  newScreen('We move the reward.', 'Exercise unlocks the apps you want. Moving becomes the new habit.', ['Exercise → unlock → reward'], -1),
  newScreen('Your new path', 'Screen time goes down. Exercise goes up.', ['📉 Less scrolling', '📈 More exercise'], 1),
  newScreen('What exercise should unlock your apps?', 'Pick the one you will really do.', ['Walking', 'Gym', 'Running', 'Biking'], 0),
];

// Generated previews replace only the explicitly requested cards, without reordering.
const orangeMockups = [
  [4, 'step-4-progress.png'],
  [5, 'step-5-exercise.png'],
  [6, 'step-6-name.png'],
  [7, 'step-7-referral.png'],
  [8, 'step-8-age.png'],
  [9, 'step-9-occupation.png'],
  [10, 'step-10-improve.png'],
  [11, 'step-11-motivation.png'],
  [12, 'step-12-hours.png'],
  [13, 'step-13-math.png'],
  [14, 'step-14-year.png'],
  [15, 'step-15-free-time.png'],
  [16, 'step-16-scrolling-cost.png'],
];
for (const [step, filename] of orangeMockups) {
  Object.assign(preBranch[step - 1], {
    kind: 'reference',
    mockup: '../../mockups/onboarding-orange/' + filename,
    change: 'ExcerLock GPT Image concept preview. White, subtle orange top tint, orange controls.',
  });
}

// Replace the old reassurance section and redundant path with the new story.
preBranch.splice(16, 9,
  ...[
    ['trend', 'Less scrolling. More moving.', 'Illustrative goal: screen time down, exercise up.'],
    ['loop', 'Stuck in the scroll loop?', 'State 1. Continue → ExcerLock enters and interrupts the loop.'],
    ['break', 'Let’s break the loop.', 'State 2. Logo enters the gap; old reward nodes fade. Continue → new movement path.'],
    ['reward', 'Make moving the habit.', 'State 3. Want to scroll → move → unlock → enjoy reward.'],
    ['picker', 'What exercise should unlock your apps?', 'Four choices in a 2×2 icon grid. Continue into the selected branch.'],
  ].map(([id, title, change]) => ({
    kind: 'reference', title, change,
    mockup: '../../mockups/onboarding-orange/loop-' + id + '.png',
  }))
);

const branches = [
  {
    label: 'WALKING', color: '#8E9AA2',
    screens: [
      newScreen('Where will you walk?', 'Pick the easiest option.', ['Outside (Recommended)', 'Treadmill', 'Either'], 0),
      newScreen('What should count?', 'Choose how walking unlocks apps.', ['Reach a step goal (Recommended)', 'Earn screen time per step'], 0),
    ],
  },
  {
    label: 'GYM', color: '#8E9AA2',
    screens: [
      newScreen('What should count at the gym?', 'Pick one simple rule.', ['Spend time at the gym (Recommended)', 'Arrive at the gym'], 0),
      newScreen('How long at the gym?', 'Choose a goal you can repeat.', ['30 minutes (Recommended)', '45 minutes', '60 minutes'], 0),
    ],
  },
  {
    label: 'RUNNING', color: '#8E9AA2',
    screens: [
      newScreen('What should count for a run?', 'Pick one simple rule.', ['Run for a set time (Recommended)', 'Run a set distance'], 0),
      newScreen('How much running?', 'Start with a goal you can finish.', ['20 minutes (Recommended)', '2 miles', '5K'], 0),
    ],
  },
  {
    label: 'BIKING', color: '#8E9AA2',
    screens: [
      newScreen('What should count for biking?', 'Pick one simple rule.', ['Bike for a set time (Recommended)', 'Bike a set distance'], 0),
      newScreen('How much biking?', 'Start with a goal you can finish.', ['30 minutes (Recommended)', '5 miles', '10 miles'], 0),
    ],
  },
];

const postBranch = [
  newScreen('When should this rule be on?', 'Pick the days and times.', ['Mon–Fri (Recommended)', 'Every day', 'Choose days'], 0),
  newScreen('Choose the time', 'The rule only works during this window.', ['9:00 AM → 9:00 PM (Recommended)', 'All day', 'Choose start and end'], 0),
  newScreen('What should exercise unlock?', 'Pick how long the reward lasts.', ['A set amount during this window (Recommended)', 'The rest of the day'], 0),
  newScreen('How much screen time?', 'Keep the reward useful, not endless.', ['30 minutes (Recommended)', '1 hour', 'Choose an amount'], 0),
  newScreen('Building your plan…', 'We are checking every answer.', ['✓ Exercise', '✓ Unlock rule', '✓ Days and times', '✓ Screen-time reward'], -1, '3… 2… 1…'),
  newScreen('Your plan is ready', 'Walk 2,000 steps on weekdays. Unlock 30 minutes from 9 AM to 9 PM.', ['Walking · 2,000 steps', 'Mon–Fri · 9 AM–9 PM', 'Unlock · 30 minutes'], -1, 'Use this plan'),
  newScreen('How does this plan look?', 'Your feedback helps us improve.', ['★★★★★', 'Looks good'], 1, 'Continue'),
  ref('otterLife', 37, 'Start your free trial', 'Use OtterLife’s trial explainer flow exactly.'),
  ref('otterLife', 38, 'Choose your plan', 'Use OtterLife’s paywall structure exactly.'),
  ref('otterLife', 39, 'Member story', 'Keep OtterLife’s first proof screen.'),
  ref('otterLife', 40, 'One more member story', 'Keep OtterLife’s second proof screen.'),
];

const finalTitles = {"walk-place":"Where will you walk?","walk-rule":"How should walking unlock apps?","walk-target":"Set your walking goal","gym-rule":"What counts at the gym?","gym-target":"How long at the gym?","run-rule":"What counts as a run?","run-target":"Set your running goal","bike-rule":"What counts as a bike ride?","bike-target":"Set your biking goal","distance":"Choose your distance","schedule":"When should blocking be active?","reward-time":"How much screen time?","principles":"Built around small, repeatable habits","loading":"Setting up your plan…","summary":"Your plan is ready","review":"Help us make ExcerLock better","trial-offer":"Try ExcerLock free","trial-reminder":"We’ll remind you before it ends","notification":"Want a trial reminder?","timeline":"How your free trial works","paywall-top":"ExcerLock Premium","paywall-bottom":"Premium — scrolled view"};
const finalMockup = (id, change = '') => ({
  kind: 'reference', title: finalTitles[id], change,
  mockup: '../../mockups/onboarding-orange/final-' + id + '.png',
});
preBranch.splice(preBranch.length - 1, 0, finalMockup('principles', 'Habit-design principles; no university affiliation or endorsement implied.'));
preBranch.splice(preBranch.length - 1, 0, {
  kind: 'reference', title: 'Choose the apps that distract you most',
  change: 'Select apps opens app selection. Save selection, then continue to exercise choice. Handle authorization, cancel and empty selection in implementation.',
  mockup: '../../mockups/onboarding-orange/select-apps-v1.png',
});
branches[0].screens = [
  finalMockup('walk-place', 'Choose outside, treadmill, or either.'),
  finalMockup('walk-rule', 'Step goal / earn time per step / unlock while walking. While walking skips goal and reward amount.'),
  finalMockup('walk-target', 'Conditional goal entry. Step mode: typed steps. Rate mode: typed minutes per step block.'),
];
branches[1].screens = [
  finalMockup('gym-rule', 'Time at gym → minutes. Arrival mode skips duration. Gym location must be configured.'),
  finalMockup('gym-target', 'Time mode only: type minutes.'),
];
branches[2].screens = [
  finalMockup('run-rule', 'Choose time OR distance.'),
  finalMockup('run-target', 'Time mode: type minutes. Alternative distance state shown next, not a second question.'),
  finalMockup('distance', 'ALTERNATIVE STATE: distance mode. Type number and choose km or miles.'),
];
branches[3].screens = [
  finalMockup('bike-rule', 'Choose time OR distance.'),
  finalMockup('bike-target', 'Time mode: type minutes. Alternative distance state shown next, not a second question.'),
  finalMockup('distance', 'ALTERNATIVE STATE: distance mode. Same reusable input as running.'),
];
postBranch.splice(0, postBranch.length,
  finalMockup('schedule', 'Combined days and time intervals. All four activity branches merge here.'),
  finalMockup('reward-time', 'Typed reward minutes. Skip for while-walking and rate-based unlock modes.'),
  finalMockup('loading', 'Setup progress and checklist. Advance automatically when the plan is ready.'),
  finalMockup('summary', 'One personalized summary. Example shown; values must reflect selected branch and settings.'),
  finalMockup('review', 'Rating request; proof placeholders require real approved reviews. Not now continues.'),
  finalMockup('trial-offer', 'OtterLife trial-offer structure. 7-day offer is a design assumption, not an activated product.'),
  finalMockup('trial-reminder', 'Reminder two days before trial ends; requires notification permission.'),
  finalMockup('notification', 'Enable reminders triggers native iOS prompt; Maybe later skips without blocking.'),
  finalMockup('timeline', 'Trial timeline. Continue to plans. No purchase action in this mockup.'),
  finalMockup('paywall-top', 'SCROLL PAGE: top viewport. Offer, plan choices and benefits. Pricing TBD.'),
  finalMockup('paywall-bottom', 'SAME SCROLL PAGE: lower viewport. Reviews, repeated plans, terms and sticky CTA.'),
);

// September 6 visual revisions: preserve the flow and replace only specified artwork.
const revisedNames = new Set(['loop-reward', 'final-principles', 'loop-picker', 'final-walk-place', 'final-walk-rule', 'final-walk-target', 'final-review', 'final-trial-offer', 'final-trial-reminder', 'final-notification', 'final-timeline', 'final-paywall-top', 'final-paywall-bottom']);
for (const item of [...preBranch, ...branches.flatMap(branch => branch.screens), ...postBranch]) {
  if (item.mockup && revisedNames.has(path.basename(item.mockup, '.png'))) {
    item.mockup = item.mockup.replace(/\.png$/, '-v3.png');
  }
}
const mainAppScreens = ['Home', 'Conditions', 'Analytics', 'Settings'].map(title => ({
  kind: 'reference', title, change: 'AppBlock-inspired main app concept. Example data; freestanding multicolor emoji artwork.',
  mockup: `../../mockups/onboarding-orange/main-${title.toLowerCase()}-v3.png`,
}));

function escapeXml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function wrap(value, max = 28) {
  const words = value.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (`${line} ${word}`.trim().length > max && line) {
      lines.push(line);
      line = word;
    } else line = `${line} ${word}`.trim();
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(lines, x, y, size, color, weight = 400, gap = Math.round(size * 1.25), anchor = 'start') {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * gap}" text-anchor="${anchor}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`).join('\n');
}

function resolveReference(item) {
  if (item.mockup) {
    return { label: 'EXCERLOCK · GPT IMAGE PREVIEW', mime: 'image/png', data: fs.readFileSync(path.resolve(root, item.mockup)).toString('base64') };
  }
  const info = sources[item.source];
  const dir = path.join(root, info.dir);
  const prefix = `${String(item.sequence).padStart(3, '0')}-`;
  const file = fs.readdirSync(dir).find((name) => name.startsWith(prefix) && name.endsWith('.png'));
  if (!file) throw new Error(`Missing ${info.label} ${item.sequence}`);
  const absolutePath = path.join(dir, file);
  const converted = spawnSync('magick', [absolutePath, '-resize', '320x', '-quality', '84', 'jpeg:-'], { maxBuffer: 32 * 1024 * 1024 });
  if (converted.status !== 0) throw new Error(converted.stderr.toString());
  return { label: info.label, data: converted.stdout.toString('base64') };
}

const cardWidth = 392;
const cardHeight = 972;
const phoneX = 20;
const phoneY = 122;
const phoneWidth = 352;
const phoneHeight = 762;
const stepGap = 460;
const left = 96;
const mainY = 300;
const selectorIndex = preBranch.length - 1;
const selectorX = left + selectorIndex * stepGap;
const sharedX = selectorX + 4 * stepGap;
const branchStartX = selectorX + stepGap;
const branchYs = [1480, 2540, 3600, 4660];
const width = sharedX + postBranch.length * stepGap + 520;
const height = 7420;

const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  `<defs><marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 Z" fill="#8E9AA2"/></marker></defs>`,
  `<rect width="${width}" height="${height}" fill="#121517"/>`,
  `<text x="${left}" y="76" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="48" font-weight="700">ExcerLock — proposed onboarding blueprint</text>`,
  `<text x="${left}" y="126" fill="#A8B0B5" font-family="Arial, sans-serif" font-size="24">One horizontal journey. Four exercise paths branch, then rejoin at scheduling. Orange cards are new ExcerLock outlines; screenshots are competitor references.</text>`,
  `<rect x="${left}" y="166" width="208" height="8" rx="4" fill="#8E9AA2"/>`,
];

let stepNumber = 1;

function connector(x1, y1, x2, y2, color = '#657179') {
  parts.push(`<path d="M ${x1} ${y1} C ${x1 + 64} ${y1}, ${x2 - 64} ${y2}, ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="5" marker-end="url(#arrow)"/>`);
}

function renderCard(item, x, y, number, badge = '', badgeColor = '#A8B0B5') {
  const source = item.kind === 'reference' ? resolveReference(item) : null;
  const stroke = '#54616A';
  parts.push(`<g id="step-${String(number).padStart(2, '0')}" transform="translate(${x} ${y})">`);
  parts.push(`<rect width="${cardWidth}" height="${cardHeight}" rx="28" fill="#20262A" stroke="${stroke}" stroke-width="3"/>`);
  parts.push(`<circle cx="34" cy="34" r="22" fill="#E8EAED"/>`);
  parts.push(`<text x="34" y="42" text-anchor="middle" fill="#101411" font-family="Arial, sans-serif" font-size="17" font-weight="700">${number}</text>`);
  parts.push(textBlock(wrap(item.title, 27).slice(0, 2), 68, 34, 21, '#FFFFFF', 700, 25));
  if (badge) parts.push(`<text x="${cardWidth - 20}" y="34" text-anchor="end" fill="${badgeColor}" font-family="Arial, sans-serif" font-size="13" font-weight="700">${escapeXml(badge)}</text>`);

  if (item.kind === 'reference') {
    parts.push(textBlock(wrap(item.change, 44).slice(0, 2), 20, 91, 13, '#C1C7CC', 700, 16));
    parts.push(`<rect x="${phoneX}" y="${phoneY}" width="${phoneWidth}" height="${phoneHeight}" rx="22" fill="#0E1011"/>`);
    parts.push(`<image x="${phoneX + 12}" y="${phoneY + 12}" width="328" height="710" preserveAspectRatio="xMidYMid meet" href="data:${source.mime || 'image/jpeg'};base64,${source.data}"/>`);
    parts.push(`<rect x="20" y="900" width="352" height="48" rx="24" fill="#161B1E"/>`);
    parts.push(`<text x="196" y="930" text-anchor="middle" fill="#C1C7CC" font-family="Arial, sans-serif" font-size="16" font-weight="700">${item.mockup ? escapeXml(source.label) : `COPY BASE · ${escapeXml(source.label)} ${String(item.sequence).padStart(3, '0')}`}</text>`);
    if (item.change) parts.push(`<title>${escapeXml(item.change)}</title>`);
  } else {
    parts.push(`<rect x="${phoneX}" y="${phoneY}" width="${phoneWidth}" height="${phoneHeight}" rx="40" fill="#0E1011" stroke="#54616A" stroke-width="2"/>`);
    parts.push(`<rect x="146" y="138" width="100" height="8" rx="4" fill="#FFFFFF" opacity="0.3"/>`);
    parts.push(textBlock(wrap(item.title, 23).slice(0, 3), 44, 230, 28, '#FFFFFF', 700, 34));
    parts.push(textBlock(wrap(item.body, 34).slice(0, 4), 44, 340, 18, '#FFFFFF', 400, 25));
    let optionY = 460;
    item.options.forEach((option, index) => {
      const isRecommended = index === item.recommended;
      const optionSize = option.length > 30 ? 14 : option.length > 24 ? 15 : 17;
      parts.push(`<rect x="44" y="${optionY}" width="304" height="64" rx="20" fill="${isRecommended ? '#FFFFFF' : '#FFFFFF18'}" stroke="#FFFFFF" stroke-opacity="${isRecommended ? '1' : '0.18'}"/>`);
      parts.push(`<text x="64" y="${optionY + 39}" fill="${isRecommended ? '#101411' : '#FFFFFF'}" font-family="Arial, sans-serif" font-size="${optionSize}" font-weight="${isRecommended ? '700' : '400'}">${escapeXml(option)}</text>`);
      optionY += 78;
    });
    parts.push(`<rect x="44" y="810" width="304" height="58" rx="29" fill="#FFFFFF"/>`);
    parts.push(`<text x="196" y="846" text-anchor="middle" fill="#101411" font-family="Arial, sans-serif" font-size="18" font-weight="700">${escapeXml(item.footer)}</text>`);
    parts.push(`<text x="196" y="930" text-anchor="middle" fill="#A8B0B5" font-family="Arial, sans-serif" font-size="16" font-weight="700">NEW EXCERLOCK OUTLINE</text>`);
  }
  parts.push('</g>');
}

preBranch.forEach((item, index) => {
  const x = left + index * stepGap;
  renderCard(item, x, mainY, stepNumber++);
  if (index < preBranch.length - 1) connector(x + cardWidth, mainY + cardHeight / 2, x + stepGap - 20, mainY + cardHeight / 2);
});

branches.forEach((branch, branchIndex) => {
  const y = branchYs[branchIndex];
  const entryRailX = branchStartX - 28 - branchIndex * 8;
  const branchCenterY = y + cardHeight / 2;
  parts.push(`<text x="${branchStartX}" y="${y - 36}" fill="${branch.color}" font-family="Arial, sans-serif" font-size="24" font-weight="700">${branch.label} PATH</text>`);
  parts.push(`<path d="M ${selectorX + cardWidth / 2} ${mainY + cardHeight} C ${selectorX + cardWidth / 2} ${mainY + cardHeight + 56}, ${entryRailX} ${mainY + cardHeight + 56}, ${entryRailX} ${mainY + cardHeight + 112} L ${entryRailX} ${branchCenterY} H ${branchStartX - 14}" fill="none" stroke="${branch.color}" stroke-width="5" marker-end="url(#arrow)"/>`);
  branch.screens.forEach((item, index) => {
    const x = branchStartX + index * stepGap;
    renderCard(item, x, y, stepNumber++, branch.label, branch.color);
    if (index < branch.screens.length - 1) {
      if (branchIndex >= 2 && index === 1) {
        parts.push(`<text x="${x + cardWidth + 14}" y="${y + cardHeight / 2}" fill="#C1C7CC" font-family="Arial" font-size="18">OR</text>`);
      } else connector(x + cardWidth, y + cardHeight / 2, x + stepGap - 20, y + cardHeight / 2, branch.color);
    }
  });
  const endX = branchStartX + (branch.screens.length - 1) * stepGap + cardWidth;
  const mergeRailX = sharedX - 30 + branchIndex * 6;
  if (branchIndex <= 1) {
    const choiceX = branchStartX + (branchIndex === 0 ? stepGap : 0) + cardWidth / 2;
    parts.push(`<path d="M ${choiceX} ${y + cardHeight} V ${y + cardHeight + 36} H ${mergeRailX} V ${branchCenterY}" fill="none" stroke="#8E9AA2" stroke-width="3" stroke-dasharray="10 8"/>`);
    parts.push(`<text x="${choiceX + 10}" y="${y + cardHeight + 28}" fill="#C1C7CC" font-family="Arial" font-size="16">${branchIndex === 0 ? 'While walking: skip target' : 'Arrival: skip minutes'}</text>`);
  }
  parts.push(`<path d="M ${endX} ${branchCenterY} H ${mergeRailX} V ${mainY + cardHeight + 96}" fill="none" stroke="${branch.color}" stroke-width="5"/>`);
});

parts.push(`<path d="M ${sharedX - 12} ${mainY + cardHeight + 96} C ${sharedX + 72} ${mainY + cardHeight + 96}, ${sharedX + cardWidth / 2} ${mainY + cardHeight + 58}, ${sharedX + cardWidth / 2} ${mainY + cardHeight + 14}" fill="none" stroke="#8E9AA2" stroke-width="6" marker-end="url(#arrow)"/>`);

postBranch.forEach((item, index) => {
  const x = sharedX + index * stepGap;
  renderCard(item, x, mainY, stepNumber++);
  if (index < postBranch.length - 1) connector(x + cardWidth, mainY + cardHeight / 2, x + stepGap - 20, mainY + cardHeight / 2);
});

parts.push(`<text x="${left}" y="6100" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="42" font-weight="700">Main app — four tabs</text>`);
parts.push(`<text x="${left}" y="6150" fill="#A8B0B5" font-family="Arial, sans-serif" font-size="22">Home · Conditions · Analytics · Settings. Separate destinations, not extra onboarding steps.</text>`);
mainAppScreens.forEach((item, index) => renderCard(item, left + index * stepGap, 6240, `M${index + 1}`));
parts.push(`<text x="${left}" y="${height - 72}" fill="#778188" font-family="Arial, sans-serif" font-size="20">GPT Image concept previews · raster screens, not live controls · example data and unconfigured offer placeholders</text>`);
parts.push('</svg>');

fs.writeFileSync(path.join(outputDir, 'excerlock-proposed-onboarding-blueprint-v3.svg'), parts.join('\n'));

const manifest = {
  mainSteps: preBranch.length + postBranch.length,
  branchPaths: branches.length,
  branchScreens: branches.reduce((total, branch) => total + branch.screens.length, 0),
  totalCards: stepNumber - 1,
  mainAppCards: mainAppScreens.length,
};
fs.writeFileSync(path.join(outputDir, 'proposed-onboarding-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
