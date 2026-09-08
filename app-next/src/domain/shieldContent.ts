import { sessionCopy as c } from '../content/sessions';
import { LockWindowMonitor } from './monitorPlan';
import { Rule, RuleDay, UnlockHint } from './types';
import { unlockHint } from './unlockHint';

export type ShieldCause = 'locked' | 'lockWindow' | 'walkingEnded';
export type ShieldContent = {
  title: string;
  subtitle: string;
  primary: string;
  secondary?: string;
};

type ShieldContentInput = {
  cause: ShieldCause;
  hint?: UnlockHint;
  goal: 'pending' | 'met';
  canNotify: boolean;
};

const actionFor = (hint?: UnlockHint) => {
  if (hint?.action === 'walk') return c.shieldWalk;
  if (hint?.action === 'arrive') return c.shieldArrive;
  if (hint?.action === 'progress' && hint.goal !== null && hint.unit !== null) {
    const verb = hint.unit === 'steps' ? c.shieldWalkVerb : c.shieldCompleteVerb;
    return c.shieldGoal(verb, hint.goal.toLocaleString('en-US'), hint.unit);
  }
  return c.shieldFallback;
};

export function shieldContent({ cause, hint, goal, canNotify }: ShieldContentInput): ShieldContent {
  const action = goal === 'met' ? c.shieldClaim : actionFor(hint);
  const subtitle =
    cause === 'walkingEnded' ? c.shieldEnded : cause === 'lockWindow' ? `${c.shieldWindowPrefix} ${action}` : action;
  if (!canNotify) return { title: c.shieldTitle, subtitle, primary: c.shieldClose };
  return {
    title: c.shieldTitle,
    subtitle,
    primary: c.shieldOpen,
    secondary: cause === 'walkingEnded' || hint?.action === 'walk' ? c.shieldKeep : c.shieldOkay,
  };
}

export function shieldContentSet({
  monitors,
  rules,
  ruleDays,
  canNotify,
}: {
  monitors: LockWindowMonitor[];
  rules: Rule[];
  ruleDays: RuleDay[];
  canNotify: boolean;
}): Record<string, ShieldContent> {
  return Object.fromEntries(
    monitors.map((monitor) => {
      const applicable = rules.filter((rule) => rule.enabled && monitor.ruleIds.includes(rule.id));
      const rows = ruleDays.filter((row) => monitor.ruleIds.includes(row.ruleId));
      return [
        monitor.name,
        shieldContent({
          cause: 'lockWindow',
          hint: applicable.length ? unlockHint(applicable, rows) : undefined,
          goal: rows.some((row) => row.met) ? 'met' : 'pending',
          canNotify,
        }),
      ];
    }),
  );
}
