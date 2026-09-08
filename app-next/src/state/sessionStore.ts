import { Session } from '../domain/types';
import { createPersistedStore } from './createPersistedStore';
import * as v from './validation';
export const sessionStore = createPersistedStore<{ session: Session }>(
  'session',
  { session: { kind: 'anonymous', userId: 'local-anonymous-user' } },
  { session: (value) => v.session(value) || v.signedIn(value) },
);
