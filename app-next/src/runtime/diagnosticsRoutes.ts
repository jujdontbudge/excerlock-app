/**
 * The `/diagnostics/*` routes exist so the e2e harness (a preview Release build)
 * and a dev client can prove the native surface from JS. A `prod` binary — the
 * TestFlight / App Store artifact — never routes them; a lab bundle has its own
 * research screen.
 */
export function diagnosticsRoutesEnabled(environment: unknown, development: boolean): boolean {
  if (environment === 'prod') return false;
  if (environment === 'preview') return true;
  return development && (environment === 'dev' || environment == null);
}
