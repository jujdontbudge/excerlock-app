import { AuthPort } from '../../ports/AuthPort';
import { Session } from '../../domain/types';
import { sessionStore } from '../../state/sessionStore';
import { FakeContext } from '../FakeContext';
export function AuthFake(ctx: FakeContext): AuthPort {
  let email = 'alex@example.test';
  const session = () => sessionStore.getState().data.session;
  const signIn = async (provider: 'apple' | 'google' | 'email'): Promise<Session> => {
    if (ctx.result() === 'cancel') return session();
    const next: Session = { kind: 'signedIn', provider, email };
    sessionStore.getState().patch({ session: next });
    ctx.log('signed_in', { provider });
    return next;
  };
  return {
    session,
    signInWithApple: () => signIn('apple'),
    signInWithGoogle: () => signIn('google'),
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
      sessionStore.getState().patch({ session: { kind: 'anonymous' } });
    },
    deleteAccount: async () => {
      ctx.result();
      sessionStore.getState().patch({ session: { kind: 'anonymous' } });
      ctx.log('account_deleted');
    },
    subscribe: (callback) => sessionStore.subscribe((s) => callback(s.data.session)),
  };
}
