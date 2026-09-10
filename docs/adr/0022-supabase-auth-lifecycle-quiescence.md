---
status: accepted
date: 2026-09-10
---

# 0022: Supabase auth lifecycle quiescence

## Decision

The production Supabase client retains `autoRefreshToken: true`, the existing secure storage key and provider, and the adapter's single foreground retry listener. It receives a named FIFO `LockFunc` implemented with the public `@supabase/auth-js` `processLock` export. In addition, every asynchronous `supabase.auth` operation initiated by `SupabaseAuthAdapter` passes through an application operation gate.

The production factory exclusively owns the client it creates. A client injected through test/composition configuration remains caller-owned: service cleanup removes adapter subscriptions and drains adapter-started calls, but does not initialize, stop, or dispose that shared client.

Disposal fences adapter entry and callbacks synchronously, then performs this ordered asynchronous shutdown:

1. await SDK initialization;
2. stop automatic refresh;
3. drain application-auth operations admitted before the fence;
4. close and drain the SDK lock;
5. call the SDK's public `dispose` method.

The asynchronous contract propagates through auth, identity, client, and real-runtime cleanup. Independent identity resources are settled even if one cleanup fails. The real runtime converts cleanup failures to `RuntimeCleanupError`; its retry-unsafe marker prevents `RuntimeSingleton` from replacing a graph whose old auth client has not proven quiescent.

## Context

Auth JS 2.116 starts initialization in its constructor. Initialization can subsequently start the refresh ticker, while `dispose()` explicitly does not await in-flight fetches or storage writes. Awaiting `dispose()` alone therefore cannot prove that a replaced client will not mutate the shared secure session later.

The SDK lock covers initialization, refresh, and session-dependent operations, and SDK same-client reentrancy is handled internally. It does not cover every storage-mutating public entry point: anonymous sign-in, ID-token sign-in, and OTP flows can save sessions outside that lock. The separate adapter operation gate covers those calls. Auth-state callbacks remain synchronous and defer adapter reconciliation, avoiding a callback-to-refresh lock cycle; generation and disposed checks reject stale deferred work.

Alternatives rejected for now are private SDK imports, patching the SDK, disabling automatic refresh, and substituting a standalone auth-only client. They would add version fragility or alter established session/provider behavior without removing the need to control application-started operations.

## Consequences

Runtime replacement waits for admitted network and secure-storage work, including queued FIFO lock work. New adapter calls are rejected as soon as disposal begins, late SDK lock acquisition invalidates the cleanup proof, and no storage write from the old client may occur after disposal resolves. Ordinary rejected auth/network operations are awaited but are not themselves cleanup failures.

`@supabase/auth-js` is a direct application dependency because runtime code imports its public lock API. The lock option is deprecated upstream for SDK coordination, so this decision must be revisited during an Auth JS major upgrade; the application operation gate remains independently necessary while public mutators can write outside SDK coordination.

## References

- `app-next/src/runtime/auth/authLifecycle.ts`
- `app-next/src/runtime/auth/createAuthServices.ts`
- `app-next/src/runtime/auth/SupabaseAuthAdapter.ts`
- `app-next/src/runtime/RuntimeSingleton.ts`
- `app-next/src/runtime/auth/__tests__/authLifecycleSdkRace.test.ts`
- Auth JS 2.116 `GoTrueClient` and public lock implementation
