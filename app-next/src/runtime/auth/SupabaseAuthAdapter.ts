import type { SupabaseClient, Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';
import {
  AuthError,
  AuthIdentity,
  AuthPendingDeletionError,
  AuthPort,
  AuthRecoveryRequiredError,
  isAuthCancelled,
} from '../../ports/AuthPort';
import type { Session } from '../../domain/types';
import type { Unsubscribe } from '../../ports/models';
import { sessionStore } from '../../state/sessionStore';
import { requestAppleCredential, type AppleNativeDeps } from './providerApple';
import { requestGoogleCredential, type GoogleAuthDeps } from './providerGoogle';
import { isLinkConflictError, isExistingAccountError, normalizeEmail, validateEmail, validateOtpCode, type EmailFlowKind } from './emailFlow';
import type { RunIdentityOperation } from './identityBarrier';

export type AuthAdapterDeps = {
  supabase: SupabaseClient;
  appleDeps: AppleNativeDeps;
  googleDeps: GoogleAuthDeps;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
  /** Disable analytics/money + clear shields before DELETE. Root provides real; tests inject mock. */
  onBeforeDelete?: () => Promise<void>;
  /** Reset SDK identity on sign-out / account switch (analytics reset + subscription reset). */
  onAccountSwitchReset?: () => Promise<void>;
  bootTimeoutMs?: number;
  runIdentityOperation?: RunIdentityOperation;
};

const BOOT_TIMEOUT_MS = 5000;

function sessionFromUser(user: SupabaseUser | null): Session {
  if (!user || user.is_anonymous) return { kind: 'anonymous' };
  const identities = user.identities ?? [];
  const providers = identities.map((i) => i.provider);
  let provider: 'apple' | 'google' | 'email' = 'email';
  if (providers.includes('apple')) provider = 'apple';
  else if (providers.includes('google')) provider = 'google';
  else if (user.app_metadata?.provider === 'apple') provider = 'apple';
  else if (user.app_metadata?.provider === 'google') provider = 'google';
  return { kind: 'signedIn', provider, email: user.email ?? null };
}

function isAnonymousUser(user: SupabaseUser | null): boolean {
  if (!user) return true;
  return user.is_anonymous === true;
}

export class SupabaseAuthAdapter implements AuthPort {
  private supabase: SupabaseClient;
  private appleDeps: AppleNativeDeps;
  private googleDeps: GoogleAuthDeps;
  private apiBaseUrl: string;
  private fetchImpl: typeof fetch;
  private onBeforeDelete: () => Promise<void>;
  private onAccountSwitchReset: () => Promise<void>;
  private bootTimeoutMs: number;

  private generation = 0;
  private currentIdentity: AuthIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: 0, ready: false };
  private currentSession: Session = { kind: 'anonymous' };
  private sessionListeners = new Set<(s: Session) => void>();
  private identityListeners = new Set<(i: AuthIdentity) => void>();
  private bootPromise: Promise<AuthIdentity> | null = null;
  private lastBootError: unknown = null;
  private pendingEmail: string | null = null;
  private pendingFlow: EmailFlowKind | null = null;
  private authSubscription: { unsubscribe: () => void } | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private disposed = false;
  private runIdentityOperation: RunIdentityOperation;

  constructor(deps: AuthAdapterDeps) {
    this.supabase = deps.supabase;
    this.appleDeps = deps.appleDeps;
    this.googleDeps = deps.googleDeps;
    this.apiBaseUrl = deps.apiBaseUrl.replace(/\/$/, '');
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.onBeforeDelete = deps.onBeforeDelete ?? (async () => undefined);
    this.onAccountSwitchReset = deps.onAccountSwitchReset ?? (async () => undefined);
    this.bootTimeoutMs = deps.bootTimeoutMs ?? BOOT_TIMEOUT_MS;
    this.runIdentityOperation = deps.runIdentityOperation ?? (async (operation) => operation());
    this.registerAuthCallback();
    this.registerForegroundRetry();
  }

  // ---- AuthPort reads ----

  session(): Session {
    return this.currentSession;
  }

  identity(): AuthIdentity {
    return this.currentIdentity;
  }

  subscribe(callback: (session: Session) => void): Unsubscribe {
    this.sessionListeners.add(callback);
    return () => {
      this.sessionListeners.delete(callback);
    };
  }

  subscribeIdentity(callback: (identity: AuthIdentity) => void): Unsubscribe {
    this.identityListeners.add(callback);
    return () => {
      this.identityListeners.delete(callback);
    };
  }

  async waitForCanonicalIdentity(options?: { timeoutMs?: number }): Promise<AuthIdentity> {
    const timeoutMs = options?.timeoutMs ?? 5000;
    const startGeneration = this.generation;
    const current = this.currentIdentity;
    if (current.kind === 'canonical' && current.userId) return current;
    return new Promise<AuthIdentity>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new AuthError(`Sign-in is taking longer than expected. Please try again.`, { code: 'IDENTITY_TIMEOUT' }));
      }, timeoutMs);
      const listener = (next: AuthIdentity) => {
        if (this.generation !== startGeneration) {
          cleanup();
          reject(new AuthError('Sign-in was interrupted. Please try again.', { code: 'IDENTITY_GENERATION_CHANGED' }));
          return;
        }
        if (next.kind === 'canonical' && next.userId) {
          cleanup();
          resolve(next);
        }
      };
      this.identityListeners.add(listener);
      const cleanup = () => {
        clearTimeout(timer);
        this.identityListeners.delete(listener);
      };
    });
  }

  // ---- Boot ----

  async boot(): Promise<AuthIdentity> {
    if (this.bootPromise) return this.bootPromise;
    const startGeneration = this.generation;
    this.bootPromise = this.runBoot(startGeneration);
    try {
      return await this.bootPromise;
    } finally {
      // Keep bootPromise for single-flight deduplication while in flight;
      // on failure allow explicit retry via retryBoot() which clears it.
      // On success keep it resolved (subsequent boot() returns same).
    }
  }

  /** Visible retry entry for boot failures / provisional timeout. Clears single-flight to allow one new attempt. */
  async retryBoot(): Promise<AuthIdentity> {
    if (this.bootPromise) {
      // If boot is still in flight (provisional fallback already returned but
      // anonymous still pending), do not start an overlapping request.
      // Only clear if the previous boot settled to provisional without canonical.
      const current = this.currentIdentity;
      if (current.kind === 'canonical' && current.generation === this.generation) {
        return current;
      }
      // If an anonymous request is still pending, return current provisional
      // without overlapping. The pending request will reconcile when it lands.
      // We track this via a flag set in runBoot; for simplicity, if bootPromise
      // exists and identity is still provisional of the same generation, return it.
      // Tests assert single signInAnonymously call, so never start a second here
      // unless generation changed or previous settled to failure.
      // To allow retry after failure, check lastBootError.
      if (!this.lastBootError) {
        return current;
      }
    }
    this.bootPromise = null;
    this.lastBootError = null;
    return this.boot();
  }

  private async runBoot(startGeneration: number): Promise<AuthIdentity> {
    // 1. Hydrate existing secure session first. No anonymous yet.
    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (this.generation !== startGeneration || this.disposed) {
        // Stale boot after delete/signout: ignore.
        return this.currentIdentity;
      }
      if (!error && data.session?.user) {
        this.applySupabaseSession(data.session, { preserveGeneration: true });
        // Fresh unchanged identity: coordinator dedupes; no extra work here.
        return this.currentIdentity;
      }
      if (error) {
        const message = (error as { message?: string })?.message ?? '';
        this.lastBootError = error;
        const corrupt = /corrupt/i.test(message) || /chunk/i.test(message) || /orphan/i.test(message);
        throw new AuthError(
          corrupt ? 'Saved sign-in is corrupt. Please try again.' : 'Saved sign-in could not be read. Please try again.',
          { code: corrupt ? 'STORAGE_CORRUPT' : 'STORAGE_READ_FAILED' },
        );
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      this.lastBootError = error;
      throw new AuthError('Saved sign-in could not be read. Please try again.', { code: 'STORAGE_READ_FAILED' });
    }

    // 2. Single-flight anonymous sign-in with 5s UI fallback.
    const anonymousPromise = this.supabase.auth.signInAnonymously().then(
      (result) => result,
      (error) => ({ data: { user: null, session: null }, error }),
    );

    // Race for UI fallback only; the anonymous request continues in background.
    const timeoutPromise = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), this.bootTimeoutMs));
    const winner = await Promise.race([anonymousPromise.then(() => 'done' as const), timeoutPromise]);
    if (this.generation !== startGeneration || this.disposed) {
      // Stale: ignore late result entirely (it must not restore identity).
      // Still await background to avoid unhandled rejection, but discard.
      void anonymousPromise.catch(() => undefined);
      return this.currentIdentity;
    }
    if (winner === 'timeout') {
      // Provisional UI usable now. Reconcile late success without a second request.
      this.setProvisional(startGeneration);
      void anonymousPromise.then((result) => {
        if (this.generation !== startGeneration || this.disposed) return;
        const { data, error } = result as { data: { user: SupabaseUser | null; session: SupabaseSession | null }; error: unknown };
        if (!error && data.session?.user) {
          this.applySupabaseSession(data.session, { preserveGeneration: true });
        } else {
          this.lastBootError = error ?? new Error('Anonymous sign-in failed');
          // Remain provisional with visible retry; no overlapping retry here.
          // Foreground/network retry path will call retryBoot().
        }
      }).catch(() => undefined);
      return this.currentIdentity;
    }
    // Completed within timeout.
    const result = (await anonymousPromise) as { data: { user: SupabaseUser | null; session: SupabaseSession | null }; error: unknown };
    if (this.generation !== startGeneration || this.disposed) return this.currentIdentity;
    if (result.error || !result.data.session?.user) {
      this.lastBootError = result.error ?? new Error('Anonymous sign-in failed');
      this.setProvisional(startGeneration);
      return this.currentIdentity;
    }
    this.applySupabaseSession(result.data.session, { preserveGeneration: true });
    return this.currentIdentity;
  }

  private setProvisional(generation: number): void {
    if (this.generation !== generation) return;
    this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation, ready: false };
    this.currentSession = { kind: 'anonymous' };
    this.emit();
    this.syncSessionStore();
  }

  private applySupabaseSession(supabaseSession: SupabaseSession, options?: { preserveGeneration?: boolean; ready?: boolean }): void {
    const user = supabaseSession.user;
    const generation = this.generation;
    const anonymous = isAnonymousUser(user);
    this.currentIdentity = {
      kind: 'canonical',
      userId: user.id,
      isAnonymous: anonymous,
      generation,
      ready: options?.ready ?? ((this.currentIdentity.ready && this.currentIdentity.userId === user.id) ? this.currentIdentity.ready : false),
    };
    this.currentSession = sessionFromUser(user);
    this.emit();
    this.syncSessionStore();
  }

  /** Coordinator calls this when the spine completes for the current key. */
  markReady(userId: string, generation: number): void {
    if (this.generation !== generation) return;
    if (this.currentIdentity.kind !== 'canonical' || this.currentIdentity.userId !== userId) return;
    if (this.currentIdentity.ready) return;
    this.currentIdentity = { ...this.currentIdentity, ready: true };
    this.emitIdentityOnly();
  }

  private emit(): void {
    const s = this.currentSession;
    const i = this.currentIdentity;
    for (const cb of [...this.sessionListeners]) {
      try { cb(s); } catch { /* subscriber errors must not break auth */ }
    }
    for (const cb of [...this.identityListeners]) {
      try { cb(i); } catch { /* ignore */ }
    }
  }

  private emitIdentityOnly(): void {
    const i = this.currentIdentity;
    for (const cb of [...this.identityListeners]) {
      try { cb(i); } catch { /* ignore */ }
    }
  }

  private syncSessionStore(): void {
    // Non-secret Session only. Never tokens.
    sessionStore.getState().patch({ session: this.currentSession });
  }

  private registerAuthCallback(): void {
    try {
      const { data } = this.supabase.auth.onAuthStateChange((event, session) => {
        // Deferred outside the Supabase SDK lock (see T04-architecture).
        const capturedGeneration = this.generation;
        const capturedEvent = event;
        const capturedSession = session;
        setTimeout(() => {
          if (this.disposed) return;
          if (this.generation !== capturedGeneration) return; // stale after delete/signout
          if (this.currentIdentity.kind === 'deleting') return;
          if (!capturedSession?.user) {
            if (capturedEvent === 'SIGNED_OUT') this.invalidateRevokedSession(capturedGeneration);
            return;
          }
          // Ignore duplicate USER_UPDATED for same UID without change? Still
          // apply but do not reset readiness unless UID changed.
          const nextUserId = capturedSession.user.id;
          const currentUserId = this.currentIdentity.userId;
          // Every intentional UID transition (recovery, sign-out, deletion)
          // is applied by the operation that initiated it. A later SDK event
          // for a different UID can therefore only be stale for the current
          // canonical generation and must not resurrect the prior identity.
          if (this.currentIdentity.kind === 'canonical' && currentUserId && currentUserId !== nextUserId) return;
          if (currentUserId === nextUserId && capturedEvent === 'USER_UPDATED') return;
          // TOKEN_REFRESHED/SIGNED_IN with same UID preserves readiness.
          const wasReady = this.currentIdentity.ready && currentUserId === nextUserId;
          this.applySupabaseSession(capturedSession, { preserveGeneration: true, ready: wasReady });
          if (wasReady) this.markReady(nextUserId, capturedGeneration);
        }, 0);
      });
      this.authSubscription = { unsubscribe: () => data.subscription.unsubscribe() };
    } catch {
      // onAuthStateChange registration failure is non-fatal; boot polling covers it.
    }
  }

  private invalidateRevokedSession(capturedGeneration: number): void {
    if (this.generation !== capturedGeneration || this.disposed) return;
    this.generation += 1;
    this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: this.generation, ready: false };
    this.currentSession = { kind: 'anonymous' };
    this.lastBootError = new Error('Supabase session was revoked');
    this.emit();
    this.syncSessionStore();
  }

  private beginIdentityTransition(): { identity: AuthIdentity; session: Session } {
    const previous = { identity: this.currentIdentity, session: this.currentSession };
    this.generation += 1;
    this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: this.generation, ready: false };
    this.emitIdentityOnly();
    return previous;
  }

  private restoreFailedTransition(previous: { identity: AuthIdentity; session: Session }): void {
    if (this.disposed) return;
    this.currentSession = previous.session;
    this.currentIdentity = {
      ...previous.identity,
      generation: this.generation,
      ready: false,
      kind: previous.identity.userId ? 'canonical' : 'provisional',
    };
    this.emit();
    this.syncSessionStore();
  }

  private registerForegroundRetry(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppState } = require('react-native') as typeof import('react-native');
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active' || this.disposed) return;
        // Bounded foreground retry: only when provisional and last boot failed,
        // never overlapping an in-flight anonymous request.
        if (this.currentIdentity.kind === 'provisional' && this.lastBootError) {
          void this.retryBoot().catch(() => undefined);
        }
      });
      this.appStateSubscription = { remove: () => sub.remove() };
    } catch {
      // react-native AppState unavailable in Jest; tests call retryBoot() directly.
    }
  }

  dispose(): void {
    this.disposed = true;
    this.authSubscription?.unsubscribe();
    this.authSubscription = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.sessionListeners.clear();
    this.identityListeners.clear();
  }

  // ---- Provider sign-in ----

  async signInWithApple(): Promise<Session> {
    const credential = await requestAppleCredential(this.appleDeps);
    return this.linkWithIdToken('apple', credential.identityToken, credential.rawNonce, undefined);
  }

  async recoverWithApple(): Promise<Session> {
    const previous = this.beginIdentityTransition();
    try {
      const credential = await requestAppleCredential(this.appleDeps);
      return await this.runIdentityOperation(() =>
        this.recoverWithIdToken('apple', credential.identityToken, credential.rawNonce, undefined),
      );
    } catch (error) {
      this.restoreFailedTransition(previous);
      throw error;
    }
  }

  async signInWithGoogle(): Promise<Session> {
    const credential = await requestGoogleCredential(this.googleDeps);
    return this.linkWithIdToken('google', credential.idToken, credential.accessToken ? undefined : undefined, credential.accessToken);
  }

  async recoverWithGoogle(): Promise<Session> {
    const previous = this.beginIdentityTransition();
    try {
      const credential = await requestGoogleCredential(this.googleDeps);
      return await this.runIdentityOperation(() =>
        this.recoverWithIdToken('google', credential.idToken, undefined, credential.accessToken),
      );
    } catch (error) {
      this.restoreFailedTransition(previous);
      throw error;
    }
  }

  private async linkWithIdToken(
    provider: 'apple' | 'google',
    token: string,
    nonce: string | undefined,
    accessToken: string | undefined,
  ): Promise<Session> {
    const startGeneration = this.generation;
    // Exact native ID-token linkIdentity overload (auth-js 2.116.0):
    // linkIdentity({ provider, token, nonce?, access_token? }) sends
    // link_identity:true + current JWT to /token?grant_type=id_token.
    // Never signInWithIdToken here; that would not preserve the anonymous UID.
    const { data, error } = await this.supabase.auth.linkIdentity({
      provider,
      token,
      nonce,
      access_token: accessToken,
    } as never);
    if (this.generation !== startGeneration || this.disposed) {
      throw new AuthError('Sign-in was interrupted. Please try again.', { code: 'STALE_SIGNIN' });
    }
    if (error) {
      if (isLinkConflictError(error)) {
        throw new AuthRecoveryRequiredError(provider);
      }
      throw new AuthError(provider === 'apple' ? 'Could not sign in with Apple. Please try again.' : 'Could not sign in with Google. Please try again.', {
        code: provider === 'apple' ? 'APPLE_LINK_FAILED' : 'GOOGLE_LINK_FAILED',
      });
    }
    const session = (data as { session?: SupabaseSession | null; user?: SupabaseUser | null })?.session;
    const user = (data as { user?: SupabaseUser | null })?.user ?? session?.user ?? null;
    if (!session?.user || !user) {
      throw new AuthError('Sign-in did not return a session. Please try again.', { code: 'LINK_NO_SESSION' });
    }
    // New-provider linking must keep the UID (same-UID invariant).
    const beforeId = this.currentIdentity.userId;
    if (beforeId && user.id !== beforeId) {
      // Server returned a different UID for a link call: treat as recovery
      // required, do not adopt silently.
      throw new AuthRecoveryRequiredError(provider);
    }
    this.applySupabaseSession(session, { preserveGeneration: true });
    return this.currentSession;
  }

  private async recoverWithIdToken(
    provider: 'apple' | 'google',
    token: string,
    nonce: string | undefined,
    accessToken: string | undefined,
  ): Promise<Session> {
    // Returning-account recovery: server-verified existing UID via
    // signInWithIdToken. Never accepts a caller-supplied UID.
    try {
      await this.onAccountSwitchReset();
    } catch {
      throw new AuthError('Could not prepare account recovery. Please try again.', { code: 'RECOVERY_RESET_FAILED' });
    }
    const { data, error } = await this.supabase.auth.signInWithIdToken({
      provider,
      token,
      nonce,
      access_token: accessToken,
    });
    if (this.disposed) throw new AuthError('Sign-in was interrupted. Please try again.', { code: 'STALE_SIGNIN' });
    if (error || !data.session?.user) {
      throw new AuthError('Could not recover that account. Please try again.', { code: 'RECOVERY_FAILED' });
    }
    // Preserve local rules; reset SDK identity before adopting new UID.
    // No alias, no client transfer.
    this.pendingEmail = null;
    this.pendingFlow = null;
    this.applySupabaseSession(data.session, { preserveGeneration: true });
    // New generation, new UID, not ready until coordinator spine completes.
    this.currentIdentity = { ...this.currentIdentity, ready: false };
    this.emitIdentityOnly();
    return this.currentSession;
  }

  // ---- Email ----

  async sendEmailCode(email: string): Promise<void> {
    const normalized = validateEmail(email);
    const identity = this.currentIdentity;
    if (identity.kind !== 'canonical' || !identity.userId) {
      throw new AuthError('Sign-in is not ready yet. Please try again.', { code: 'IDENTITY_NOT_READY' });
    }
    if (!identity.isAnonymous) {
      // Permanent account: returning sign-in via OTP (recovery flow kind).
      const { error } = await this.supabase.auth.signInWithOtp({ email: normalized });
      if (error) {
        throw new AuthError('Could not send a code. Please try again.', { code: 'EMAIL_SEND_FAILED' });
      }
      this.pendingEmail = normalized;
      this.pendingFlow = 'recovery';
      return;
    }
    // Anonymous conversion: updateUser({ email }) preserves the anonymous UID.
    // Never signInWithOtp here; that would not preserve the UID.
    const { error } = await this.supabase.auth.updateUser({ email: normalized });
    if (!error) {
      this.pendingEmail = normalized;
      this.pendingFlow = 'conversion';
      return;
    }
    if (isExistingAccountError(error) || isLinkConflictError(error)) {
      // Existing-account conflict: send recovery OTP, then explicit error.
      const { error: otpError } = await this.supabase.auth.signInWithOtp({ email: normalized });
      if (otpError) {
        throw new AuthError('Could not send a code. Please try again.', { code: 'EMAIL_SEND_FAILED' });
      }
      this.pendingEmail = normalized;
      this.pendingFlow = 'recovery';
      throw new AuthRecoveryRequiredError('email');
    }
    throw new AuthError('Could not send a code. Please try again.', { code: 'EMAIL_SEND_FAILED' });
  }

  async verifyEmailCode(code: string): Promise<Session> {
    const normalizedCode = validateOtpCode(code);
    const pendingEmail = this.pendingEmail;
    const pendingFlow = this.pendingFlow;
    if (!pendingEmail || !pendingFlow) {
      throw new AuthError('Please request a code first.', { code: 'OTP_NO_PENDING' });
    }
    // Validate without logging the code. normalizeEmail keeps case-insensitive match.
    const email = normalizeEmail(pendingEmail);
    if (pendingFlow === 'recovery') return this.verifyRecoveryEmail(email, normalizedCode);
    const type = 'email_change';
    const startGeneration = this.generation;
    const { data, error } = await this.supabase.auth.verifyOtp({ email, token: normalizedCode, type } as never);
    if (this.generation !== startGeneration || this.disposed) {
      throw new AuthError('Sign-in was interrupted. Please try again.', { code: 'STALE_SIGNIN' });
    }
    if (error || !data.session?.user) {
      // Keep pending for visible retry; do not clear. Token intact.
      throw new AuthError('That code did not work. Please try again.', { code: 'OTP_INVALID' });
    }
    this.pendingEmail = null;
    this.pendingFlow = null;
    this.applySupabaseSession(data.session, { preserveGeneration: true });
    return this.currentSession;
  }

  private async verifyRecoveryEmail(email: string, code: string): Promise<Session> {
    const previous = this.beginIdentityTransition();
    try {
      return await this.runIdentityOperation(async () => {
        try {
          await this.onAccountSwitchReset();
        } catch {
          throw new AuthError('Could not prepare account recovery. Please try again.', { code: 'RECOVERY_RESET_FAILED' });
        }
        const { data, error } = await this.supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        if (this.disposed) throw new AuthError('Sign-in was interrupted. Please try again.', { code: 'STALE_SIGNIN' });
        if (error || !data.session?.user) {
          throw new AuthError('That code did not work. Please try again.', { code: 'OTP_INVALID' });
        }
        this.pendingEmail = null;
        this.pendingFlow = null;
        this.applySupabaseSession(data.session, { preserveGeneration: true });
        this.currentIdentity = { ...this.currentIdentity, ready: false };
        this.emitIdentityOnly();
        return this.currentSession;
      });
    } catch (error) {
      this.restoreFailedTransition(previous);
      throw error;
    }
  }

  /** For tests/UI introspection only. Never includes the code. */
  pendingEmailFlow(): EmailFlowKind | null {
    return this.pendingFlow;
  }

  // ---- Sign out ----

  async signOut(): Promise<void> {
    const identity = this.currentIdentity;
    // Already anonymous / provisional: honest no-op (no fake new UID needed,
    // no rule clearing). Permanent sign-out below creates a NEW anonymous UID.
    if (identity.kind === 'provisional' || identity.isAnonymous) {
      return;
    }
    const previous = this.beginIdentityTransition();
    const nextGeneration = this.generation;
    try {
      await this.runIdentityOperation(async () => {
        try {
          await this.onAccountSwitchReset();
        } catch {
          throw new AuthError('Could not sign out. Please try again.', { code: 'SIGNOUT_RESET_FAILED' });
        }
        const { error } = await this.supabase.auth.signOut();
        if (this.generation !== nextGeneration || this.disposed) return;
        if (error) throw new AuthError('Could not sign out. Please try again.', { code: 'SIGNOUT_FAILED' });
        this.currentSession = { kind: 'anonymous' };
        this.syncSessionStore();
        const { data, error: anonError } = await this.supabase.auth.signInAnonymously();
        if (this.generation !== nextGeneration || this.disposed) return;
        if (anonError || !data.session?.user) {
          this.lastBootError = anonError ?? new Error('Anonymous boot failed after sign-out');
          return;
        }
        this.applySupabaseSession(data.session, { preserveGeneration: true });
      });
    } catch (error) {
      this.restoreFailedTransition(previous);
      throw error;
    }
  }

  // ---- Deletion ----

  /** 410 tombstone: invalidate local auth and boot fresh anonymous (new UID, new generation). */
  async handleTombstone(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch { /* ignore */ }
    this.generation += 1;
    const nextGeneration = this.generation;
    this.pendingEmail = null;
    this.pendingFlow = null;
    this.currentSession = { kind: 'anonymous' };
    this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: nextGeneration, ready: false };
    this.emit();
    this.syncSessionStore();
    try {
      const { data, error } = await this.supabase.auth.signInAnonymously();
      if (this.generation !== nextGeneration || this.disposed) return;
      if (!error && data.session?.user) {
        this.applySupabaseSession(data.session, { preserveGeneration: true });
      }
    } catch { /* remain provisional retry */ }
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const { data } = await this.supabase.auth.getSession();
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  async getAuthContext(): Promise<{ accessToken: string; userId: string; generation: number } | null> {
    const generation = this.generation;
    try {
      const { data, error } = await this.supabase.auth.getSession();
      const session = data.session;
      if (error || !session?.access_token || !session.user?.id) return null;
      if (this.generation !== generation || !['canonical', 'deleting'].includes(this.currentIdentity.kind)) return null;
      if (this.currentIdentity.userId !== session.user.id) return null;
      return { accessToken: session.access_token, userId: session.user.id, generation };
    } catch {
      return null;
    }
  }

  async deleteAccount(): Promise<void> {
    const identity = this.currentIdentity;
    // Provisional-only local erase: no server UID exists, no DELETE possible.
    if (identity.kind === 'provisional' || !identity.userId) {
      this.generation += 1;
      this.pendingEmail = null;
      this.pendingFlow = null;
      this.currentSession = { kind: 'anonymous' };
      this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: this.generation, ready: false };
      this.emit();
      this.syncSessionStore();
      // Never emit account_deleted under an erased person (no UID, no event).
      return;
    }
    const startGeneration = this.generation;
    const userId = identity.userId;
    // Mark deleting; retries keep auth.
    this.currentIdentity = { kind: 'deleting', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
    this.emitIdentityOnly();
    return this.runIdentityOperation(() => this.deleteCanonicalAccount(identity, startGeneration, userId));
  }

  private async deleteCanonicalAccount(identity: AuthIdentity, startGeneration: number, userId: string): Promise<void> {
    // Disable analytics/money + clear shields first, keep auth for retries.
    try {
      await this.onBeforeDelete();
    } catch {
      // Cleanup hook failure: revert to canonical with visible retry, token intact.
      if (this.generation !== startGeneration) throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
      this.currentIdentity = { kind: 'canonical', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
      this.emitIdentityOnly();
      throw new AuthError('Could not delete your account. Please try again.', { code: 'DELETE_CLEANUP_FAILED' });
    }
    if (this.generation !== startGeneration || this.disposed) {
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    }
    // Authenticated DELETE with current Bearer. Never userId from body.
    const authContext = await this.getAuthContext();
    if (this.generation !== startGeneration || this.disposed) {
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    }
    if (!authContext || authContext.userId !== userId || authContext.generation !== startGeneration) {
      if (this.generation === startGeneration) {
        this.currentIdentity = { kind: 'canonical', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
        this.emitIdentityOnly();
      }
      throw new AuthError('Could not delete your account. Please try again.', { code: 'DELETE_NO_AUTH' });
    }
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.apiBaseUrl}/v1/user`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authContext.accessToken}` },
      });
    } catch {
      // Lost-response: server may have deleted; durable worker owns completion.
      // Report pending, not false completion. Token intact for retry.
      throw new AuthPendingDeletionError();
    }
    if (this.generation !== startGeneration || this.disposed) {
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    }
    if (response.status === 204 || response.status === 410) {
      // Durable server acceptance: local cleanup/logout + fresh anonymous boot.
      // Adapty logout / PostHog reset are local cleanup, NOT vendor erasure
      // (server owns erasure). They already ran via onBeforeDelete; run switch
      // reset again best-effort before new boot.
      try {
        await this.onAccountSwitchReset();
        const { error: signOutError } = await this.supabase.auth.signOut();
        if (signOutError) throw signOutError;
      } catch {
        throw new AuthPendingDeletionError('Deletion was accepted, but local cleanup is pending. Please retry.');
      }
      this.generation += 1;
      const nextGeneration = this.generation;
      this.pendingEmail = null;
      this.pendingFlow = null;
      this.currentSession = { kind: 'anonymous' };
      this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: nextGeneration, ready: false };
      this.emit();
      this.syncSessionStore();
      // Fresh anonymous boot (new UID). Failures remain provisional retry.
      try {
        const { data, error } = await this.supabase.auth.signInAnonymously();
        if (this.generation !== nextGeneration || this.disposed) return;
        if (!error && data.session?.user) {
          this.applySupabaseSession(data.session, { preserveGeneration: true });
        } else {
          this.lastBootError = error ?? new Error('Anonymous boot failed after deletion');
        }
      } catch (error) {
        this.lastBootError = error;
      }
      // Never emit account_deleted under the erased UID.
      return;
    }
    if (response.status === 502 || response.status === 503 || response.status === 500) {
      // Not success. Revert to canonical with visible retry, token intact.
      this.currentIdentity = { kind: 'canonical', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
      this.emitIdentityOnly();
      throw new AuthError('Deletion is incomplete. Please try again.', { code: `DELETE_${response.status}` });
    }
    // Other 4xx: visible retry, token intact.
    this.currentIdentity = { kind: 'canonical', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
    this.emitIdentityOnly();
    throw new AuthError('Could not delete your account. Please try again.', { code: `DELETE_${response.status}` });
  }
}

export function isCancelled(error: unknown): boolean {
  return isAuthCancelled(error);
}
