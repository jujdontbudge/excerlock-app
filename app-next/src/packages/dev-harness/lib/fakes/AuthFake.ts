import { AuthCancelledError, AuthIdentity, AuthPort, AuthRateLimitedError, SaveAccountResult } from '../../../ports/AuthPort';
import { Session } from '../../../model/types';
import { sessionStore } from '../../../identity/sessionStore';
import { entitlementStore } from '../../../subscription/entitlementStore';
import { onboardingStore } from '../../../onboarding/onboardingStore';
import { FakeContext } from '../FakeContext';

type Provider = 'apple' | 'google' | 'email';
const EXISTING_USER = 'fake-existing-user';

export function AuthFake(ctx: FakeContext): AuthPort {
  let email = 'alex@example.test';
  let generation = 0;
  let userId = `fake-user-${generation}`;
  let pending: Provider | null = null;
  let codeKind: 'save' | 'signIn' = 'save';
  let lastSend: { email: string; at: number } | null = null;
  const listeners = new Set<(identity: AuthIdentity) => void>();
  const session = () => sessionStore.getState().data.session;
  const identity = (): AuthIdentity => ({
    kind: 'canonical', userId, isAnonymous: session().kind !== 'signedIn', generation, ready: true,
  });
  const emitIdentity = () => {
    const snapshot = identity();
    listeners.forEach((callback) => callback(snapshot));
  };
  const existing = (provider: Provider) =>
    provider === 'email' ? /^existing/i.test(email) : ctx.scenario.existingAccount === provider;
  const signedIn = (provider: Provider): Session => {
    const next: Session = { kind: 'signedIn', provider, email };
    sessionStore.getState().patch({ session: next });
    emitIdentity();
    return next;
  };
  const save = async (provider: 'apple' | 'google'): Promise<SaveAccountResult> => {
    if (ctx.result() === 'cancel') throw new AuthCancelledError();
    if (existing(provider)) {
      pending = provider;
      ctx.log('account_exists', { provider });
      return 'existing-account';
    }
    signedIn(provider);
    ctx.log('account_saved', { provider, userId });
    return 'saved';
  };
  const switchTo = (provider: Provider) => {
    generation += 1;
    userId = EXISTING_USER;
    pending = null;
    const next = signedIn(provider);
    ctx.log('account_switched', { provider, userId });
    return next;
  };
  const reset = () => {
    entitlementStore.getState().reset();
    onboardingStore.getState().reset();
    generation += 1;
    userId = `fake-user-${generation}`;
    pending = null;
    sessionStore.getState().patch({ session: { kind: 'anonymous' } });
    emitIdentity();
  };
  return {
    session,
    identity,
    waitForReady: async () => identity(),
    saveWithApple: () => save('apple'),
    saveWithGoogle: () => save('google'),
    sendEmailCode: async (value) => {
      ctx.result();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email');
      const waited = lastSend?.email === value ? (Date.now() - lastSend.at) / 1000 : Infinity;
      if (waited < 60) throw new AuthRateLimitedError(Math.ceil(60 - waited));
      email = value;
      if (session().kind !== 'signedIn' && existing('email')) {
        pending = 'email';
        ctx.log('account_exists', { provider: 'email' });
        return 'existing-account';
      }
      lastSend = { email: value, at: Date.now() };
      codeKind = session().kind === 'signedIn' ? 'signIn' : 'save';
      ctx.log('email_code_sent', { kind: codeKind });
      return 'sent';
    },
    confirmEmailCode: async (code) => {
      if (code !== '123456') throw new Error('Invalid code');
      if (codeKind === 'signIn') return switchTo('email');
      ctx.log('account_saved', { provider: 'email', userId });
      return signedIn('email');
    },
    useExistingAccount: async () => {
      if (!pending) throw new Error('No existing account to use');
      if (pending === 'email') {
        lastSend = { email, at: Date.now() };
        codeKind = 'signIn';
        pending = null;
        ctx.log('email_code_sent', { kind: codeKind });
        return 'code-sent';
      }
      switchTo(pending);
      return 'switched';
    },
    signOut: async () => {
      ctx.result();
      reset();
    },
    deleteAccount: async () => {
      ctx.result();
      reset();
    },
    boot: async () => identity(),
    dispose: () => {
      listeners.clear();
    },
    subscribe: (callback) => sessionStore.subscribe((s) => callback(s.data.session)),
    subscribeIdentity: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    waitForCanonicalIdentity: async () => identity(),
  };
}
