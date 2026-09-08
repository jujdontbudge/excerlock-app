import { ReachabilityPort } from '../../ports/ReachabilityPort';
import { requestFailureMessage } from '../../runtime/requestFailureMessage';
import { isApiError } from './ApiError';

export type ApiFailureCopy = { offline: string; timeout: string; rejected: string; fallback: string };

/**
 * Picks the sentence for a failed server call. A typed `ApiError` decides directly; anything else
 * falls back to the reachability check so offline still wins over the generic error.
 */
export async function apiFailureMessage(
  error: unknown,
  reachability: ReachabilityPort,
  copy: ApiFailureCopy,
): Promise<string> {
  if (isApiError(error)) {
    if (error.kind === 'offline') return copy.offline;
    if (error.kind === 'timeout') return copy.timeout;
    if (error.kind === 'rejected') return copy.rejected;
    return copy.fallback;
  }
  return requestFailureMessage(reachability, { offline: copy.offline, fallback: copy.fallback });
}
