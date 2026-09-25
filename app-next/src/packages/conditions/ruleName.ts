import { Rule } from '../model/types';
import { domainCopy as c } from '../schedule/domainCopy';
export function ruleName(rule: Rule): string {
  const m = rule.mode;
  if (m.kind === 'state') return m.activity === 'gym' ? c.gymPresence : c.state;
  if (m.kind === 'event') return c.arrival;
  const unit = c[m.metric];
  const name = `${c.verbs[m.activity]} ${m.goal.toLocaleString('en-US')} ${unit}`;
  return m.activity === 'gym' ? `${name} ${c.atGym}` : name;
}
