import type { SupabaseClient, Session as SupabaseSession, User as SupabaseUser } from '@supabase/supabase-js';
import {
  AuthError,
  AuthIdentity,
  AuthPendingDeletionError,
  AuthPort,
  AuthRecoveryRequiredError,
  isAuthCancelled,
  isAuthRateLimited,
  type EmailCodeResult,
  type ExistingAccountResult,
  type SaveAccountResult,
} from '../../ports/AuthPort';
import type { Session } from '../../model/types';
import type { Unsubscribe } from '../../model/models';
import { sessionStore } from '../sessionStore';
import { requestAppleCredential, type AppleNativeDeps } from './providerApple';
import { requestGoogleCredential, type GoogleAuthDeps } from './providerGoogle';
import { emailSendError, isExistingAccountError, isLinkConflictError, validateEmail, validateOtpCode } from './emailFlow';
import type { RunIdentityOperation } from '../identityBarrier';
import { currentEmailChallenge, rememberEmailChallenge, forgetEmailChallenge } from '../emailChallenge';
import { isProtectedSessionError } from './protectedSessionStorage';

export type AuthAdapterDeps = {
  supabase: SupabaseClient;
  runSdk?: <T>(operation: () => Promise<T>) => Promise<T>;
  appleDeps: AppleNativeDeps;
  googleDeps: GoogleAuthDeps;
  apiBaseUrl: string;
  fetchImpl?: typeof fetch;
  onBeforeDelete?: () => Promise<void>;
  onAfterDelete?: () => Promise<void>;
  onAccountSwitchReset?: (options: AccountSwitch) => Promise<void>;
  bootTimeoutMs?: number;
  runIdentityOperation?: RunIdentityOperation;
  readStoredSession?: () => Promise<SupabaseSession | null>;
  waitForReady?: (options?: { timeoutMs?: number }) => Promise<AuthIdentity>;
};

export type AccountSwitch = { carryGuestData: boolean; signedOut: boolean };
type PendingExistingAccount =
  | { provider: 'apple'; token: string; nonce: string; accessToken?: undefined }
  | { provider: 'google'; token: string; nonce?: undefined; accessToken?: string }
  | { provider: 'email'; email: string };

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

const isOfflineRefreshError = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AuthRetryableFetchError';

function isAnonymousUser(user: SupabaseUser | null): boolean {
  if (!user) return true;
  return user.is_anonymous === true;
}

export class SupabaseAuthAdapter implements AuthPort {
  private supabase: SupabaseClient;
  private runSdk: <T>(operation: () => Promise<T>) => Promise<T>;
  private appleDeps: AppleNativeDeps;
  private googleDeps: GoogleAuthDeps;
  private apiBaseUrl: string;
  private fetchImpl: typeof fetch;
  private onBeforeDelete: () => Promise<void>;
  private onAfterDelete: () => Promise<void>;
  private onAccountSwitchReset: (options: AccountSwitch) => Promise<void>;
  private pendingExisting: PendingExistingAccount | null = null;
  private bootTimeoutMs: number;
  private readStoredSession: () => Promise<SupabaseSession | null>;
  private prepareIdentity: AuthAdapterDeps['waitForReady'];

