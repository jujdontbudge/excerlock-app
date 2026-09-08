import { enforcementStore } from '../../state/enforcementStore';

/**
 * The progress claim Home waits for. `null` means the ports have not answered yet this launch, so
 * Home says it is checking today's activity instead of inviting a walk it may already have counted.
 * `createProgressSync` records it when a refresh completes, at launch and on every foreground.
 */
export function useLastClaimAt(): string | null {
  return enforcementStore((state) => state.lastClaimAt);
}
