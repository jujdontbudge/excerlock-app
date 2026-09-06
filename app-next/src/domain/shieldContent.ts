import { UnlockHint } from './types';
import { sessionCopy as c } from '../content/sessions';
export function shieldContent(cause: 'locked' | 'lockWindow' | 'walkingEnded', hint?: UnlockHint) {
  const walking = cause === 'walkingEnded' || hint?.action === 'walk';
  const subtitle =
    cause === 'walkingEnded'
      ? c.shieldEnded
      : hint?.action === 'walk'
        ? c.shieldWalk
        : hint?.action === 'arrive'
          ? c.shieldArrive
          : hint?.remaining !== null && hint?.remaining !== undefined
            ? c.shieldProgress(hint.remaining, hint.unit ?? '')
            : c.shieldFallback;
  return { title: c.shieldTitle, subtitle, primary: c.shieldOpen, secondary: walking ? c.shieldKeep : c.shieldOkay };
}
