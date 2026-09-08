/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { parseLog, ms } = require('./device-run-log');
const { SCENARIOS, scenarioForFile } = require('./device-run-scenarios');
const { verifyFile, formatReport } = require('./verify-device-run');

const SCRIPT = path.join(__dirname, 'verify-device-run.js');
const T0 = Date.parse('2026-09-08T09:00:00.000-04:00');
const S = 1000;
const M = 60 * S;
const H = 60 * M;
const iso = (offset) => new Date(T0 + offset).toISOString();

/** Builds a tab-separated log from `[offsetMs, event, data]` rows, the shape DiagnosticsLog.toText() writes. */
function log(rows) {
  return rows.map(([offset, event, data = {}]) => `${T0 + offset}\t${event}\t${JSON.stringify(data)}`).join('\n');
}
function run(scenarioId, rows) {
  return SCENARIOS.find((s) => s.id === scenarioId).check(parseLog(log(rows)).entries);
}
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'verify-device-run-'));
}

test('parses tab-separated and JSON Lines entries, sorts by time and reports malformed lines', () => {
  const text = [
    `${T0 + 5000}\tapp.state\t{"state":"active"}`,
    `{"atMs":${T0},"event":"app.launch","data":{"build":"abc"}}`,
    'this is not a log line',
    `${T0 + 1000}\tnav.route\tnot json`,
    '',
    `${T0 + 2000}\tplain.event`,
  ].join('\n');
  const { entries, malformed } = parseLog(text);
  assert.deepEqual(entries.map((e) => e.event), ['app.launch', 'plain.event', 'app.state']);
  assert.deepEqual(entries[0].data, { build: 'abc' });
  assert.deepEqual(entries[1].data, {});
  assert.deepEqual(malformed, [3, 4]);
});

test('instants may be ISO strings or epoch milliseconds', () => {
  assert.equal(ms('2026-09-08T13:00:00.000Z'), Date.parse('2026-09-08T13:00:00.000Z'));
  assert.equal(ms(1234), 1234);
  assert.equal(ms('1234'), 1234);
  assert.ok(Number.isNaN(ms('later')));
  assert.ok(Number.isNaN(ms(undefined)));
});

test('a log file named after a scenario selects it, with or without a suffix', () => {
  assert.equal(scenarioForFile('walking-lease-expiry.log').id, 'walking-lease-expiry');
  assert.equal(scenarioForFile('walking-lease-expiry-second-try.txt').id, 'walking-lease-expiry');
  assert.equal(scenarioForFile('sign-in-apple.jsonl').id, 'sign-in-apple');
  assert.equal(scenarioForFile('whole-day.log'), null);
});

test('every scenario has a unique id, a row reference and skips on an empty log', () => {
  const ids = new Set(SCENARIOS.map((s) => s.id));
  assert.equal(ids.size, SCENARIOS.length);
  for (const scenario of SCENARIOS) {
    assert.ok(scenario.rows.length > 0, `${scenario.id} names its acceptance row`);
    const outcome = scenario.check([]);
    assert.equal(outcome.status, 'skip', `${scenario.id} on an empty log`);
    assert.match(outcome.lines[0], /^no evidence: /);
  }
});

const PLAN_9_TO_12 = { name: 'lw-a1', start: iso(2 * M), end: iso(3 * H) };

