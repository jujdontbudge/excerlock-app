import { Rule, RuleMode } from './types';
import { WALKING_MINUTES_MAX, WALKING_MINUTES_MIN, validWalkingMinutes } from './walkingDuration';

export type RuleIssue = 'identity' | 'mode' | 'goal' | 'days' | 'window';
// B32 keeps DeviceActivity lock windows at twice Apple's documented 15-minute floor.
export const MIN_WINDOW_MINUTES = 30;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const iso = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function validateRule(value: unknown): RuleIssue[] {
  if (!record(value)) return ['identity'];
  const issues: RuleIssue[] = [];
  if (
    typeof value.id !== 'string' ||
    !value.id ||
    typeof value.enabled !== 'boolean' ||
    !iso(value.createdAt) ||
    !iso(value.updatedAt)
  )
    issues.push('identity');
  const m = value.mode;
  if (
    !record(m) ||
    m.activity !== value.activity ||
    !['walking', 'gym', 'running', 'biking'].includes(String(m.activity))
  )
    issues.push('mode');
  else {
    if (m.activity === 'walking' && !['outside', 'treadmill', 'either'].includes(String(m.place))) issues.push('mode');
    if (m.kind === 'state') {
      if (m.activity !== 'walking') issues.push('mode');
    } else if (m.kind === 'event') {
      if (m.activity !== 'gym' || m.trigger !== 'arrival') issues.push('mode');
    } else if (m.kind === 'target') {
      let min = 0,
        max = 0;
      if (m.activity === 'walking' && m.metric === 'steps') {
        min = 500;
        max = 30000;
        if (m.place === 'treadmill') issues.push('mode');
        if (finite(m.goal) && m.goal % 500 !== 0) issues.push('goal');
      } else if (m.activity === 'walking' && m.metric === 'minutes') {
        min = WALKING_MINUTES_MIN;
        max = WALKING_MINUTES_MAX;
        if (!validWalkingMinutes(m.goal)) issues.push('goal');
      } else if (m.metric === 'minutes' && m.activity !== 'walking') {
        min = m.activity === 'gym' ? 10 : 5;
        max = m.activity === 'gym' ? 180 : 300;
      } else if (
        m.metric === 'distance' &&
        (m.activity === 'running' || m.activity === 'biking') &&
        (m.unit === 'km' || m.unit === 'mi')
      ) {
        min = m.activity === 'running' ? (m.unit === 'km' ? 0.5 : 0.25) : 1;
        max = m.activity === 'running' ? (m.unit === 'km' ? 50 : 30) : m.unit === 'km' ? 200 : 120;
      } else issues.push('mode');
      if (!finite(m.goal) || m.goal < min || m.goal > max) issues.push('goal');
    } else issues.push('mode');
  }
  const s = value.schedule;
  if (!record(s)) return [...issues, 'days', 'window'];
  if (
    !Array.isArray(s.days) ||
    s.days.length === 0 ||
    s.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
    new Set(s.days).size !== s.days.length
  )
    issues.push('days');
  const w = s.window;
  if (!record(w)) issues.push('window');
  else if (w.kind === 'range') {
    const start = w.startMinute,
      end = w.endMinute;
    if (
      !finite(start) ||
      !finite(end) ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start > 1439 ||
      end < 0 ||
      end > 1439 ||
      (end - start + 1440) % 1440 < MIN_WINDOW_MINUTES
    )
      issues.push('window');
  } else if (w.kind !== 'allDay') issues.push('window');
  return [...new Set(issues)];
}

/** A treadmill-only steps goal has no measurable signal, so it widens to either (P2-T16). */
function widenTreadmillSteps(rule: Rule): Rule {
  const mode: RuleMode = rule.mode;
  return mode.kind === 'target' && mode.activity === 'walking' && mode.metric === 'steps' && mode.place === 'treadmill'
    ? { ...rule, mode: { ...mode, place: 'either' } }
    : rule;
}

export function migrateRule(input: Rule): Rule {
  const rule = widenTreadmillSteps(input);
  const window = rule.schedule.window;
  if (window.kind === 'allDay') return rule;
  const duration = (window.endMinute - window.startMinute + 1440) % 1440;
  if (duration < 15 || duration >= MIN_WINDOW_MINUTES) return rule;
  return {
    ...rule,
    schedule: {
      ...rule.schedule,
      window: {
        ...window,
        endMinute: (window.startMinute + MIN_WINDOW_MINUTES) % 1440,
      },
    },
  };
}
