import type { ExpoConfig } from 'expo/config';

export const LINKED_RECORDER_TRACE_FLAG = 'EXCERLOCK_LINKED_RECORDER_TRACE';
export const LINKED_RECORDER_RUNTIME = '2-linked-recorder-1';
export const LINKED_RECORDER_SCHEME = 'excerlock-linked-trace';
export const LINKED_RECORDER_BUNDLE_IDS = {
  app: 'com.johansardar.excerlock.lab.linkedtrace',
  monitor: 'com.johansardar.excerlock.lab.linkedtrace.monitor',
  shield: 'com.johansardar.excerlock.lab.linkedtrace.shield',
  shieldaction: 'com.johansardar.excerlock.lab.linkedtrace.shieldaction',
  report: 'com.johansardar.excerlock.lab.linkedtrace.report',
} as const;

export function linkedRecorderResearchEnabled(env: Readonly<Record<string, string | undefined>>): boolean {
  const value = env[LINKED_RECORDER_TRACE_FLAG];
  if (value !== undefined && value !== '1') throw new Error(`${LINKED_RECORDER_TRACE_FLAG} must be exactly 1 or unset`);
  if (value !== '1') return false;
  if (env.EAS_BUILD === 'true' || env.EAS_BUILD_PROFILE) {
    throw new Error('Linked Recorder research builds are local-only and cannot use EAS Build profiles');
  }
  if (env.EXCERLOCK_ENV !== 'dev') {
    throw new Error('Linked Recorder research builds require EXCERLOCK_ENV=dev');
  }
  return true;
}

export function linkedRecorderUpdatesConfig(): NonNullable<ExpoConfig['updates']> {
  return {
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
    useEmbeddedUpdate: true,
  };
}
