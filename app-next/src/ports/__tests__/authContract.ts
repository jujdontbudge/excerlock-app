import { AuthPort } from '../AuthPort';
import { Session } from '../../domain/types';

/**
 * The `AuthPort` contract. The fake and the Supabase adapter both run it, so the identity spine
 * behaves identically on a scenario load and against a real project: one user id from first launch,
 * a provider linked onto that same id, and a brand-new anonymous id after every account exit.
 */
export type AuthSubject = {
  port: AuthPort;
  /** The one-time code the subject accepts; every other code must be rejected. */
  code: string;
  dispose: () => void;
};

export function describeAuthPort(make: () => Promise<AuthSubject>) {
  describe('AuthPort contract', () => {
    let subject: AuthSubject;
    let port: AuthPort;
    beforeEach(async () => {
      subject = await make();
      port = subject.port;
    });
    afterEach(() => subject.dispose());

    const signInByEmail = async (): Promise<Session> => {
      await port.sendEmailCode('alex@example.test');
      return port.verifyEmailCode(subject.code);
    };

    test('an anonymous session carries a user id before anyone signs in', () => {
      expect(port.session()).toMatchObject({ kind: 'anonymous', userId: expect.any(String) });
      expect(port.session().userId.length).toBeGreaterThan(0);
    });

    test('signing in with Apple keeps the anonymous user id', async () => {
      const anonymousId = port.session().userId;
      await expect(port.signInWithApple()).resolves.toMatchObject({
        kind: 'signedIn',
        userId: anonymousId,
        provider: 'apple',
      });
      expect(port.session()).toMatchObject({ kind: 'signedIn', userId: anonymousId });
    });

    test('signing in with Google keeps the anonymous user id', async () => {
      const anonymousId = port.session().userId;
      await expect(port.signInWithGoogle()).resolves.toMatchObject({
        kind: 'signedIn',
        userId: anonymousId,
        provider: 'google',
      });
    });

    test('an emailed code signs in on the same user id', async () => {
      const anonymousId = port.session().userId;
      await expect(signInByEmail()).resolves.toMatchObject({
        kind: 'signedIn',
        userId: anonymousId,
        provider: 'email',
        email: 'alex@example.test',
      });
    });

    test('a malformed address never sends a code', async () => {
      await expect(port.sendEmailCode('alex@example')).rejects.toThrow();
      expect(port.session()).toMatchObject({ kind: 'anonymous' });
    });

    test('a wrong code leaves the session anonymous', async () => {
      await port.sendEmailCode('alex@example.test');
      await expect(port.verifyEmailCode('000000')).rejects.toThrow();
      expect(port.session()).toMatchObject({ kind: 'anonymous' });
    });

    test('signing out starts a new anonymous session', async () => {
      const signedIn = await port.signInWithApple();
      await port.signOut();
      expect(port.session()).toMatchObject({ kind: 'anonymous' });
      expect(port.session().userId).not.toBe(signedIn.userId);
    });

    test('deleting the account starts a new anonymous session', async () => {
      const signedIn = await port.signInWithApple();
      await port.deleteAccount();
      expect(port.session()).toMatchObject({ kind: 'anonymous' });
      expect(port.session().userId).not.toBe(signedIn.userId);
    });

    test('subscribers hear every session change until they unsubscribe', async () => {
      const heard: Session[] = [];
      const stop = port.subscribe((session) => heard.push(session));
      await port.signInWithApple();
      expect(heard.at(-1)).toMatchObject({ kind: 'signedIn' });
      stop();
      await port.signOut();
      expect(heard.filter((session) => session.kind === 'anonymous')).toHaveLength(0);
    });
  });
}
