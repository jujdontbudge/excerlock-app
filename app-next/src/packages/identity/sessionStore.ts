import { Session } from '../model/types';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
export const sessionStore = createPersistedStore<{ session: Session }>(
  'session',
  { session: { kind: 'anonymous' } },
  { session: (value) => v.session(value) || v.signedIn(value) },
);
