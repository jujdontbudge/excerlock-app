const { test } = require('node:test');
const assert = require('node:assert/strict');
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
