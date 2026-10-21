import { AuthCancelledError, AuthIdentity, AuthNoAccountError, AuthPort, AuthRateLimitedError } from '../../../ports/AuthPort';
import { Session } from '../../../model/types';
import { sessionStore } from '../../../identity/sessionStore';
import { FakeContext } from '../FakeContext';

export function AuthFake(ctx: FakeContext): AuthPort {
  let email = 'alex@example.test';
  let generation = 0;
  let lastSend: { email: string; at: number } | null = null;
  const listeners = new Set<(identity: AuthIdentity) => void>();
  const session = () => sessionStore.getState().data.session;
  const identity = (): AuthIdentity => {
    const current = session();
    if (current.kind === 'signedIn') {
      return { kind: 'canonical', userId: `fake-user-${generation}`, isAnonymous: false, generation, ready: true };
    }
    return { kind: 'provisional', userId: null, isAnonymous: true, generation, ready: false };
  };
  const emitIdentity = () => {
    const snapshot = identity();
    listeners.forEach((callback) => callback(snapshot));
  };
  const signIn = async (provider: 'apple' | 'google' | 'email'): Promise<Session> => {
    if (ctx.result() === 'cancel') throw new AuthCancelledError();
    const next: Session = { kind: 'signedIn', provider, email };
    sessionStore.getState().patch({ session: next });
    emitIdentity();
    ctx.log('signed_in', { provider });
    return next;
  };
  return {
    session,
    identity,
    waitForReady: async () => identity(),
    signInWithApple: () => signIn('apple'),
    signInWithGoogle: () => signIn('google'),
    linkWithApple: () => signIn('apple'),
    linkWithGoogle: () => signIn('google'),
    recoverWithApple: () => signIn('apple'),
    recoverWithGoogle: () => signIn('google'),
    sendEmailCode: async (value, options) => {
      ctx.result();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email');
      if (options?.existingAccountOnly && /^new/i.test(value)) throw new AuthNoAccountError();
      const waited = lastSend?.email === value ? (Date.now() - lastSend.at) / 1000 : Infinity;
      if (waited < 60) throw new AuthRateLimitedError(Math.ceil(60 - waited));
      lastSend = { email: value, at: Date.now() };
      email = value;
      ctx.log('email_code_sent');
    },
    verifyEmailCode: async (code) => {
      if (code !== '123456') throw new Error('Invalid code');
      return signIn('email');
    },
    recoverWithEmailCode: async (code) => {
      if (code !== '123456') throw new Error('Invalid code');
      return signIn('email');
    },
    signOut: async () => {
      ctx.result();
      generation += 1;
      sessionStore.getState().patch({ session: { kind: 'anonymous' } });
      emitIdentity();
    },
    deleteAccount: async () => {
      ctx.result();
      generation += 1;
      sessionStore.getState().patch({ session: { kind: 'anonymous' } });
      emitIdentity();
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
    waitForCanonicalIdentity: async (options) => {
      const timeoutMs = options?.timeoutMs ?? 5000;
      const startGeneration = generation;
      const current = identity();
      if (current.kind === 'canonical' && current.userId) return current;
      return new Promise<AuthIdentity>((resolve, reject) => {
        const timer = setTimeout(() => {
          stop();
          reject(new Error(`Canonical identity not available within ${timeoutMs}ms`));
        }, timeoutMs);
        const stop = sessionStore.subscribe(() => {
          if (generation !== startGeneration) {
            clearTimeout(timer);
            stop();
            reject(new Error('Identity generation changed while waiting'));
            return;
          }
          const next = identity();
          if (next.kind === 'canonical' && next.userId) {
            clearTimeout(timer);
            stop();
            resolve(next);
          }
        });
      });
    },
  };
}