const PASSING = {
  'fresh-install-onboarding': [
    [0, 'app.launch', { build: 'f1', iosVersion: '26.4', device: 'iPhone 17 Pro' }],
    [1 * S, 'auth.session', { kind: 'anonymous', userId: 'u1' }],
    [2 * M, 'subscription.purchase', { placement: 'onboarding', productId: 'com.johansardar.excerlock.premium.a.annual', result: 'purchased' }],
    [2 * M + 3 * S, 'entitlement.status', { status: 'trial', renewsAt: iso(7 * 24 * H), source: 'adapty' }],
    [3 * M, 'permission.status', { name: 'screenTime', status: 'granted' }],
    [4 * M, 'screentime.selection', { appCount: 2, categoryCount: 0, hasHandle: true }],
    [5 * M, 'permission.status', { name: 'motion', status: 'granted' }],
  ],
  'shield-at-window-start-app-killed': [
    [0, 'app.launch', {}],
    [10 * S, 'enforcement.plan', { shields: 'apply', monitors: [PLAN_9_TO_12], ruleCount: 1, planHash: 'p1' }],
    [11 * S, 'enforcement.apply', { decision: 'beforeWindow', applied: true, shields: 'down', monitors: 1, planHash: 'p1' }],
    [20 * S, 'app.state', { state: 'background' }],
    [5 * M, 'app.launch', {}],
    [5 * M + 1 * S, 'extension.event', { kind: 'intervalDidStart', name: 'lw-a1', at: iso(2 * M + 4 * S) }],
    [5 * M + 1 * S, 'extension.shieldAction', { action: 'primary', cause: 'lockWindow', at: iso(4 * M + 50 * S) }],
    [5 * M + 2 * S, 'enforcement.apply', { decision: 'locked', applied: true, shields: 'up', monitors: 1, planHash: 'p1' }],
    [5 * M + 3 * S, 'nav.route', { route: '/locked-apps' }],
  ],
  'step-goal-met-unlocks': [
    [0, 'app.launch', {}],
    [30 * M, 'progress.met', { ruleId: 'r1', ruleName: 'Morning steps', day: '2026-09-08', metAt: iso(30 * M) }],
    [30 * M + 1 * S, 'screentime.facts', { unlockUntil: iso(24 * H), leaseUntil: null, entitled: true, planHash: 'p1' }],
    [30 * M + 2 * S, 'enforcement.apply', { decision: 'unlockedMet', applied: true, shields: 'down', monitors: 1 }],
    [40 * M, 'app.launch', {}],
    [40 * M + 1 * S, 'enforcement.apply', { decision: 'unlockedMet', applied: true, shields: 'down', monitors: 1 }],
  ],
  'deny-screen-time': [
    [0, 'app.launch', {}],
    [1 * M, 'permission.status', { name: 'screenTime', status: 'denied' }],
    [1 * M + 1 * S, 'enforcement.apply', { decision: 'locked', applied: false, shields: 'up', monitors: 0, reason: 'screenTimeDenied' }],
    [2 * M, 'permission.openSettings', { name: 'screenTime' }],
  ],
  'deny-motion': [
    [0, 'app.launch', {}],
    [1 * M, 'permission.status', { name: 'motion', status: 'denied' }],
    [2 * M, 'permission.openSettings', { name: 'motion' }],
  ],
  'walking-lease-expiry': [
    [0, 'app.launch', {}],
    [1 * M, 'walking.session', { sessionId: 's1', phase: 'verifying', placement: 'handheld' }],
    [1 * M + 8 * S, 'walking.session', { sessionId: 's1', phase: 'walking', placement: 'handheld', leaseUntil: iso(16 * M + 8 * S) }],
    [1 * M + 9 * S, 'enforcement.apply', { decision: 'unlockedWalking', applied: true, shields: 'down', monitors: 2 }],
    [1 * M + 9 * S, 'notification', { id: 'excerlock.walk-lease-warning', event: 'scheduled', fireAt: iso(15 * M + 38 * S) }],
    [3 * M, 'walking.session', { sessionId: 's1', phase: 'grace', placement: 'handheld', leaseUntil: iso(16 * M + 8 * S) }],
    [15 * M + 40 * S, 'notification', { id: 'excerlock.walk-lease-warning', event: 'delivered', fireAt: iso(15 * M + 38 * S) }],
    [16 * M + 9 * S, 'walking.lease', { sessionId: 's1', event: 'lapsed', leaseUntil: iso(16 * M + 8 * S) }],
    [16 * M + 10 * S, 'enforcement.apply', { decision: 'locked', applied: true, shields: 'up', monitors: 1 }],
  ],
  'walking-lease-renewal-hour': [
    [0, 'walking.session', { sessionId: 's2', phase: 'walking', placement: 'handheld', leaseUntil: iso(15 * M) }],
    [1 * S, 'enforcement.apply', { decision: 'unlockedWalking', shields: 'down', applied: true, monitors: 2 }],
    ...Array.from({ length: 13 }, (_, i) => [(i + 1) * 5 * M, 'walking.lease', { sessionId: 's2', event: 'renewed', leaseUntil: iso((i + 1) * 5 * M + 15 * M) }]),
  ],
  'treadmill-propped-scan': [
    [0, 'permission.status', { name: 'camera', status: 'granted' }],
    [5 * S, 'placement', { placement: 'propped' }],
    [10 * S, 'gait.scan', { result: 'verified', durationMs: 3400, placement: 'propped' }],
    [11 * S, 'walking.session', { sessionId: 's3', phase: 'walking', placement: 'propped', leaseUntil: iso(15 * M + 10 * S) }],
    [12 * S, 'enforcement.apply', { decision: 'unlockedWalking', shields: 'down', applied: true, monitors: 2 }],
  ],
  'treadmill-duration-rule': [
    [0, 'gait.scan', { result: 'verified', durationMs: 3000, placement: 'propped' }],
    [1 * S, 'walking.session', { sessionId: 's4', phase: 'walking', placement: 'propped', leaseUntil: iso(15 * M) }],
    [5 * M, 'progress.applied', { ruleId: 'r2', activity: 'walking', value: 5, goal: 20, met: false, source: 'walking' }],
    [14 * M + 31 * S, 'notification', { id: 'excerlock.walk-lease-warning', event: 'delivered', fireAt: iso(14 * M + 30 * S) }],
    [14 * M + 45 * S, 'gait.scan', { result: 'verified', durationMs: 2800, placement: 'propped' }],
    [14 * M + 46 * S, 'walking.lease', { sessionId: 's4', event: 'renewed', leaseUntil: iso(29 * M + 45 * S) }],
    [20 * M + 5 * S, 'progress.applied', { ruleId: 'r2', activity: 'walking', value: 20, goal: 20, met: true, source: 'walking' }],
    [20 * M + 5 * S, 'progress.met', { ruleId: 'r2', ruleName: 'Treadmill 20', day: '2026-09-08', metAt: iso(20 * M + 5 * S) }],
  ],
  'treadmill-framing-expired': [
    [0, 'gait.scan', { result: 'framingExpired', durationMs: 30000, placement: 'propped' }],
    [10 * S, 'gait.scan', { result: 'verified', durationMs: 3000, placement: 'propped' }],
  ],
  'gym-manual-checkin': [
    [0, 'gym.visit', { id: 'v1', placeId: 'g1', event: 'opened', source: 'manual', enteredAt: iso(0) }],
    [31 * S, 'gym.arrival', { placeId: 'g1', confirmedAt: iso(31 * S), visitId: 'v1' }],
    [31 * S, 'progress.met', { ruleId: 'r3', ruleName: 'Gym', day: '2026-09-08', metAt: iso(0) }],
    [32 * S, 'enforcement.apply', { decision: 'unlockedMet', shields: 'down', applied: true, monitors: 1 }],
  ],
  'gym-arrival-app-killed': [
    [0, 'app.launch', {}],
    [1 * S, 'gym.geofence', { event: 'enter', regionId: 'g1', at: iso(-8 * M), background: true }],
    [1 * S, 'gym.visit', { id: 'v2', placeId: 'g1', event: 'claimed', source: 'geofence', enteredAt: iso(-8 * M) }],
    [5 * S, 'nav.route', { route: '/unlock/gym' }],
    [36 * S, 'gym.arrival', { placeId: 'g1', confirmedAt: iso(36 * S), visitId: 'v2' }],
    [37 * S, 'enforcement.apply', { decision: 'unlockedProvisional', shields: 'down', applied: true, monitors: 1 }],
  ],
  'gym-dwell-hour-app-killed': [
    [0, 'app.launch', {}],
    [1 * S, 'gym.visit', { id: 'v3', placeId: 'g1', event: 'closed', source: 'geofence', enteredAt: iso(-70 * M), exitedAt: iso(-8 * M) }],
    [2 * S, 'progress.applied', { ruleId: 'r4', activity: 'gym', value: 62, goal: 45, met: true, source: 'gym' }],
  ],
  'running-from-health': [
    [0, 'health.workouts', { activity: 'running', count: 1, minutes: 31, distanceKm: 5.2, excludedManual: 1 }],
    [1 * S, 'progress.applied', { ruleId: 'r5', activity: 'running', value: 5.2, goal: 5, met: true, source: 'health' }],
  ],
  'trial-reminder': [
    [0, 'permission.status', { name: 'notifications', status: 'granted' }],
    [1 * S, 'entitlement.status', { status: 'trial', renewsAt: iso(7 * 24 * H), source: 'adapty' }],
    [2 * S, 'notification', { id: 'excerlock.trial-reminder', event: 'scheduled', fireAt: iso(5 * 24 * H + 5 * H) }],
  ],
  'sentry-test-crash': [
    [0, 'app.launch', {}],
    [1 * M, 'sentry.testCrash', {}],
    [2 * M, 'app.launch', {}],
  ],
  'posthog-session-events': [
    [0, 'analytics.event', { name: 'onboarding_screen_viewed' }],
    [1 * S, 'analytics.event', { name: 'rule_met' }],
  ],
  'sign-in-apple': [
    [0, 'auth.session', { kind: 'anonymous', userId: 'u9' }],
    [1 * M, 'auth.link', { provider: 'apple', result: 'linked', userId: 'u9' }],
    [1 * M + 1 * S, 'auth.session', { kind: 'signedIn', provider: 'apple', userId: 'u9' }],
    [1 * M + 2 * S, 'sync.pull', { rules: 0 }],
  ],
  'sign-in-google': [
    [0, 'auth.session', { kind: 'anonymous', userId: 'u9' }],
    [1 * M, 'auth.link', { provider: 'google', result: 'linked', userId: 'u9' }],
    [1 * M + 1 * S, 'auth.session', { kind: 'signedIn', provider: 'google', userId: 'u9' }],
  ],
  'sign-in-email': [
    [0, 'auth.session', { kind: 'anonymous', userId: 'u9' }],
    [1 * M, 'auth.link', { provider: 'email', result: 'linked', userId: 'u9' }],
    [1 * M + 1 * S, 'auth.session', { kind: 'signedIn', provider: 'email', userId: 'u9' }],
  ],
  'restore-after-reinstall': [
    [0, 'auth.session', { kind: 'signedIn', provider: 'apple', userId: 'u9' }],
    [1 * S, 'sync.pull', { rules: 3, ruleDays: 4, history: 12, earnedUnlocks: 1 }],
    [2 * S, 'screentime.selection', { appCount: 0, categoryCount: 0, hasHandle: false }],
    [3 * S, 'enforcement.apply', { decision: 'locked', applied: false, shields: 'up', monitors: 0, reason: 'noSelection' }],
  ],
  'usage-monitor': [
    [0, 'usage.threshold', { day: '2026-09-08', minutes: 5 }],
    [5 * M, 'usage.threshold', { day: '2026-09-08', minutes: 10 }],
    [24 * H, 'usage.day', { day: '2026-09-08', minutes: 10 }],
  ],
  'overlapping-windows-app-killed': [
    [0, 'app.launch', {}],
    [1 * S, 'enforcement.plan', { shields: 'apply', monitors: [{ name: 'lw-b2', start: iso(2 * M), end: iso(4 * H) }], ruleCount: 2, planHash: 'p2' }],
    [10 * M, 'app.launch', {}],
    [10 * M + 1 * S, 'enforcement.apply', { decision: 'locked', applied: true, shields: 'up', monitors: 1, planHash: 'p2' }],
    [10 * M + 1 * S, 'extension.event', { kind: 'intervalDidStart', name: 'lw-b2', at: iso(2 * M) }],
  ],
  'five-daily-rules-budget': [
    [0, 'enforcement.plan', { shields: 'apply', monitors: Array.from({ length: 14 }, (_, i) => ({ name: `lw-${i}`, start: iso(i * 12 * H), end: iso(i * 12 * H + 2 * H) })), ruleCount: 5, planHash: 'p5', truncatedAt: null, horizonEnd: iso(8 * 24 * H) }],
    [1 * S, 'enforcement.apply', { decision: 'beforeWindow', applied: true, shields: 'down', monitors: 14, planHash: 'p5' }],
  ],
  'sandbox-lapse-clears-shields': [
    [0, 'app.launch', {}],
    [1 * M, 'entitlement.status', { status: 'expired', renewsAt: null, source: 'adapty' }],
    [1 * M + 1 * S, 'enforcement.apply', { decision: 'locked', applied: true, shields: 'down', monitors: 0 }],
    [1 * M + 2 * S, 'paywall.presented', { placement: 'in_app', dismissible: true }],
    [2 * M, 'nav.route', { route: '/settings' }],
    [3 * M, 'nav.route', { route: '/unlock/treadmill' }],
  ],
  'sandbox-restore': [
    [0, 'entitlement.status', { status: 'expired', source: 'adapty' }],
    [1 * M, 'subscription.restore', { result: 'restored' }],
    [1 * M + 1 * S, 'entitlement.status', { status: 'active', renewsAt: iso(30 * 24 * H), source: 'adapty' }],
  ],
  'clock-rewind-keeps-lock': [
    [0, 'watermark.rewind', { observed: iso(-1 * H), watermark: iso(0), effective: iso(0) }],
    [1 * S, 'enforcement.apply', { decision: 'locked', applied: true, shields: 'up', monitors: 1 }],
  ],
  'lockwindow-subtitle-and-tap-through': [
    [0, 'shield.content', { revision: 3, byMonitor: { 'lw-a1': { cause: 'lockWindow', subtitle: 'Blocking has started. Walk 3,000 steps to open your apps.' }, base: { cause: 'locked', subtitle: 'Walk 3,000 steps to open your apps.' } } }],
    [5 * M, 'extension.shieldAction', { action: 'primary', cause: 'lockWindow', at: iso(4 * M + 58 * S) }],
    [5 * M + 1 * S, 'notification', { id: 'excerlock.shield.open', event: 'opened', route: '/locked-apps' }],
    [5 * M + 2 * S, 'nav.route', { route: '/home' }],
  ],
  'merged-30-minute-interval': [
    [0, 'enforcement.plan', { shields: 'apply', monitors: [{ name: 'lw-30', start: iso(2 * M), end: iso(32 * M) }], ruleCount: 2, planHash: 'p30' }],
    [40 * M, 'extension.event', { kind: 'intervalDidStart', name: 'lw-30', at: iso(2 * M + 3 * S) }],
    [40 * M, 'extension.event', { kind: 'intervalDidEnd', name: 'lw-30', at: iso(32 * M + 2 * S) }],
    [40 * M + 1 * S, 'enforcement.apply', { decision: 'afterWindow', applied: true, shields: 'down', monitors: 0 }],
  ],
  'shield-refresh-cadence': [
    [0, 'shield.content', { revision: 1, byMonitor: {} }],
    [10 * M, 'shield.content', { revision: 2, byMonitor: {} }],
    [20 * M, 'extension.shieldRead', { revision: 1, at: iso(45 * S) }],
    [20 * M, 'extension.shieldRead', { revision: 2, at: iso(10 * M + 12 * S) }],
  ],
};

