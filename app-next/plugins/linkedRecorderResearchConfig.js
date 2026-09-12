const TRACE_FLAG = 'EXCERLOCK_LINKED_RECORDER_TRACE';
const RUNTIME_VERSION = '2-linked-recorder-1';
const URL_SCHEME = 'excerlock-linked-trace';

const production = Object.freeze({
  appGroup: 'group.com.johansardar.excerlock',
  bundleIds: Object.freeze({
    app: 'com.johansardar.excerlock',
    monitor: 'com.johansardar.excerlock.monitor',
    shield: 'com.johansardar.excerlock.shield',
    shieldaction: 'com.johansardar.excerlock.shieldaction',
    report: 'com.johansardar.excerlock.report',
  }),
});

const research = Object.freeze({
  appGroup: 'group.com.johansardar.excerlock.lab.linkedtrace',
  bundleIds: Object.freeze({
    app: 'com.johansardar.excerlock.lab.linkedtrace',
    monitor: 'com.johansardar.excerlock.lab.linkedtrace.monitor',
    shield: 'com.johansardar.excerlock.lab.linkedtrace.shield',
    shieldaction: 'com.johansardar.excerlock.lab.linkedtrace.shieldaction',
    report: 'com.johansardar.excerlock.lab.linkedtrace.report',
  }),
});

function researchEnabled(env = process.env) {
  const value = env[TRACE_FLAG];
  if (value !== undefined && value !== '1') {
    throw new Error(`${TRACE_FLAG} must be exactly 1 or unset`);
  }
  return value === '1';
}

function assertResearchBuildAllowed(env = process.env) {
  if (!researchEnabled(env)) return false;
  if (env.EAS_BUILD === 'true' || env.EAS_BUILD_PROFILE) {
    throw new Error('Linked Recorder research builds are local-only and cannot use EAS Build profiles');
  }
  if (env.EXCERLOCK_ENV !== 'dev') {
    throw new Error('Linked Recorder research builds require EXCERLOCK_ENV=dev');
  }
  return true;
}

function identifiers(env = process.env) {
  return researchEnabled(env) ? research : production;
}

function bundleIdentifier(kind, env = process.env) {
  const value = identifiers(env).bundleIds[kind];
  if (!value) throw new Error(`Unknown Linked Recorder target kind: ${String(kind)}`);
  return value;
}

function appGroupIdentifier(env = process.env) {
  return identifiers(env).appGroup;
}

function updatesConfig() {
  return {
    enabled: false,
    checkAutomatically: 'NEVER',
    fallbackToCacheTimeout: 0,
    useEmbeddedUpdate: true,
  };
}

module.exports = {
  TRACE_FLAG,
  RUNTIME_VERSION,
  URL_SCHEME,
  production,
  research,
  researchEnabled,
  assertResearchBuildAllowed,
  identifiers,
  bundleIdentifier,
  appGroupIdentifier,
  updatesConfig,
};
