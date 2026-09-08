import { useEffect } from 'react';
import { bindIdentity } from '../domain/identity';
import { Unsubscribe } from '../ports/models';
import { sessionStore } from '../state/sessionStore';
import { Runtime } from './Runtime';

/**
 * Follows the session and binds its user id to the subscription and analytics ports.
 *
 * The ordering law lives in `domain/identity`; this is only the mount. Every session carries a user
 * id — the anonymous one included — so both SDKs are identified from first launch, and the guard on
 * the previous id keeps an unrelated store write from re-identifying.
 */
export function startIdentityBridge(runtime: Runtime): Unsubscribe {
  let current: string | null = null;
  const apply = () => {
    const { userId } = sessionStore.getState().data.session;
    if (userId === current) return;
    current = userId;
    bindIdentity(runtime, userId);
  };
  apply();
  return sessionStore.subscribe(apply);
}

export function IdentityBridge({ runtime }: { runtime: Runtime }) {
  useEffect(() => startIdentityBridge(runtime), [runtime]);
  return null;
}
