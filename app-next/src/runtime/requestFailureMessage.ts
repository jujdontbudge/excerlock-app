import { ReachabilityPort } from '../ports/ReachabilityPort';

/**
 * Offline wins over the caller's fallback even when the failure had another cause: a request that cannot
 * leave the device cannot be judged, so "reconnect and try again" is the only actionable instruction.
 * Typed adapter errors (P2-T01) can narrow this later.
 */
export async function requestFailureMessage(
  reachability: ReachabilityPort,
  copy: { offline: string; fallback: string },
): Promise<string> {
  try {
    return (await reachability.isOnline()) ? copy.fallback : copy.offline;
  } catch {
    return copy.fallback;
  }
}
