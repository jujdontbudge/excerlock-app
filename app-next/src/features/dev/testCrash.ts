/** The message the crash carries, so it is recognisable in Sentry's issue list. */
export const TEST_CRASH_MESSAGE = 'ExcerLock developer-menu test crash';

/**
 * Throws where nothing can catch it.
 *
 * A throw inside the press handler would be swallowed by React's event delegation and reported as a
 * handled error, which proves nothing: the point of this control is to check that an *unhandled*
 * error reaches Sentry from a release build with source maps uploaded. Deferring it to a timer takes
 * it out of every boundary the app has, so it lands on the global handler the same way a real crash
 * does.
 */
export function throwTestCrash(): void {
  setTimeout(() => {
    throw new Error(TEST_CRASH_MESSAGE);
  }, 0);
}
