export type LinkedRecorderIdentifiers = {
  readonly appGroup: string;
  readonly bundleIds: Readonly<Record<'app' | 'monitor' | 'shield' | 'shieldaction' | 'report', string>>;
};

export const TRACE_FLAG: string;
export const RUNTIME_VERSION: string;
export const URL_SCHEME: string;
export const WALKING_RECORDER_SCHEME: string;
export const WALKING_RECORDER_LINK_HOSTS: {
  readonly linkedSession: string;
  readonly shareArchive: string;
};
export const STANDALONE_ENV: string;
export const RESEARCH_ENVS: readonly string[];
export const DEV_CLIENT_MODULES: readonly string[];
export const production: LinkedRecorderIdentifiers;
export const research: LinkedRecorderIdentifiers;
export function researchEnabled(env?: Readonly<Record<string, string | undefined>>): boolean;
export function standaloneEnabled(env?: Readonly<Record<string, string | undefined>>): boolean;
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