test('every scenario has a passing fixture and passes on it', () => {
  for (const scenario of SCENARIOS) {
    const rows = PASSING[scenario.id];
    assert.ok(rows, `${scenario.id} has a passing fixture`);
    const outcome = scenario.check(parseLog(log(rows)).entries);
    assert.equal(outcome.status, 'pass', `${scenario.id}: ${outcome.lines.join(' | ')}`);
  }
});

test('the shield-at-window-start scenario fails when the app was never killed or the extension never fired', () => {
  const noKill = PASSING['shield-at-window-start-app-killed'].filter(([, event]) => event !== 'app.launch').concat([[0, 'app.launch', {}]]);
  const outcome = run('shield-at-window-start-app-killed', noKill);
  assert.equal(outcome.status, 'fail');
  assert.ok(outcome.lines.some((l) => l.includes('never killed')));
  const noExtension = PASSING['shield-at-window-start-app-killed'].filter(([, event]) => event !== 'extension.event');
  assert.ok(run('shield-at-window-start-app-killed', noExtension).lines.some((l) => l.startsWith('FAILED: no extension.event intervalDidStart')));
});

test('the walking-lease-expiry scenario fails when the warning is late or the shields never return', () => {
  const late = PASSING['walking-lease-expiry'].map(([offset, event, data]) =>
    event === 'notification' && data.event === 'delivered' ? [16 * M, event, { ...data, fireAt: iso(16 * M) }] : [offset, event, data],
  );
  const outcome = run('walking-lease-expiry', late);
  assert.equal(outcome.status, 'fail');
  assert.ok(outcome.lines.some((l) => /warning arrived 8\.0 s before expiry/.test(l)));
  const noReshield = PASSING['walking-lease-expiry'].filter(([, event, data]) => !(event === 'enforcement.apply' && data.shields === 'up'));
  assert.ok(run('walking-lease-expiry', noReshield).lines.some((l) => l.includes('no shields-up apply')));
});

