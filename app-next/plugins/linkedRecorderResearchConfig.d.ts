export type LinkedRecorderIdentifiers = {
  readonly appGroup: string;
  readonly bundleIds: Readonly<Record<'app' | 'monitor' | 'shield' | 'shieldaction' | 'report', string>>;
};

export const TRACE_FLAG: string;
export const RUNTIME_VERSION: string;
export const URL_SCHEME: string;
export const production: LinkedRecorderIdentifiers;
export const research: LinkedRecorderIdentifiers;
export function researchEnabled(env?: Readonly<Record<string, string | undefined>>): boolean;
export function assertResearchBuildAllowed(env?: Readonly<Record<string, string | undefined>>): boolean;
export function identifiers(env?: Readonly<Record<string, string | undefined>>): LinkedRecorderIdentifiers;
export function bundleIdentifier(kind: keyof LinkedRecorderIdentifiers['bundleIds'], env?: Readonly<Record<string, string | undefined>>): string;
export function appGroupIdentifier(env?: Readonly<Record<string, string | undefined>>): string;
export function updatesConfig(): {
  enabled: false;
  checkAutomatically: 'NEVER';
  fallbackToCacheTimeout: 0;
  useEmbeddedUpdate: true;
};
