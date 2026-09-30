export function isAccountDataReady(
  identity: { kind: string; ready: boolean; userId: string | null },
  activeUserId: string | null,
): boolean {
  return identity.kind === 'canonical' && identity.ready && identity.userId === activeUserId;
}