test('the renewal-hour scenario fails on a short span or a wide gap', () => {
  const short = PASSING['walking-lease-renewal-hour'].slice(0, 6);
  assert.ok(run('walking-lease-renewal-hour', short).lines.some((l) => /only spans/.test(l)));
  const gap = PASSING['walking-lease-renewal-hour'].filter(([offset]) => offset !== 30 * M && offset !== 35 * M && offset !== 40 * M);
  assert.ok(run('walking-lease-renewal-hour', gap).lines.some((l) => /exceeds the 15-minute lease/.test(l)));
});

test('the gym scenarios fail when the confirmation is instant or the dwell is short-changed', () => {
  const instant = PASSING['gym-manual-checkin'].map(([offset, event, data]) => (event === 'gym.arrival' ? [2 * S, event, { ...data, confirmedAt: iso(2 * S) }] : [offset, event, data]));
  assert.ok(run('gym-manual-checkin', instant).lines.some((l) => /confirmation took 2\.0 s/.test(l)));
  const shortChanged = PASSING['gym-dwell-hour-app-killed'].map(([offset, event, data]) => (event === 'progress.applied' ? [offset, event, { ...data, value: 20 }] : [offset, event, data]));
  const outcome = run('gym-dwell-hour-app-killed', shortChanged);
  assert.equal(outcome.status, 'fail');
  assert.ok(outcome.lines.some((l) => /credited 20; expected at least 60 minutes/.test(l)));
});

