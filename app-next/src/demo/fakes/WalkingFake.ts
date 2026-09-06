import { WalkingPort } from '../../ports/WalkingPort';
import { WalkingSession } from '../../domain/types';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { FakeContext } from '../FakeContext';
export function WalkingFake(ctx: FakeContext): WalkingPort {
  let cancel: (() => void) | undefined;
  const stop = () => {
    cancel?.();
    cancel = undefined;
    const session = ruleDaysStore.getState().data.walkingSession;
    if (session) ruleDaysStore.getState().patch({ walkingSession: { ...session, phase: 'ended' } });
  };
  return {
    start: async (rule) => {
      stop();
      const startedAt = ctx.clock.now();
      const session: WalkingSession = {
        ruleId: rule.id,
        startedAt,
        leaseUntil: new Date(Date.parse(startedAt) + 900000).toISOString(),
        phase: 'verifying',
      };
      ruleDaysStore.getState().patch({ walkingSession: session });
      const script = ctx.scenario.walking ?? {
        script: ['verifying', 'walking', 'grace', 'ended'] as WalkingSession['phase'][],
        stepMs: 6000,
      };
      cancel = ctx.clock.subscribe(() => {
        const index = Math.min(
          script.script.length - 1,
          Math.floor((Date.parse(ctx.clock.now()) - Date.parse(startedAt)) / script.stepMs),
        );
        const phase = script.script[index];
        ruleDaysStore.getState().patch({ walkingSession: { ...session, phase } });
        if (phase === 'ended') {
          cancel?.();
          cancel = undefined;
        }
      });
      return session;
    },
    stop,
    observe: (callback) => {
      callback(ruleDaysStore.getState().data.walkingSession);
      return ruleDaysStore.subscribe((s) => callback(s.data.walkingSession));
    },
    treadmillFraming: () => ({ ready: true, message: 'Keep your phone propped up so your full body fits in view.' }),
  };
}
