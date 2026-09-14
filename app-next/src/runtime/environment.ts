export type RuntimeEnvironment = 'dev' | 'preview' | 'prod' | 'lab';

/** Preview/release configuration wins over bundler flags. Unknown releases fail closed. */
export function runtimeMode(environment: unknown, development: boolean): 'fake' | 'real' {
  // Standalone Trace Lab research builds are Release artifacts with an embedded
  // JS bundle. They always boot the real native graph: no Metro manifest, no
  // demo/fake services, no dev server in any configuration.
  if (environment === 'lab') return 'real';
  if (environment === 'preview' || environment === 'prod') return 'real';
  if ((environment === 'dev' || environment == null) && development) return 'fake';
  throw new Error('Missing or invalid runtime environment for a release build');
}
