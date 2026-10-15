import { subscriptionCopy } from '../../subscription/subscriptionCopy';
import { bankPrice, difficultyLabels } from '../../conditions/bankCopy';
import { dailyMinimum, economy, type Difficulty } from '../../model/bankEconomy';

export const previewDifficulties = (Object.keys(economy) as Difficulty[]).map((difficulty) => ({
  id: difficulty,
  title: difficultyLabels[difficulty],
  trade: bankPrice('walking', difficulty),
  detail: `Keep your Streak with ${dailyMinimum('walking', difficulty).toLocaleString('en-US')} steps a day`,
}));
export function previewBankProgress(activity: 'walking' | 'gym'): string {
  return activity === 'gym'
    ? `22 / ${dailyMinimum(activity, 'medium')} min at the gym`
    : `4,210 / ${dailyMinimum(activity, 'medium').toLocaleString('en-US')} steps`;
}

export const previewCopy = {
  gallery: 'Component gallery',
  intro: 'Shared controls, layouts and motion.',
  standard: 'Default',
  alternate: 'Alternate',
  next: 'Next component',
  variants: 'Switch variant',
  open: 'Open sheet',
  prompt: 'Show local prompt',
  close: 'Close',
  name: 'First name',
  alex: 'Alex',
  nameError: 'Enter your first name',
  walk: 'Walk 5,000 steps',
  detail: '1,800 steps to go',
  selected: 'Outside',
  selectionSupport: 'A little fresh air',
  hours: 'Hours per day',
  distance: 'Distance',
  schedule: 'Mon–Fri · 9 AM–9 PM',
  start: '9:00 AM',
  end: '9:00 PM',
  locked: 'Apps locked',
  unlocked: 'Apps unlocked',
  until: 'Your next window starts tomorrow at 9 AM',
  statusSupport: 'Meet any one condition to unlock your apps.',
  steps: 'Steps',
  today: 'Today',
  startWalk: 'Start walk',
  choose: 'Choose a time',
  motion: 'Motion & Fitness',
  units: 'Units',
  miles: 'Miles',
  preferences: 'Preferences',
  haptics: 'Haptics',
  heading: 'Move first. Make room for life.',
  support: 'Build a small habit that gives you your day back.',
  checklist: ['Your walking goal', 'Your chosen days', 'Your blocking window'],
  loop: ['A cue', 'A quick scroll', 'Repeat'],
  periods: ['Week', 'Month', 'Year'],
  empty: 'Your first condition',
  emptyBody: 'Choose an activity to start your plan.',
  add: 'Add condition',
  shellBody: 'Scroll this content while the footer stays within reach.',
  chart: 'Steps this week',
  trend: 'Screen time trend',
  now: 'Now',
  goal: 'Your goal',
  dots: 'Days reclaimed',
  timeline: subscriptionCopy.timeline(),
  bars: [
    { label: 'M', value: 3200 },
    { label: 'T', value: 5100 },
    { label: 'W', value: 2400 },
    { label: 'T', value: 6200 },
    { label: 'F', value: 5800 },
    { label: 'S', value: 7400 },
    { label: 'S', value: 4500 },
  ],
} as const;
