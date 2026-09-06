import { Rule } from './types';
import { domainCopy as c } from '../content/domain';
export function ruleName(rule: Rule): string {
  const m = rule.mode;
  if (m.kind === 'state') return c.state;
  if (m.kind === 'event') return c.arrival;
  const unit = m.metric === 'distance' ? m.unit : c[m.metric];
  const name = `${c.verbs[m.activity]} ${m.goal.toLocaleString('en-US')} ${unit}`;
  return m.activity === 'gym' ? `${name} ${c.atGym}` : name;
}
