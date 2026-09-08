import { Session } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
/**
 * The user id every anonymous session carries. It is a device-local placeholder, not an identity:
 * the analytics adapter treats it as "not yet identified" so PostHog keeps its own anonymous
 * distinct id and can merge it into the Supabase id at sign-in.
 */
export const ANONYMOUS_USER_ID = 'local-anonymous-user';
export const sessionStore = defineStore<{ session: Session }>({
  name: 'session',
  initial: { session: { kind: 'anonymous', userId: ANONYMOUS_USER_ID } },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { session: (value) => v.session(value) || v.signedIn(value) },
});