test('the sandbox lapse must clear in the same run, and a restore that finds nothing must not downgrade', () => {
  const nextRun = PASSING['sandbox-lapse-clears-shields'].map(([offset, event, data]) => (event === 'enforcement.apply' ? [offset, event, data] : [offset, event, data]));
  nextRun.splice(2, 0, [1 * M + 500, 'app.launch', {}]);
  assert.ok(run('sandbox-lapse-clears-shields', nextRun).lines.some((l) => /same run as the lapse/.test(l)));
  const downgrade = [
    [0, 'entitlement.status', { status: 'active', source: 'adapty' }],
    [1 * M, 'subscription.restore', { result: 'notFound' }],
    [1 * M + 1 * S, 'entitlement.status', { status: 'none', source: 'adapty' }],
  ];
  const outcome = run('sandbox-restore', downgrade);
  assert.equal(outcome.status, 'fail');
  assert.ok(outcome.lines.some((l) => /downgraded active to none/.test(l)));
});

test('the monitor budget, the rewind and the 30-minute interval fail on the obvious violations', () => {
  const overBudget = PASSING['five-daily-rules-budget'].map(([offset, event, data]) => (event === 'enforcement.plan' ? [offset, event, { ...data, monitors: Array.from({ length: 17 }, (_, i) => ({ name: `m${i}`, start: iso(i * H), end: iso(i * H + M) })) }] : [offset, event, data]));
  assert.ok(run('five-daily-rules-budget', overBudget).lines.some((l) => /17 monitors exceed the budget of 16/.test(l)));
  const unlockedAfterRewind = PASSING['clock-rewind-keeps-lock'].concat([[2 * S, 'enforcement.apply', { decision: 'afterWindow', shields: 'down', applied: true, monitors: 1 }]]);
  assert.equal(run('clock-rewind-keeps-lock', unlockedAfterRewind).status, 'fail');
  const neverEnded = PASSING['merged-30-minute-interval'].filter(([, , data]) => data.kind !== 'intervalDidEnd');
  assert.ok(run('merged-30-minute-interval', neverEnded).lines.some((l) => /no intervalDidEnd/.test(l)));
});

