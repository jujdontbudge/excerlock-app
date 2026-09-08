import { useEffect } from 'react';
import { identityOf } from '../domain/identity';
import { Unsubscribe } from '../ports/models';
import { sessionStore } from '../state/sessionStore';
import { Runtime } from './Runtime';

/**
 * Binds the session's user to the subscription and analytics ports.
 *
 * Identify runs subscription-first so an entitlement fetch is already scoped to the user before the
 * first event is attributed; reset runs in the reverse order so no event is attributed to the
 * signed-out user after analytics has been cleared.
 */
export function bindIdentity(runtime: Runtime): Unsubscribe {
  let current: string | null = null;
  const apply = () => {
    const { userId } = identityOf(sessionStore.getState().data.session);
    if (userId === current) return;
    current = userId;
    if (userId) {
      runtime.subscription.identify(userId);
      runtime.analytics.identify(userId);
    } else {
      runtime.analytics.reset();
      runtime.subscription.reset();
    }
  };
  const { userId } = identityOf(sessionStore.getState().data.session);
  if (userId) apply();
  else current = null;
  return sessionStore.subscribe(apply);
}

export function IdentityBridge({ runtime }: { runtime: Runtime }) {
  useEffect(() => bindIdentity(runtime), [runtime]);
  return null;
}
