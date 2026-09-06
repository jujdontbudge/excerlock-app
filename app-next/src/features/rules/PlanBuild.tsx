import { useEffect, useRef, useState } from 'react';
import { Heading, Checklist } from '../../design-system';
import { planCopy as c } from '../../content/plan';
import { activities } from '../../content/activities';
import { ruleName } from '../../domain/ruleName';
import { scheduleLabel } from '../../domain/scheduleLabel';
import { Rule } from '../../domain/types';
import { useMotion } from '../../motion/useMotion';
import { LivingIcon } from '../../motion/LivingIcon';
export function PlanBuild({ rule, onComplete }: { rule: Rule; onComplete: () => void }) {
  const [completed, setCompleted] = useState(0),
    m = useMotion(),
    callback = useRef(onComplete);
  useEffect(() => {
    callback.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    const timers = m.reduced
      ? [
          setTimeout(() => {
            setCompleted(3);
          }, m.duration.fast),
          setTimeout(() => callback.current(), m.duration.slow),
        ]
      : [
          ...[1, 2, 3].map((n) => setTimeout(() => setCompleted(n), n * m.duration.planCheck)),
          setTimeout(() => callback.current(), m.duration.planBuild),
        ];
    return () => timers.forEach(clearTimeout);
  }, [m.reduced, m.duration.fast, m.duration.slow, m.duration.planCheck, m.duration.planBuild]);
  return (
    <>
      <Heading title={c.S2} />
      <LivingIcon name={rule.activity} />
      <Checklist
        items={[activities.find((a) => a.id === rule.activity)!.title, ruleName(rule), scheduleLabel(rule.schedule)]}
        completed={completed}
      />
    </>
  );
}
