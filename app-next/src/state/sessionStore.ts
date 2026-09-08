import { Session } from '../domain/types';
import { defineStore } from './createPersistedStore';
import * as v from './validation';
export const sessionStore = defineStore<{ session: Session }>({
  name: 'session',
  initial: { session: { kind: 'anonymous' } },
  schemaVersion: 1,
  migrations: { 0: (raw) => raw },
  validators: { session: (value) => v.session(value) || v.signedIn(value) },
});
