import bankCopy from '../bankShieldCopy.json';
import { UnlockHint } from '../../model/types';
import { sessionCopy as c } from '../sessionsCopy';
export function shieldContent(cause: 'locked' | 'lockWindow' | 'walkingEnded', hint?: UnlockHint) {
  if (hint?.action === 'shop')
    return {
      title: bankCopy.title,
      subtitle: bankCopy.subtitle,
      primary: bankCopy.primaryActionLabel,
      secondary: bankCopy.secondaryActionLabel,
    };
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
