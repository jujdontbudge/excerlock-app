import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';

type EmailChallenge = { email: string; userId: string; resendAt: number; expiresAt: number };
export const emailChallengeStore = createPersistedStore<{ challenge: EmailChallenge | null }>(
  'email-challenge',
  { challenge: null },
  { challenge: v.nullable(v.shape({ email: v.text, userId: v.text, resendAt: v.number(), expiresAt: v.number() })) },
);

export function currentEmailChallenge(userId: string | null) {
  const challenge = emailChallengeStore.getState().data.challenge;
  return challenge?.userId === userId && challenge.expiresAt > Date.now() ? challenge : null;
}

export async function rememberEmailChallenge(email: string, userId: string, resendSeconds = 60) {
  emailChallengeStore.getState().patch({ challenge: {
    email, userId, resendAt: Date.now() + resendSeconds * 1000, expiresAt: Date.now() + 60 * 60 * 1000,
  } });
  await emailChallengeStore.persistBarrier();
}

export async function forgetEmailChallenge() {
  emailChallengeStore.getState().patch({ challenge: null });
  await emailChallengeStore.persistBarrier();
}
