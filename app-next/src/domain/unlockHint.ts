import { Rule, RuleDay, UnlockHint } from './types';
export function unlockHint(rules: Rule[], days: RuleDay[]): UnlockHint {
  if (!rules.length) throw new Error('No active rules');
  const offers = rules.map((rule): UnlockHint => {
    const mode = rule.mode;
    if (mode.kind !== 'target')
      return {
        ruleId: rule.id,
        action: mode.kind === 'state' ? 'walk' : 'arrive',
        remaining: null,
        goal: null,
        unit: null,
      };
    return {
      ruleId: rule.id,
      action: 'progress',
      remaining: Math.max(0, mode.goal - (days.find((d) => d.ruleId === rule.id)?.progress ?? 0)),
      goal: mode.goal,
      unit: mode.metric === 'distance' ? mode.unit : mode.metric,
    };
  });
  return offers.reduce((best, offer) => {
    if (best.action !== 'progress') return best;
    if (offer.action !== 'progress') return offer;
    return best.unit === offer.unit && offer.remaining! < best.remaining! ? offer : best;
  });
}
