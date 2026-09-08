import { Session } from './types';
export type Identity = { userId: string | null };
/**
 * The identity the subscription and analytics ports are bound to.
 *
 * merge: P2-T18 adds `Session.userId`; replace the derivation below with that field and delete
 * this comment. The shape returned here does not change.
 */
export function identityOf(session: Session): Identity {
  return { userId: session.kind === 'signedIn' ? `${session.provider}:${session.email ?? ''}` : null };
}
/** True when two sessions resolve to the same identity, so an unrelated store write cannot re-identify. */
export function sameIdentity(left: Session, right: Session): boolean {
  return identityOf(left).userId === identityOf(right).userId;
}
