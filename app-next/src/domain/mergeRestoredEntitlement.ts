import { Entitlement } from './types';

const isEntitled = (status: Entitlement['status']) => status === 'trial' || status === 'active';

/** Restores can improve access, but an empty or weaker result can never revoke it. */
export function mergeRestoredEntitlement(current: Entitlement, restored: Entitlement): Entitlement {
  if (!isEntitled(restored.status)) return current;
  if (current.status === 'active') return current;
  if (current.status === 'trial' && restored.status === 'trial') return current;
  return restored;
}
