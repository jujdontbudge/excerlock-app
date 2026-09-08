/**
 * The first progress claim of this launch. `null` means the ports have not answered yet, so Home
 * says it is checking today's activity instead of inviting a walk it may already have counted.
 * `undefined` means no claim is tracked at all, which is Phase 1: progress arrives synchronously
 * from the persisted rule days.
 *
 * merge: replace with P2-T05's progressSync `lastClaimAt` selector — this hook is the only call site.
 */
export function useLastClaimAt(): string | null | undefined {
  return undefined;
}