test('a later provider sign-in may return to the existing user instead of keeping the anonymous id', () => {
  const returning = [
    [0, 'auth.session', { kind: 'signedIn', provider: 'apple', userId: 'u9' }],
    [1 * M, 'auth.session', { kind: 'anonymous', userId: 'anon-2' }],
    [2 * M, 'auth.link', { provider: 'google', result: 'linked', userId: 'u9' }],
    [2 * M + 1 * S, 'auth.session', { kind: 'signedIn', provider: 'google', userId: 'u9' }],
  ];
  assert.equal(run('sign-in-google', returning).status, 'pass');
  const stranger = returning.map(([offset, event, data]) => (event === 'auth.link' ? [offset, event, { ...data, userId: 'u10' }] : [offset, event, data]));
  assert.ok(run('sign-in-google', stranger).lines.some((l) => /no earlier session had that id/.test(l)));
});

test('five daily rules may truncate at the budget but must cover past tomorrow', () => {
  const truncated = PASSING['five-daily-rules-budget'].map(([offset, event, data]) => (event === 'enforcement.plan' ? [offset, event, { ...data, truncatedAt: iso(4 * 24 * H) }] : [offset, event, data]));
  const outcome = run('five-daily-rules-budget', truncated);
  assert.equal(outcome.status, 'pass');
  assert.ok(outcome.lines.some((l) => /truncated at/.test(l)));
  const tooShort = PASSING['five-daily-rules-budget'].map(([offset, event, data]) => (event === 'enforcement.plan' ? [offset, event, { ...data, truncatedAt: iso(6 * H) }] : [offset, event, data]));
  assert.ok(run('five-daily-rules-budget', tooShort).lines.some((l) => /must reach past tomorrow/.test(l)));
});

