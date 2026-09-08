import { existsSync } from 'fs';
import { join } from 'path';

/**
 * The whole of `src/adapters/pending/` is a stand-in for P2-T15. This test is the tripwire: the
 * moment the real engine is on the branch, the copies are stale and must go.
 */
test('src/adapters/pending is deleted once P2-T15 lands', () => {
  const src = join(__dirname, '..', '..', '..');
  const landed = [
    'domain/sessions/walkingSession.ts',
    'domain/gymDwell.ts',
    'ports/__tests__/walkingContract.ts',
  ].filter((file) => existsSync(join(src, file)));

  expect({
    landed,
    todo: landed.length === 0 ? [] : ['read src/adapters/pending/README.md and delete that directory'],
  }).toEqual({ landed: [], todo: [] });
});
