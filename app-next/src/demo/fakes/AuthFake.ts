import { AuthIdentity, AuthPort } from '../../ports/AuthPort';
import { Session } from '../../domain/types';
import { sessionStore } from '../../state/sessionStore';
import { FakeContext } from '../FakeContext';

/**
 * Local-only AuthPort for demos/tests. Keeps the non-secret Session shape in
 * sessionStore; never stores tokens (there are none locally). Identity is
 * derived deterministically from the Session so UI and coordinator gates can
 * be exercised without a network.
 *
 * Cancellation preserves the Phase 1 contract (return current session) so
 * existing demo tests keep passing; the real Supabase adapter throws
 * AuthCancelledError instead. SignInScreen handles both. Failures throw.
 * Deletion is provisional-only local erase (no server UID exists locally)
 * and never emits account_deleted under an erased person.
 */
export function AuthFake(ctx: FakeContext): AuthPort {
  let email = 'alex@example.test';
  let generation = 0;
  const listeners = new Set<(identity: AuthIdentity) => void>();
  const session = () => sessionStore.getState().data.session;
  const identity = (): AuthIdentity => {
    const current = session();
    if (current.kind === 'signedIn') {
      // Fake canonical UID is stable per generation for deterministic tests.
      return { kind: 'canonical', userId: `fake-user-${generation}`, isAnonymous: false, generation, ready: true };
    }
    return { kind: 'provisional', userId: null, isAnonymous: true, generation, ready: false };
  };
  const emitIdentity = () => {
    const snapshot = identity();
    listeners.forEach((callback) => callback(snapshot));
  };
  const signIn = async (provider: 'apple' | 'google' | 'email'): Promise<Session> => {
    if (ctx.result() === 'cancel') return session();
    const next: Session = { kind: 'signedIn', provider, email };
    sessionStore.getState().patch({ session: next });
    emitIdentity();
    ctx.log('signed_in', { provider });
    return next;
  };
  return {
    session,
    identity,
    signInWithApple: () => signIn('apple'),
    signInWithGoogle: () => signIn('google'),
    recoverWithApple: () => signIn('apple'),
    recoverWithGoogle: () => signIn('google'),
    sendEmailCode: async (value) => {
      ctx.result();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error('Invalid email');
      email = value;
      ctx.log('email_code_sent');
    },
    verifyEmailCode: async (code) => {
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
      // Provisional-only local erase: no server UID exists, no DELETE, no
      // account_deleted event under an erased person. Local rules/stores stay.
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
