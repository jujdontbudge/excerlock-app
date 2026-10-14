import { isValidStepGoal } from './stepGoal';

export type RuleIssue = 'identity' | 'mode' | 'goal' | 'days' | 'window';
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
  if (!record(m) || m.activity !== value.activity || !['walking', 'gym'].includes(String(m.activity)))
    issues.push('mode');
  else {
    if (m.kind === 'bank') {
      if (!['easy', 'medium', 'hard'].includes(String(m.difficulty))) issues.push('mode');
    } else if (m.kind === 'state') {
      if (!['walking', 'gym'].includes(String(m.activity))) issues.push('mode');
    } else if (m.kind === 'event') {
      if (m.activity !== 'gym' || m.trigger !== 'arrival') issues.push('mode');
    } else if (m.kind === 'target') {
      if (m.activity === 'walking' && m.metric === 'steps') {
        if (!finite(m.goal) || !isValidStepGoal(m.goal)) issues.push('goal');
      } else if (m.activity === 'walking' && m.metric === 'minutes') {
        if (!finite(m.goal) || m.goal < 5 || m.goal > 180 || !Number.isInteger(m.goal)) issues.push('goal');
      } else if (m.activity === 'gym' && m.metric === 'minutes') {
        if (!finite(m.goal) || m.goal < 10 || m.goal > 180) issues.push('goal');
      } else issues.push('mode');
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
      (end - start + 1440) % 1440 < 15
    )
      issues.push('window');
  } else if (w.kind !== 'allDay') issues.push('window');
  return [...new Set(issues)];
}
