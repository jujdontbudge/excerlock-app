export function diagnosticsRoutesEnabled(environment: unknown, development: boolean): boolean {
  if (environment === 'prod') return false;
  if (environment === 'preview') return true;
  return development && (environment === 'dev' || environment == null);
}
