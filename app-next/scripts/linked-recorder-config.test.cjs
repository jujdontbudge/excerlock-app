const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const linked = require('../plugins/linkedRecorderResearchConfig');

const targetModules = {
  monitor: require('../targets/DeviceActivityMonitorExtension/expo-target.config'),
  shield: require('../targets/ShieldConfiguration/expo-target.config'),
  shieldaction: require('../targets/ShieldAction/expo-target.config'),
  report: require('../targets/DeviceActivityReportExtension/expo-target.config'),
};

function withFlag(value, body) {
  const previous = process.env.EXCERLOCK_LINKED_RECORDER_TRACE;
  try {
    if (value === undefined) delete process.env.EXCERLOCK_LINKED_RECORDER_TRACE;
    else process.env.EXCERLOCK_LINKED_RECORDER_TRACE = value;
    return body();
  } finally {
    if (previous === undefined) delete process.env.EXCERLOCK_LINKED_RECORDER_TRACE;
    else process.env.EXCERLOCK_LINKED_RECORDER_TRACE = previous;
  }
}

function expoConfig(appGroup) {
  return { plugins: [['react-native-device-activity', { appGroup }]] };
}

test('one configuration owner selects every production identifier', () => withFlag(undefined, () => {
  assert.equal(linked.researchEnabled(), false);
  assert.deepEqual(linked.identifiers(), linked.production);
  for (const [kind, targetFactory] of Object.entries(targetModules)) {
    const target = targetFactory(expoConfig(linked.production.appGroup));
    assert.equal(target.bundleIdentifier, linked.production.bundleIds[kind]);
    assert.deepEqual(target.entitlements['com.apple.security.application-groups'], [linked.production.appGroup]);
    assert.deepEqual(target.swiftActiveCompilationConditions ?? [], []);
  }
}));

test('one configuration owner selects the isolated research group and all target ids', () => withFlag('1', () => {
  assert.equal(linked.researchEnabled(), true);
  assert.deepEqual(linked.identifiers(), linked.research);
  assert.notEqual(linked.research.appGroup, linked.production.appGroup);
  for (const [kind, targetFactory] of Object.entries(targetModules)) {
    const target = targetFactory(expoConfig(linked.research.appGroup));
    assert.equal(target.bundleIdentifier, linked.research.bundleIds[kind]);
    assert.deepEqual(target.entitlements['com.apple.security.application-groups'], [linked.research.appGroup]);
    if (kind === 'monitor') assert.deepEqual(target.swiftActiveCompilationConditions, ['EXCERLOCK_LINKED_RECORDER_TRACE']);
  }
}));

test('the shared opt-in parser rejects every nonempty value except exact 1', () => {
  for (const value of ['0', 'true', 'yes', ' 1']) {
    assert.throws(() => linked.researchEnabled({ EXCERLOCK_LINKED_RECORDER_TRACE: value }), /must be exactly 1 or unset/);
  }
});

test('one owner pins every identity the artifact proof and the device proof compare against', () => {
  // These are independent expectations, not a re-read of the owner: a changed
  // lab identity has to be a deliberate edit here and in the owner.
  assert.equal(linked.research.bundleIds.app, 'com.johansardar.excerlock.lab.linkedtrace');
  assert.equal(linked.research.appGroup, 'group.com.johansardar.excerlock.lab.linkedtrace');
  assert.equal(linked.production.bundleIds.app, 'com.johansardar.excerlock');
  assert.equal(linked.PRODUCTION_COMPARISON_BUNDLE_ID, linked.production.bundleIds.app);
  assert.equal(linked.WALKING_RECORDER_BUNDLE_ID, 'com.johansardar.excerlock.lab.walkingrecorder');
  assert.equal(linked.URL_SCHEME, 'excerlock-linked-trace');
  assert.equal(linked.WALKING_RECORDER_SCHEME, 'excerlock-walkingrecorder');
  assert.equal(linked.RUNTIME_VERSION, '2-linked-recorder-1');
  assert.notEqual(linked.research.appGroup, linked.production.appGroup);
  assert.notEqual(linked.WALKING_RECORDER_BUNDLE_ID, linked.research.bundleIds.app);
  assert.notEqual(linked.WALKING_RECORDER_BUNDLE_ID, linked.production.bundleIds.app);
});

test('the device proof resolves every identity from the config owner instead of a literal', () => {
  const proof = path.join(__dirname, 'prove-linked-recorder-on-phone.sh');
  const stdout = execFileSync('bash', [proof, '--print-identities'], { encoding: 'utf8' });
  assert.equal(stdout, [
    `lab=${linked.research.bundleIds.app}`,
    `production=${linked.production.bundleIds.app}`,
    `walkingRecorder=${linked.WALKING_RECORDER_BUNDLE_ID}`,
    '',
  ].join('\n'));
});
