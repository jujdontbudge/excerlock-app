import { ReachabilityPort } from '../ports/ReachabilityPort';

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
