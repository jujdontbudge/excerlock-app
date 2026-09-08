import { base } from './base';
export const scenario18 = base('signed-in-apple', 'Signed in with Apple', {
  session: { kind: 'signedIn', userId: 'fake-signed-in-user', provider: 'apple', email: 'alex@example.test' },
});
