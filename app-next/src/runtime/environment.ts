export type RuntimeEnvironment = 'dev' | 'preview' | 'prod' | 'lab';

export function runtimeMode(environment: unknown, development: boolean): 'fake' | 'real' {
  if (environment === 'lab') return 'real';
  if (environment === 'preview' || environment === 'prod') return 'real';
  if ((environment === 'dev' || environment == null) && development) return 'fake';
  throw new Error('Missing or invalid runtime environment for a release build');
}