  private generation = 0;
  private currentIdentity: AuthIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: 0, ready: false };
  private currentSession: Session = { kind: 'anonymous' };
  private sessionListeners = new Set<(s: Session) => void>();
  private identityListeners = new Set<(i: AuthIdentity) => void>();
  private bootPromise: Promise<AuthIdentity> | null = null;
  private lastBootError: unknown = null;
  private emailVerification: Promise<Session> | null = null;
  private authSubscription: { unsubscribe: () => void } | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private disposed = false;
  private runIdentityOperation: RunIdentityOperation;
  private expectedSignedOutGenerations = new Set<number>();
  private ownedTransitionGenerations = new Set<number>();
  private bootTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(deps: AuthAdapterDeps) {
    this.supabase = deps.supabase;
    this.runSdk = deps.runSdk ?? ((operation) => operation());
    this.appleDeps = deps.appleDeps;
    this.googleDeps = deps.googleDeps;
    this.apiBaseUrl = deps.apiBaseUrl.replace(/\/$/, '');
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.onBeforeDelete = deps.onBeforeDelete ?? (async () => undefined);
    this.onAfterDelete = deps.onAfterDelete ?? (async () => undefined);
    this.onAccountSwitchReset = deps.onAccountSwitchReset ?? (async () => undefined);
    this.bootTimeoutMs = deps.bootTimeoutMs ?? BOOT_TIMEOUT_MS;
    this.readStoredSession = deps.readStoredSession ?? (async () => null);
    this.prepareIdentity = deps.waitForReady;
    this.runIdentityOperation = deps.runIdentityOperation ?? (async (operation) => operation());
    this.registerAuthCallback();
    this.registerForegroundRetry();
  }


  session(): Session {
    return this.currentSession;
  }

  identity(): AuthIdentity {
    return this.currentIdentity;
  }

  async waitForReady(options?: { timeoutMs?: number }): Promise<AuthIdentity> {
    if (this.prepareIdentity) return this.prepareIdentity(options);
    if (this.currentIdentity.ready) return this.currentIdentity;
    throw new AuthError('Sign-in is not ready yet. Please try again.', { code: 'IDENTITY_NOT_READY' });
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


  async boot(): Promise<AuthIdentity> {
    if (this.bootPromise) return this.bootPromise;
    const startGeneration = this.generation;
    this.bootPromise = this.runBoot(startGeneration);
    try {
      return await this.bootPromise;
    } finally {
    }
  }

  async retryBoot(): Promise<AuthIdentity> {
    if (this.bootPromise) {
      const current = this.currentIdentity;
      if (current.kind === 'canonical' && current.generation === this.generation) {
        return current;
      }
      if (!this.lastBootError) {
        return current;
      }
    }
    this.bootPromise = null;
    this.lastBootError = null;
    return this.boot();
  }

  private async runBoot(startGeneration: number): Promise<AuthIdentity> {
    try {
      const { data, error } = await this.runSdk(() => this.supabase.auth.getSession());
      if (this.generation !== startGeneration || this.disposed) {
        return this.currentIdentity;
      }
      if (!error && data.session?.user) {
        this.applySupabaseSession(data.session, { preserveGeneration: true });
        return this.currentIdentity;
      }
      if (error && isOfflineRefreshError(error)) {
        const stored = await this.readStoredSession();
        if (this.generation !== startGeneration || this.disposed) return this.currentIdentity;
        if (stored?.user) {
          this.applySupabaseSession(stored, { preserveGeneration: true });
          return this.currentIdentity;
        }
      }
      if (error) {
        const message = (error as { message?: string })?.message ?? '';
        this.lastBootError = error;
        const corrupt = /corrupt/i.test(message) || /chunk/i.test(message) || /orphan/i.test(message);
        throw new AuthError(
          corrupt ? 'Saved sign-in is corrupt. Please try again.' : 'Saved sign-in could not be read. Please try again.',
          { code: isProtectedSessionError(error) ? 'STORAGE_LOCKED' : corrupt ? 'STORAGE_CORRUPT' : 'STORAGE_READ_FAILED' },
        );
      }
    } catch (error) {
      if (error instanceof AuthError) throw error;
      this.lastBootError = error;
      throw new AuthError('Saved sign-in could not be read. Please try again.', { code: isProtectedSessionError(error) ? 'STORAGE_LOCKED' : 'STORAGE_READ_FAILED' });
    }

    const anonymousPromise = this.runSdk(() => this.supabase.auth.signInAnonymously()).then(
      (result) => result,
      (error) => ({ data: { user: null, session: null }, error }),
    );

    let timeoutHandle: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeoutHandle = setTimeout(() => {
        this.bootTimers.delete(timeoutHandle);
        resolve('timeout');
      }, this.bootTimeoutMs);
      this.bootTimers.add(timeoutHandle);
    });
    const winner = await Promise.race([anonymousPromise.then(() => 'done' as const), timeoutPromise]);
    if (winner === 'done') {
      clearTimeout(timeoutHandle!);
      this.bootTimers.delete(timeoutHandle!);
    }
    if (this.generation !== startGeneration || this.disposed) {
      void anonymousPromise.catch(() => undefined);
      return this.currentIdentity;
    }
    if (winner === 'timeout') {
      this.setProvisional(startGeneration);
      void anonymousPromise.then((result) => {
        if (this.generation !== startGeneration || this.disposed) return;
        const { data, error } = result as { data: { user: SupabaseUser | null; session: SupabaseSession | null }; error: unknown };
        if (!error && data.session?.user) {
          this.applySupabaseSession(data.session, { preserveGeneration: true });
        } else {
          this.lastBootError = error ?? new Error('Anonymous sign-in failed');
        }
      }).catch(() => undefined);
      return this.currentIdentity;
    }
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
      try { cb(s); } catch {}
    }
    for (const cb of [...this.identityListeners]) {
      try { cb(i); } catch {}
    }
  }

  private emitIdentityOnly(): void {
    const i = this.currentIdentity;
    for (const cb of [...this.identityListeners]) {
      try { cb(i); } catch {}
    }
  }

  private syncSessionStore(): void {
    sessionStore.getState().patch({ session: this.currentSession });
  }

  private registerAuthCallback(): void {
    try {
      const { data } = this.supabase.auth.onAuthStateChange((event, session) => {
        const capturedGeneration = this.generation;
        const capturedEvent = event;
        const capturedSession = session;
        setTimeout(() => {
          if (this.disposed) return;
          if (this.generation !== capturedGeneration) return;
          if (this.ownedTransitionGenerations.has(capturedGeneration)) return;
          if (this.currentIdentity.kind === 'deleting') return;
          if (!capturedSession?.user) {
            if (capturedEvent === 'SIGNED_OUT' && this.expectedSignedOutGenerations.delete(capturedGeneration)) return;
            if (capturedEvent === 'SIGNED_OUT') this.invalidateRevokedSession(capturedGeneration);
            return;
          }
          const nextUserId = capturedSession.user.id;
          const currentUserId = this.currentIdentity.userId;
          if (this.currentIdentity.kind === 'canonical' && currentUserId && currentUserId !== nextUserId) return;
          if (currentUserId === nextUserId && capturedEvent === 'USER_UPDATED') return;
          const wasReady = this.currentIdentity.ready && currentUserId === nextUserId;
          this.applySupabaseSession(capturedSession, { preserveGeneration: true, ready: wasReady });
          if (wasReady) this.markReady(nextUserId, capturedGeneration);
        }, 0);
      });
      this.authSubscription = { unsubscribe: () => data.subscription.unsubscribe() };
    } catch {
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

  private beginIdentityTransition(): { identity: AuthIdentity; session: Session; operationGeneration: number } {
    const previous = { identity: this.currentIdentity, session: this.currentSession };
    this.generation += 1;
    this.ownedTransitionGenerations.add(this.generation);
    this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: this.generation, ready: false };
    this.emitIdentityOnly();
    return { ...previous, operationGeneration: this.generation };
  }

  private restoreFailedTransition(previous: { identity: AuthIdentity; session: Session; operationGeneration: number }): void {
    if (this.disposed || this.generation !== previous.operationGeneration || this.currentIdentity.kind !== 'provisional') return;
    this.ownedTransitionGenerations.delete(previous.operationGeneration);
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

  private assertTransition(generation: number): void {
    if (this.disposed || this.generation !== generation || this.currentIdentity.kind !== 'provisional') {
      throw new AuthError('Sign-in was interrupted. Please try again.', { code: 'STALE_SIGNIN' });
    }
  }

  private captureCanonicalIdentity(): { userId: string; generation: number } {
    if (this.disposed) throw new AuthError('Sign-in was interrupted. Please try again.', { code: 'STALE_SIGNIN' });
    const identity = this.currentIdentity;
    if (identity.kind !== 'canonical' || !identity.userId) {
      throw new AuthError('Sign-in is not ready yet. Please try again.', { code: 'IDENTITY_NOT_READY' });
    }
    return { userId: identity.userId, generation: identity.generation };
  }

  private assertCanonicalIdentity(expected: { userId: string; generation: number }): void {
    const identity = this.currentIdentity;
    if (identity.kind !== 'canonical' || identity.userId !== expected.userId || identity.generation !== expected.generation) {
      throw new AuthError('Sign-in was interrupted. Please try again.', { code: 'STALE_SIGNIN' });
    }
  }

  private registerForegroundRetry(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so the module stays out of the startup path
      const { AppState } = require('react-native') as typeof import('react-native');
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active' || this.disposed) return;
        if (this.currentIdentity.kind === 'provisional' && this.lastBootError) {
          void this.retryBoot().catch(() => undefined);
        }
      });
      this.appStateSubscription = { remove: () => sub.remove() };
    } catch {
    }
  }

  beginDispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.authSubscription?.unsubscribe();
    this.authSubscription = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.sessionListeners.clear();
    this.identityListeners.clear();
    for (const timer of this.bootTimers) clearTimeout(timer);
    this.bootTimers.clear();
  }

  dispose(): void { this.beginDispose(); }


  saveWithApple(): Promise<SaveAccountResult> {
    return this.saveWithProvider('apple');
  }

  saveWithGoogle(): Promise<SaveAccountResult> {
    return this.saveWithProvider('google');
  }

  private async saveWithProvider(provider: 'apple' | 'google'): Promise<SaveAccountResult> {
    const expected = this.captureCanonicalIdentity();
    let pending: PendingExistingAccount;
    try {
      if (provider === 'apple') {
        const credential = await requestAppleCredential(this.appleDeps);
        pending = { provider, token: credential.identityToken, nonce: credential.rawNonce };
      } else {
        const credential = await requestGoogleCredential(this.googleDeps);
        pending = { provider, token: credential.idToken, accessToken: credential.accessToken };
      }
    } catch (error) {
      if (isAuthCancelled(error)) return 'cancelled';
      throw error;
    }
    this.assertCanonicalIdentity(expected);
    return this.runIdentityOperation(async () => {
      this.assertCanonicalIdentity(expected);
      try {
        await this.linkWithIdToken(pending.provider, pending.token, pending.nonce, pending.accessToken, expected);
        this.pendingExisting = null;
        return 'saved';
      } catch (error) {
        if (!(error instanceof AuthRecoveryRequiredError)) throw error;
        this.pendingExisting = pending;
        return 'existing-account';
      }
    });
  }

  async useExistingAccount(): Promise<ExistingAccountResult> {
    const pending = this.pendingExisting;
    if (!pending) throw new AuthError('Choose how to sign in first.', { code: 'NO_EXISTING_ACCOUNT' });
    const expected = this.captureCanonicalIdentity();
    return this.runIdentityOperation(async () => {
      this.assertCanonicalIdentity(expected);
      if (pending.provider === 'email') {
        const { error } = await this.runSdk(() => this.supabase.auth.signInWithOtp({
          email: pending.email, options: { shouldCreateUser: false },
        }));
        this.assertCanonicalIdentity(expected);
        const failure = error ? emailSendError(error) : null;
        if (failure && !isAuthRateLimited(failure)) throw failure;
        await rememberEmailChallenge(pending.email, expected.userId, 'signIn', isAuthRateLimited(failure) ? failure.retryAfterSeconds : 60);
        this.pendingExisting = null;
        if (failure) throw failure;
        return 'code-sent';
      }
      await this.authenticateSession(() => this.runSdk(() => this.supabase.auth.signInWithIdToken({
        provider: pending.provider, token: pending.token, nonce: pending.nonce, access_token: pending.accessToken,
      })), 'REAUTH_FAILED');
      this.pendingExisting = null;
      return 'switched';
    });
  }

  private async authenticateSession(
    authenticate: () => Promise<{ data: { session: SupabaseSession | null }; error: unknown }>,
    failureCode: string,
  ): Promise<Session> {
    const { data: saved, error: savedError } = await this.runSdk(() => this.supabase.auth.getSession());
    if (savedError || !saved.session || saved.session.user.id !== this.captureCanonicalIdentity().userId)
      throw new AuthError('Saved sign-in is unavailable. Please try again.', { code: 'REAUTH_NO_SESSION' });
    const previous = this.beginIdentityTransition();
    let authenticated = false;
    try {
      const { data, error } = await authenticate();
      this.assertTransition(previous.operationGeneration);
      if (error || !data.session?.user || data.session.user.is_anonymous)
        throw new AuthError('Could not verify your sign-in. Please try again.', { code: failureCode });
      authenticated = true;
      if (data.session.user.id !== previous.identity.userId)
        await this.onAccountSwitchReset({ carryGuestData: previous.identity.isAnonymous, signedOut: false });
      this.assertTransition(previous.operationGeneration);
      await forgetEmailChallenge();
      this.applySupabaseSession(data.session, { preserveGeneration: true, ready: false });
      this.ownedTransitionGenerations.delete(previous.operationGeneration);
      return this.currentSession;
    } catch (error) {
      if (authenticated && this.generation === previous.operationGeneration && !this.disposed) {
        const restored = await this.runSdk(() => this.supabase.auth.setSession({
          access_token: saved.session!.access_token, refresh_token: saved.session!.refresh_token,
        }));
        if (restored.error) {
          this.ownedTransitionGenerations.delete(previous.operationGeneration);
          this.setProvisional(previous.operationGeneration);
          throw new AuthError('Could not restore your saved sign-in. Please try again.', { code: 'REAUTH_RESTORE_FAILED' });
        }
      }
      this.restoreFailedTransition(previous);
      throw error;
    }
  }

  private async linkWithIdToken(
    provider: 'apple' | 'google',
    token: string,
    nonce: string | undefined,
    accessToken: string | undefined,
    expected: { userId: string; generation: number },
  ): Promise<Session> {
    this.assertCanonicalIdentity(expected);
    const { data, error } = await this.runSdk(() => this.supabase.auth.linkIdentity({
      provider,
      token,
      nonce,
      access_token: accessToken,
    } as never));
    this.assertCanonicalIdentity(expected);
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
    if (user.id !== expected.userId) {
      throw new AuthRecoveryRequiredError(provider);
    }
    this.applySupabaseSession(session, { preserveGeneration: true });
    return this.currentSession;
  }

  async sendEmailCode(email: string): Promise<EmailCodeResult> {
    const normalized = validateEmail(email);
    const expected = this.captureCanonicalIdentity();
    return this.runIdentityOperation(async () => {
      this.assertCanonicalIdentity(expected);
      const saving = this.currentIdentity.isAnonymous;
      const { error } = saving
        ? await this.runSdk(() => this.supabase.auth.updateUser({ email: normalized }))
        : await this.runSdk(() => this.supabase.auth.signInWithOtp({ email: normalized, options: { shouldCreateUser: false } }));
      this.assertCanonicalIdentity(expected);
      if (saving && error && isExistingAccountError(error)) {
        this.pendingExisting = { provider: 'email', email: normalized };
        return 'existing-account';
      }
      const failure = error ? emailSendError(error) : null;
      if (failure && !isAuthRateLimited(failure)) throw failure;
      await rememberEmailChallenge(normalized, expected.userId, saving ? 'save' : 'signIn', isAuthRateLimited(failure) ? failure.retryAfterSeconds : 60);
      if (failure) throw failure;
      return 'sent';
    });
  }

  confirmEmailCode(code: string): Promise<Session> {
    if (this.emailVerification) return this.emailVerification;
    const run = this.verifyPendingEmail(code);
    this.emailVerification = run;
    void run.finally(() => { if (this.emailVerification === run) this.emailVerification = null; }).catch(() => undefined);
    return run;
  }

  private async verifyPendingEmail(code: string): Promise<Session> {
    const normalizedCode = validateOtpCode(code);
    const expected = this.captureCanonicalIdentity();
    const challenge = currentEmailChallenge(expected.userId);
    if (!challenge) throw new AuthError('Please request a code first.', { code: 'OTP_NO_PENDING' });
    return this.runIdentityOperation(async () => {
      this.assertCanonicalIdentity(expected);
      if (currentEmailChallenge(expected.userId) !== challenge)
        throw new AuthError('Please use the latest code.', { code: 'OTP_NO_PENDING' });
      if (challenge.kind !== 'save')
        return this.authenticateSession(() => this.runSdk(() => this.supabase.auth.verifyOtp({
          email: challenge.email, token: normalizedCode, type: 'email',
        })), 'OTP_INVALID');
      const { error } = await this.runSdk(() => this.supabase.auth.verifyOtp({
        email: challenge.email, token: normalizedCode, type: 'email_change',
      }));
      this.assertCanonicalIdentity(expected);
      if (error) throw new AuthError("That code didn't work. Please try again.", { code: 'OTP_INVALID' });
      const { data, error: refreshError } = await this.runSdk(() => this.supabase.auth.refreshSession());
      this.assertCanonicalIdentity(expected);
      if (refreshError || !data.session?.user || data.session.user.id !== expected.userId)
        throw new AuthError('Could not finish saving your account. Please try again.', { code: 'EMAIL_SAVE_REFRESH_FAILED' });
      await forgetEmailChallenge();
      this.applySupabaseSession(data.session, { preserveGeneration: true });
      return this.currentSession;
    });
  }

  async signOut(): Promise<void> {
    const identity = this.currentIdentity;
    if (identity.kind === 'provisional' || identity.isAnonymous) {
      return;
    }
    await forgetEmailChallenge();
    const previous = this.beginIdentityTransition();
    const nextGeneration = this.generation;
    try {
      await this.runIdentityOperation(async () => {
        try {
          await this.onAccountSwitchReset({ carryGuestData: false, signedOut: true });
        } catch {
          throw new AuthError('Could not sign out. Please try again.', { code: 'SIGNOUT_RESET_FAILED' });
        }
        this.assertTransition(nextGeneration);
        this.expectedSignedOutGenerations.add(nextGeneration);
        const { error } = await this.runSdk(() => this.supabase.auth.signOut({ scope: 'local' }));
        if (this.generation !== nextGeneration || this.disposed) return;
        if (error) throw new AuthError('Could not sign out. Please try again.', { code: 'SIGNOUT_FAILED' });
        this.currentSession = { kind: 'anonymous' };
        this.syncSessionStore();
        const { data, error: anonError } = await this.runSdk(() => this.supabase.auth.signInAnonymously());
        if (this.generation !== nextGeneration || this.disposed) return;
        if (anonError || !data.session?.user) {
          this.lastBootError = anonError ?? new Error('Anonymous boot failed after sign-out');
          this.ownedTransitionGenerations.delete(nextGeneration);
          return;
        }
        this.applySupabaseSession(data.session, { preserveGeneration: true });
        this.ownedTransitionGenerations.delete(nextGeneration);
      });
    } catch (error) {
      this.restoreFailedTransition(previous);
      throw error;
    }
  }


  async handleTombstone(): Promise<void> {
    const identity = this.currentIdentity;
    if (identity.kind !== 'canonical' || !identity.userId) return;
    const generation = identity.generation;
    const stillDeleting = () =>
      !this.disposed &&
      this.generation === generation &&
      this.currentIdentity.kind === 'deleting' &&
      this.currentIdentity.userId === identity.userId;
    this.currentIdentity = { ...identity, kind: 'deleting', ready: false };
    this.emitIdentityOnly();
    try {
      await this.onBeforeDelete();
      if (!stillDeleting()) throw new Error('stale tombstone cleanup');
      await this.onAfterDelete();
      if (!stillDeleting()) throw new Error('stale tombstone cleanup');
      await forgetEmailChallenge();
      await this.onAccountSwitchReset({ carryGuestData: false, signedOut: true });
      if (!stillDeleting()) throw new Error('stale tombstone cleanup');
      this.expectedSignedOutGenerations.add(generation);
      const { error } = await this.runSdk(() => this.supabase.auth.signOut());
      if (!stillDeleting()) throw new Error('stale tombstone cleanup');
      if (error) throw error;
    } catch {
      if (this.generation === generation && this.currentIdentity.kind === 'deleting') {
        this.currentIdentity = { ...identity, ready: false };
        this.emitIdentityOnly();
      }
      throw new AuthError('Deleted account cleanup is pending. Please try again.', { code: 'TOMBSTONE_CLEANUP_FAILED' });
    }
    this.generation += 1;
    const nextGeneration = this.generation;
    this.currentSession = { kind: 'anonymous' };
    this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: nextGeneration, ready: false };
    this.emit();
    this.syncSessionStore();
    try {
      const { data, error } = await this.runSdk(() => this.supabase.auth.signInAnonymously());
      if (this.generation !== nextGeneration || this.disposed) return;
      if (!error && data.session?.user) {
        this.applySupabaseSession(data.session, { preserveGeneration: true });
      }
    } catch {}
  }

  async getAccessToken(): Promise<string | null> {
    try {
      const { data } = await this.runSdk(() => this.supabase.auth.getSession());
      return data.session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  async getAuthContext(): Promise<{ accessToken: string; userId: string; generation: number } | null> {
    const generation = this.generation;
    try {
      const { data, error } = await this.runSdk(() => this.supabase.auth.getSession());
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
    if (identity.kind === 'provisional' || !identity.userId) {
      return this.runIdentityOperation(() => this.deleteProvisionalAccount(identity));
    }
    const startGeneration = this.generation;
    const userId = identity.userId;
    this.currentIdentity = { kind: 'deleting', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
    this.emitIdentityOnly();
    return this.runIdentityOperation(() => this.deleteCanonicalAccount(identity, startGeneration, userId));
  }

  private async deleteCanonicalAccount(identity: AuthIdentity, startGeneration: number, userId: string): Promise<void> {
    try {
      await this.onBeforeDelete();
    } catch {
      if (this.generation !== startGeneration) throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
      this.currentIdentity = { kind: 'canonical', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
      this.emitIdentityOnly();
      throw new AuthError('Could not delete your account. Please try again.', { code: 'DELETE_CLEANUP_FAILED' });
    }
    if (this.generation !== startGeneration || this.disposed) {
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    }
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
      throw new AuthPendingDeletionError();
    }
    if (this.generation !== startGeneration || this.disposed) {
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    }
    if (response.status === 204 || response.status === 410) {
      try {
        await this.onAfterDelete();
        if (this.generation !== startGeneration || this.disposed) throw new Error('stale deletion cleanup');
        await forgetEmailChallenge();
        await this.onAccountSwitchReset({ carryGuestData: false, signedOut: true });
        this.expectedSignedOutGenerations.add(startGeneration);
        const { error: signOutError } = await this.runSdk(() => this.supabase.auth.signOut());
        if (signOutError) throw signOutError;
      } catch {
        throw new AuthPendingDeletionError('Deletion was accepted, but local cleanup is pending. Please retry.');
      }
      this.generation += 1;
      const nextGeneration = this.generation;
      this.currentSession = { kind: 'anonymous' };
      this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: nextGeneration, ready: false };
      this.emit();
      this.syncSessionStore();
      try {
        const { data, error } = await this.runSdk(() => this.supabase.auth.signInAnonymously());
        if (this.generation !== nextGeneration || this.disposed) return;
        if (!error && data.session?.user) {
          this.applySupabaseSession(data.session, { preserveGeneration: true });
        } else {
          this.lastBootError = error ?? new Error('Anonymous boot failed after deletion');
        }
      } catch (error) {
        this.lastBootError = error;
      }
      return;
    }
    if (response.status === 502 || response.status === 503 || response.status === 500) {
      this.currentIdentity = { kind: 'canonical', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
      this.emitIdentityOnly();
      throw new AuthError('Deletion is incomplete. Please try again.', { code: `DELETE_${response.status}` });
    }
    this.currentIdentity = { kind: 'canonical', userId, isAnonymous: identity.isAnonymous, generation: startGeneration, ready: false };
    this.emitIdentityOnly();
    throw new AuthError('Could not delete your account. Please try again.', { code: `DELETE_${response.status}` });
  }

  private async deleteProvisionalAccount(identity: AuthIdentity): Promise<void> {
    if (this.disposed || this.generation !== identity.generation || this.currentIdentity.kind !== 'provisional')
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    await this.onBeforeDelete();
    if (this.disposed || this.generation !== identity.generation || this.currentIdentity.kind !== 'provisional')
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    await this.onAfterDelete();
    if (this.disposed || this.generation !== identity.generation || this.currentIdentity.kind !== 'provisional')
      throw new AuthError('Deletion was interrupted. Please try again.', { code: 'STALE_DELETE' });
    await forgetEmailChallenge();
    this.generation += 1;
    this.currentSession = { kind: 'anonymous' };
    this.currentIdentity = { kind: 'provisional', userId: null, isAnonymous: true, generation: this.generation, ready: false };
    this.emit();
    this.syncSessionStore();
  }
}

export function isCancelled(error: unknown): boolean {
  return isAuthCancelled(error);
}