test('a minutes-long sandbox trial without a scheduled reminder is a note, not a failure', () => {
  const sandbox = [[0, 'entitlement.status', { status: 'trial', renewsAt: iso(3 * M), source: 'adapty' }]];
  const outcome = run('trial-reminder', sandbox);
  assert.equal(outcome.status, 'pass');
  assert.ok(outcome.lines.some((l) => /shorter than the reminder lead/.test(l)));
  const real = [[0, 'entitlement.status', { status: 'trial', renewsAt: iso(7 * 24 * H), source: 'adapty' }]];
  assert.equal(run('trial-reminder', real).status, 'fail');
});

test('a propped scan inside an unlock already in force still passes', () => {
  const inside = [[-1 * M, 'enforcement.apply', { decision: 'unlockedProvisional', shields: 'down', applied: true, monitors: 1 }]].concat(
    PASSING['treadmill-propped-scan'].filter(([, event]) => event !== 'enforcement.apply'),
  );
  const outcome = run('treadmill-propped-scan', inside);
  assert.equal(outcome.status, 'pass');
  assert.ok(outcome.lines.some((l) => /already down/.test(l)));
  const never = PASSING['treadmill-propped-scan'].filter(([, event]) => event !== 'enforcement.apply');
  assert.equal(run('treadmill-propped-scan', never).status, 'fail');
});

test('a file named for a scenario turns missing evidence into a failure; an unnamed file reports only what has evidence', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'deny-motion.log'), log(PASSING['deny-screen-time']));
  fs.writeFileSync(path.join(dir, 'morning.log'), log(PASSING['deny-screen-time']));
  const named = verifyFile(path.join(dir, 'deny-motion.log'));
  assert.equal(named.results.length, 1);
  assert.equal(named.results[0].status, 'fail');
  const unnamed = verifyFile(path.join(dir, 'morning.log'));
  const withEvidence = unnamed.results.filter((r) => r.status !== 'skip');
  assert.deepEqual(withEvidence.map((r) => r.scenario.id), ['deny-screen-time']);
  assert.equal(withEvidence[0].status, 'pass');
  const { text, counts } = formatReport([named, unnamed]);
  assert.deepEqual(counts, { pass: 1, fail: 1, skip: 0 });
  assert.match(text, /FAIL +deny-motion/);
  assert.match(text, /PASS +deny-screen-time/);
});

test('the CLI verifies a directory, lists scenarios and exits 1 on a failure', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'walking-lease-expiry.log'), log(PASSING['walking-lease-expiry']));
  fs.writeFileSync(path.join(dir, 'notes.md'), 'ignored');
  const ok = execFileSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
  assert.match(ok, /PASS +walking-lease-expiry — A walking session unlocks/);
  assert.match(ok, /1 pass, 0 fail, 0 not run/);
  fs.writeFileSync(path.join(dir, 'deny-motion.log'), 'garbage line\n');
  const failing = spawnSync(process.execPath, [SCRIPT, dir], { encoding: 'utf8' });
  assert.equal(failing.status, 1);
  assert.match(failing.stdout, /deny-motion.log: 0 entries, 1 malformed line\(s\) at 1/);
  assert.match(failing.stdout, /FAIL +deny-motion/);
  const json = JSON.parse(execFileSync(process.execPath, [SCRIPT, path.join(dir, 'walking-lease-expiry.log'), '--json'], { encoding: 'utf8' }));
  assert.equal(json[0].results[0].id, 'walking-lease-expiry');
  assert.equal(json[0].results[0].status, 'pass');
  const list = execFileSync(process.execPath, [SCRIPT, '--list'], { encoding: 'utf8' });
  assert.equal(list.trim().split('\n').length, SCENARIOS.length);
  const forced = execFileSync(process.execPath, [SCRIPT, path.join(dir, 'walking-lease-expiry.log'), '--scenario', 'walking-lease-expiry'], { encoding: 'utf8' });
  assert.match(forced, /1 pass/);
});
