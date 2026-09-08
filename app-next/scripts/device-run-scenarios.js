'use strict';
/**
 * One check per physical-device acceptance row (plans/rebuild/phase-2-backend/P2-T11-device-verification.md
 * plus the sign-in rows of P2-T01 and the restore row of P2-T08).
 *
 * Every check reads the event vocabulary in docs/verification/diagnostics-events.md and returns
 * `{ status: 'pass' | 'fail' | 'skip', lines }`. `skip` means the log holds no evidence that the scenario
 * was exercised at all (its anchor event is absent); `fail` means it was exercised and an expectation
 * did not hold. The CLI turns a skip into a failure when the log file is named after the scenario.
 */
const { ms } = require('./device-run-log');

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const LEASE_MS = 15 * MINUTE;
const LEASE_WARNING_LEAD_MS = 30 * SECOND;
const GYM_CONFIRMATION_MS = 30 * SECOND;
const MONITOR_BUDGET = 16;

function of(entries, name) {
  return entries.filter((entry) => entry.event === name);
}
function where(entries, name, predicate) {
  return of(entries, name).filter((entry) => predicate(entry.data, entry));
}
function firstAfter(entries, atMs, name, predicate = () => true) {
  return entries.find((entry) => entry.event === name && entry.atMs >= atMs && predicate(entry.data, entry));
}
function lastBefore(entries, atMs, name, predicate = () => true) {
  return [...entries].reverse().find((entry) => entry.event === name && entry.atMs <= atMs && predicate(entry.data, entry));
}
function launchesAfter(entries, atMs) {
  return of(entries, 'app.launch').filter((entry) => entry.atMs > atMs);
}
function between(value, low, high) {
  return value >= low && value <= high;
}
function seconds(value) {
  return `${(value / SECOND).toFixed(1)} s`;
}
function minutes(value) {
  return `${(value / MINUTE).toFixed(1)} min`;
}
function extensionAt(entry) {
  // Extension events are drained into the log on the next foreground; `data.at` is the extension's own clock.
  const at = ms(entry.data.at);
  return Number.isNaN(at) ? entry.atMs : at;
}
function notificationIs(data, fragment) {
  return typeof data.id === 'string' && data.id.includes(fragment);
}

function collector() {
  const lines = [];
  let failed = false;
  let skipped = false;
  return {
    anchor(condition, missing) {
      if (!condition) {
        skipped = true;
        lines.push(`no evidence: ${missing}`);
      }
      return Boolean(condition);
    },
    expect(condition, passText, failText) {
      if (condition) lines.push(`ok: ${passText}`);
      else {
        failed = true;
        lines.push(`FAILED: ${failText}`);
      }
      return Boolean(condition);
    },
    note(text) {
      lines.push(`note: ${text}`);
    },
    result() {
      return { status: skipped ? 'skip' : failed ? 'fail' : 'pass', lines };
    },
  };
}

function signInScenario(provider) {
  return {
    id: `sign-in-${provider}`,
    title: `Sign in with ${provider === 'apple' ? 'Apple' : provider === 'google' ? 'Google' : 'email code'} links the anonymous user`,
    rows: ['P2-T01'],
    check(entries) {
      const r = collector();
      const link = where(entries, 'auth.link', (d) => d.provider === provider && d.result === 'linked')[0];
      if (!r.anchor(link, `auth.link provider=${provider} result=linked`)) return r.result();
      const anonymous = lastBefore(entries, link.atMs, 'auth.session', (d) => d.kind === 'anonymous');
      r.expect(anonymous, 'an anonymous session existed before the link', 'no anonymous auth.session before the link');
      if (anonymous)
        r.expect(
          anonymous.data.userId === link.data.userId,
          'the linked identity kept the anonymous user id',
          `user id changed on link (${anonymous.data.userId} → ${link.data.userId})`,
        );
      const signedIn = firstAfter(entries, link.atMs, 'auth.session', (d) => d.kind === 'signedIn' && d.provider === provider);
      r.expect(signedIn, `a signed-in ${provider} session followed`, `no signedIn auth.session with provider=${provider} after the link`);
      const pull = firstAfter(entries, link.atMs, 'sync.pull');
      if (pull) r.note(`restore pulled ${pull.data.rules ?? 0} rules after sign-in`);
      else r.note('no sync.pull after sign-in (expected on a phone that already holds the rules)');
      return r.result();
    },
  };
}

const SCENARIOS = [
  {
    id: 'fresh-install-onboarding',
    title: 'Fresh install through onboarding, sandbox trial and setup',
    rows: ['1'],
    check(entries) {
      const r = collector();
      const purchase = where(entries, 'subscription.purchase', (d) => d.result === 'purchased')[0];
      if (!r.anchor(purchase, 'subscription.purchase result=purchased (the fresh-install run ends in a sandbox purchase)')) return r.result();
      r.expect(of(entries, 'app.launch').length > 0, 'first launch recorded', 'no app.launch entry');
      r.expect(where(entries, 'auth.session', (d) => d.kind === 'anonymous').length > 0, 'anonymous session created', 'no anonymous auth.session');
      r.expect(
        where(entries, 'permission.status', (d) => d.name === 'screenTime' && d.status === 'granted').length > 0,
        'Screen Time granted',
        'Screen Time never reported granted',
      );
      const selection = where(entries, 'screentime.selection', (d) => d.hasHandle && Number(d.appCount) >= 2).pop();
      r.expect(selection, `app selection saved (${selection?.data.appCount} apps)`, 'no screentime.selection with a handle and at least two apps');
      r.expect(
        where(entries, 'permission.status', (d) => d.name === 'motion' && d.status === 'granted').length > 0,
        'Motion granted',
        'Motion never reported granted',
      );
      r.note(`sandbox purchase completed (${purchase.data.productId})`);
      const trial = firstAfter(entries, purchase.atMs, 'entitlement.status', (d) => d.status === 'trial' || d.status === 'active');
      r.expect(trial, `entitlement became ${trial?.data.status} after purchase`, 'entitlement never became trial/active after the purchase');
      return r.result();
    },
  },
  {
    id: 'shield-at-window-start-app-killed',
    title: 'Screen Time shield appears at window start with the app killed',
    rows: ['2'],
    check(entries) {
      const r = collector();
      const plan = where(entries, 'enforcement.plan', (d) => Array.isArray(d.monitors) && d.monitors.length > 0).pop();
      if (!r.anchor(plan, 'enforcement.plan with at least one monitor')) return r.result();
      const monitor = [...plan.data.monitors].sort((a, b) => ms(a.start) - ms(b.start)).find((m) => ms(m.start) >= plan.atMs - MINUTE) ?? plan.data.monitors[0];
      r.note(`monitor ${monitor.name} ${monitor.start} → ${monitor.end}`);
      const relaunch = launchesAfter(entries, plan.atMs)[0];
      r.expect(relaunch, 'the app was relaunched after the plan was registered (kill proven)', 'no app.launch after the plan: the app was never killed');
      const started = where(entries, 'extension.event', (d) => d.kind === 'intervalDidStart' && d.name === monitor.name)[0];
      r.expect(started, `extension fired intervalDidStart for ${monitor.name}`, `no extension.event intervalDidStart for ${monitor.name}`);
      if (started) {
        const drift = extensionAt(started) - ms(monitor.start);
        r.expect(between(drift, -MINUTE, 2 * MINUTE), `interval started ${seconds(drift)} from the scheduled start`, `interval started ${seconds(drift)} from the scheduled start (expected within 2 minutes)`);
      }
      const tap = where(entries, 'extension.shieldAction', (d) => d.action === 'primary')[0];
      r.expect(tap, 'Open ExcerLock was tapped on the shield', 'no extension.shieldAction primary: the shield button was not tapped or not recorded');
      if (tap) {
        const landed = firstAfter(entries, tap.atMs, 'nav.route', (d) => /home|locked-apps/.test(String(d.route)));
        r.expect(landed, `deep link landed on ${landed?.data.route}`, 'no nav.route home/locked-apps after the shield tap');
      }
      if (relaunch) {
        const apply = firstAfter(entries, relaunch.atMs, 'enforcement.apply');
        r.expect(apply && apply.data.shields === 'up', 'first apply after relaunch kept shields up', 'first enforcement.apply after relaunch did not report shields up');
      }
      return r.result();
    },
  },
  {
    id: 'step-goal-met-unlocks',
    title: 'Meeting the step goal unlocks for the day and survives a kill',
    rows: ['3'],
    check(entries) {
      const r = collector();
      const met = of(entries, 'progress.met')[0];
      if (!r.anchor(met, 'progress.met')) return r.result();
      const apply = firstAfter(entries, met.atMs, 'enforcement.apply', (d) => d.decision === 'unlockedMet');
      r.expect(apply && apply.data.shields === 'down', 'unlockedMet applied with shields down', 'no enforcement.apply decision=unlockedMet shields=down after progress.met');
      const facts = firstAfter(entries, met.atMs, 'screentime.facts', (d) => ms(d.unlockUntil) > met.atMs);
      r.expect(facts, `unlockUntil written to the app group (${facts?.data.unlockUntil})`, 'no screentime.facts with unlockUntil after met');
      const relaunch = apply ? launchesAfter(entries, apply.atMs)[0] : undefined;
      r.expect(relaunch, 'the app was killed and relaunched after the unlock', 'no app.launch after the unlock: kill not proven');
      if (relaunch) {
        const after = firstAfter(entries, relaunch.atMs, 'enforcement.apply');
        r.expect(after && after.data.shields === 'down', 'shields stayed down after the relaunch', 'first enforcement.apply after relaunch did not keep shields down');
      }
      if (facts) {
        const reshield = firstAfter(entries, ms(facts.data.unlockUntil), 'enforcement.apply', (d) => d.shields === 'up')
          ?? where(entries, 'extension.event', (d) => d.kind === 'intervalDidStart' && extensionAt({ data: d, atMs: 0 }) >= ms(facts.data.unlockUntil))[0];
        if (reshield) r.note('re-shield after unlockUntil observed');
        else r.note('re-shield after unlockUntil not in this log; record the next-day check in the results table');
      }
      return r.result();
    },
  },
  {
    id: 'deny-screen-time',
    title: 'Denying Screen Time shows permissionNeeded and Fix opens Settings',
    rows: ['4'],
    check(entries) {
      const r = collector();
      const denied = where(entries, 'permission.status', (d) => d.name === 'screenTime' && d.status === 'denied')[0];
      if (!r.anchor(denied, 'permission.status screenTime=denied')) return r.result();
      const apply = firstAfter(entries, denied.atMs, 'enforcement.apply');
      r.expect(apply && apply.data.applied === false && apply.data.reason === 'screenTimeDenied', 'enforcement reported applied=false reason=screenTimeDenied', 'enforcement.apply after the denial did not report applied=false reason=screenTimeDenied');
      const settings = firstAfter(entries, denied.atMs, 'permission.openSettings', (d) => d.name === 'screenTime');
      r.expect(settings, 'Fix opened iOS Settings', 'no permission.openSettings screenTime after the denial');
      return r.result();
    },
  },
  {
    id: 'deny-motion',
    title: 'Denying Motion shows the needed-permission state on the step rule',
    rows: ['4'],
    check(entries) {
      const r = collector();
      const denied = where(entries, 'permission.status', (d) => d.name === 'motion' && d.status === 'denied')[0];
      if (!r.anchor(denied, 'permission.status motion=denied')) return r.result();
      const stepProgress = firstAfter(entries, denied.atMs, 'progress.applied', (d) => d.source === 'steps');
      r.expect(!stepProgress, 'no step progress was applied after the denial', 'progress.applied source=steps appeared after Motion was denied');
      const settings = firstAfter(entries, denied.atMs, 'permission.openSettings', (d) => d.name === 'motion');
      r.expect(settings, 'Fix opened iOS Settings for Motion', 'no permission.openSettings motion after the denial');
      return r.result();
    },
  },
  {
    id: 'walking-lease-expiry',
    title: 'A walking session unlocks, warns 30 s before lease expiry and re-shields on lapse',
    rows: ['5'],
    check(entries) {
      const r = collector();
      const walking = where(entries, 'walking.session', (d) => d.phase === 'walking')[0];
      if (!r.anchor(walking, 'walking.session phase=walking')) return r.result();
      const unlocked = firstAfter(entries, walking.atMs, 'enforcement.apply', (d) => d.decision === 'unlockedWalking');
      r.expect(unlocked && unlocked.data.shields === 'down', 'unlockedWalking applied with shields down', 'no enforcement.apply decision=unlockedWalking shields=down after the session started');
      const grace = firstAfter(entries, walking.atMs, 'walking.session', (d) => d.phase === 'grace');
      r.expect(grace, 'stopping entered grace', 'no walking.session phase=grace after walking');
      const lapse =
        firstAfter(entries, walking.atMs, 'walking.lease', (d) => d.event === 'lapsed') ??
        firstAfter(entries, walking.atMs, 'walking.session', (d) => d.phase === 'ended' && d.reason === 'leaseLapsed');
      r.expect(lapse, 'the lease lapsed', 'no walking.lease lapsed or walking.session ended reason=leaseLapsed');
      if (!lapse) return r.result();
      const renewal = lastBefore(entries, lapse.atMs, 'walking.lease', (d) => d.event === 'renewed') ?? walking;
      const leaseUntil = ms(renewal.data.leaseUntil);
      const warning = where(entries, 'notification', (d, e) => notificationIs(d, 'walk-lease') && d.event === 'delivered' && e.atMs >= walking.atMs && e.atMs <= lapse.atMs + MINUTE)[0];
      r.expect(warning, 'the walk-lease warning was delivered', 'no delivered walk-lease notification during the session');
      if (warning && !Number.isNaN(leaseUntil)) {
        const lead = leaseUntil - (Number.isNaN(ms(warning.data.fireAt)) ? warning.atMs : ms(warning.data.fireAt));
        r.expect(between(lead, LEASE_WARNING_LEAD_MS - 15 * SECOND, LEASE_WARNING_LEAD_MS + 15 * SECOND), `warning arrived ${seconds(lead)} before expiry`, `warning arrived ${seconds(lead)} before expiry (expected 30 s ± 15 s)`);
      } else if (warning) r.note('lease end unknown: no leaseUntil on the session or renewal, lead time not checked');
      const reshield = firstAfter(entries, lapse.atMs, 'enforcement.apply', (d) => d.shields === 'up') ?? where(entries, 'extension.event', (d) => d.kind === 'intervalDidEnd' && extensionAt({ data: d, atMs: 0 }) >= lapse.atMs - MINUTE)[0];
      r.expect(reshield, 'shields returned after the lapse', 'no shields-up apply or extension intervalDidEnd after the lapse');
      return r.result();
    },
  },
  {
    id: 'walking-lease-renewal-hour',
    title: 'A walking lease renews across an hour on hardware',
    rows: ['19'],
    check(entries) {
      const r = collector();
      const renewals = where(entries, 'walking.lease', (d) => d.event === 'renewed');
      if (!r.anchor(renewals.length >= 2, 'at least two walking.lease renewed events')) return r.result();
      const sessionId = renewals[renewals.length - 1].data.sessionId;
      const mine = renewals.filter((e) => e.data.sessionId === sessionId);
      const start = where(entries, 'walking.session', (d) => d.phase === 'walking' && d.sessionId === sessionId)[0] ?? mine[0];
      const span = mine[mine.length - 1].atMs - start.atMs;
      r.expect(span >= HOUR, `session ${sessionId} renewed across ${minutes(span)}`, `session ${sessionId} only spans ${minutes(span)} (expected at least 60 min)`);
      const gaps = mine.slice(1).map((e, i) => e.atMs - mine[i].atMs);
      const widest = Math.max(start.atMs === mine[0].atMs ? 0 : mine[0].atMs - start.atMs, ...gaps);
      r.expect(widest <= LEASE_MS, `widest gap between renewals ${minutes(widest)}`, `a gap of ${minutes(widest)} between renewals exceeds the 15-minute lease`);
      const lapse = where(entries, 'walking.lease', (d, e) => d.event === 'lapsed' && d.sessionId === sessionId && e.atMs <= mine[mine.length - 1].atMs)[0];
      r.expect(!lapse, 'no lapse inside the span', 'the lease lapsed inside the renewal span');
      const reshield = where(entries, 'enforcement.apply', (d, e) => d.shields === 'up' && e.atMs > start.atMs && e.atMs < mine[mine.length - 1].atMs)[0];
      r.expect(!reshield, 'shields stayed down for the whole span', 'an enforcement.apply put shields up inside the span');
      return r.result();
    },
  },
  {
    id: 'treadmill-propped-scan',
    title: 'Propped treadmill scan verifies and unlocks a state rule',
    rows: ['5'],
    check(entries) {
      const r = collector();
      const scan = where(entries, 'gait.scan', (d) => d.result === 'verified')[0];
      if (!r.anchor(scan, 'gait.scan result=verified')) return r.result();
      const camera = lastBefore(entries, scan.atMs, 'permission.status', (d) => d.name === 'camera');
      r.expect(camera && camera.data.status === 'granted', 'camera permission recorded as granted before the scan', 'no permission.status camera=granted before the scan');
      const propped = scan.data.placement === 'propped' || Boolean(lastBefore(entries, scan.atMs, 'placement', (d) => d.placement === 'propped'));
      r.expect(propped, 'placement was propped at the scan', 'placement was not propped at the scan');
      const walking = firstAfter(entries, scan.atMs, 'walking.session', (d) => d.phase === 'walking');
      r.expect(walking && walking.atMs - scan.atMs <= 10 * SECOND, 'the session booked walking within 10 s of the scan', 'no walking.session phase=walking within 10 s of the verified scan');
      if (walking) r.expect(walking.data.placement === 'propped', 'session placement is propped', `session placement is ${walking.data.placement}, expected propped`);
      const unlocked = walking ? firstAfter(entries, walking.atMs, 'enforcement.apply', (d) => d.shields === 'down') : undefined;
      r.expect(unlocked, 'shields lifted after booking', 'no shields-down apply after the session booked');
      if (typeof scan.data.durationMs === 'number') r.note(`scan took ${seconds(scan.data.durationMs)} (spec target under 4 s)`);
      return r.result();
    },
  },
  {
    id: 'treadmill-duration-rule',
    title: 'A duration rule reaches met on the belt; the lease warning fires and a re-scan renews',
    rows: ['17'],
    check(entries) {
      const r = collector();
      const walking = where(entries, 'walking.session', (d) => d.phase === 'walking' && d.placement === 'propped')[0];
      if (!r.anchor(walking, 'walking.session phase=walking placement=propped')) return r.result();
      const credits = where(entries, 'progress.applied', (d, e) => d.activity === 'walking' && e.atMs >= walking.atMs && Number(d.value) > 0);
      r.expect(credits.length > 0, `minutes booked (${credits.length} progress writes, last value ${credits[credits.length - 1]?.data.value})`, 'no progress.applied activity=walking with a positive value after the propped session started');
      const met = firstAfter(entries, walking.atMs, 'progress.met');
      r.expect(met, `rule met at ${met?.data.metAt ?? new Date(met?.atMs ?? 0).toISOString()}`, 'no progress.met after the propped session started');
      const warning = firstAfter(entries, walking.atMs, 'notification', (d) => notificationIs(d, 'walk-lease') && d.event === 'delivered');
      r.expect(warning, 'lease warning delivered during the session', 'no delivered walk-lease notification during the propped session');
      if (warning) {
        const rescan = firstAfter(entries, warning.atMs, 'gait.scan', (d) => d.result === 'verified');
        r.expect(rescan, 're-scan verified after the warning', 'no verified gait.scan after the warning');
        const renewed = rescan ? firstAfter(entries, rescan.atMs, 'walking.lease', (d) => d.event === 'renewed') : undefined;
        r.expect(renewed, `re-scan renewed the lease until ${renewed?.data.leaseUntil}`, 'no walking.lease renewed after the re-scan');
      }
      return r.result();
    },
  },
  {
    id: 'treadmill-framing-expired',
    title: 'Framing-grace expiry is never silent: Try again or Continue with phone in hand',
    rows: ['5', 'P2-T21'],
    check(entries) {
      const r = collector();
      const expired = where(entries, 'gait.scan', (d) => d.result === 'framingExpired')[0];
      if (!r.anchor(expired, 'gait.scan result=framingExpired')) return r.result();
      const retry = firstAfter(entries, expired.atMs + 1, 'gait.scan');
      const handheld = firstAfter(entries, expired.atMs, 'walking.session', (d) => d.placement === 'handheld');
      r.expect(retry || handheld, retry ? 'Try again started a new scan' : 'Continue with phone in hand started a handheld session', 'no new gait.scan and no handheld walking.session after the expiry: the exits were not offered or not taken');
      const silentUnlock = where(entries, 'enforcement.apply', (d, e) => d.shields === 'down' && e.atMs > expired.atMs && e.atMs < (retry?.atMs ?? handheld?.atMs ?? Infinity))[0];
      r.expect(!silentUnlock, 'no unlock was granted by the expired scan', 'shields went down between the expiry and the next action');
      return r.result();
    },
  },
  {
    id: 'gym-manual-checkin',
    title: 'Manual check-in inside the radius confirms after 30 s and unlocks',
    rows: ['6'],
    check(entries) {
      const r = collector();
      const visit = where(entries, 'gym.visit', (d) => d.event === 'opened' && d.source === 'manual')[0];
      if (!r.anchor(visit, 'gym.visit event=opened source=manual')) return r.result();
      const arrival = firstAfter(entries, visit.atMs, 'gym.arrival');
      r.expect(arrival, 'arrival confirmed', 'no gym.arrival after the manual visit opened');
      if (arrival) {
        const wait = ms(arrival.data.confirmedAt) - ms(visit.data.enteredAt);
        if (!Number.isNaN(wait)) r.expect(between(wait, GYM_CONFIRMATION_MS - 5 * SECOND, GYM_CONFIRMATION_MS + 15 * SECOND), `confirmation took ${seconds(wait)}`, `confirmation took ${seconds(wait)} (expected about 30 s)`);
        const unlocked = firstAfter(entries, arrival.atMs, 'enforcement.apply', (d) => d.shields === 'down' && /unlockedProvisional|unlockedMet/.test(String(d.decision)));
        r.expect(unlocked, `shields lifted (${unlocked?.data.decision})`, 'no shields-down apply with decision unlockedProvisional/unlockedMet after the arrival');
        const met = firstAfter(entries, visit.atMs, 'progress.met');
        if (met && !Number.isNaN(ms(met.data.metAt))) r.expect(Math.abs(ms(met.data.metAt) - ms(visit.data.enteredAt)) <= SECOND, 'metAt equals the visit enteredAt', `metAt ${met.data.metAt} differs from enteredAt ${visit.data.enteredAt}`);
        else r.note('no progress.met (expected for a minutes rule until dwell reaches the goal)');
      }
      return r.result();
    },
  },
  {
    id: 'gym-arrival-app-killed',
    title: 'Arriving with the app killed wakes the geofence; the ceremony unlocks at the 30-second confirmation',
    rows: ['6', '18'],
    check(entries) {
      const r = collector();
      const enter = where(entries, 'gym.geofence', (d) => d.event === 'enter' && d.background === true)[0];
      if (!r.anchor(enter, 'gym.geofence event=enter background=true')) return r.result();
      const visit = where(entries, 'gym.visit', (d, e) => d.source === 'geofence' && (d.event === 'opened' || d.event === 'claimed') && e.atMs >= enter.atMs - MINUTE)[0];
      r.expect(visit, `background visit ${visit?.data.event} at ${visit?.data.enteredAt}`, 'no geofence gym.visit opened/claimed for the background arrival');
      if (visit) {
        const drift = Math.abs(ms(visit.data.enteredAt) - extensionAt(enter));
        if (!Number.isNaN(drift)) r.expect(drift <= MINUTE, `visit enteredAt is ${seconds(drift)} from the geofence event`, `visit enteredAt is ${seconds(drift)} from the geofence event (expected within 60 s)`);
      }
      const ceremony = firstAfter(entries, enter.atMs, 'nav.route', (d) => /unlock\/gym/.test(String(d.route)));
      const arrival = firstAfter(entries, enter.atMs, 'gym.arrival');
      r.expect(arrival, 'arrival confirmed', 'no gym.arrival after the background entry');
      if (arrival && ceremony) {
        const wait = ms(arrival.data.confirmedAt) - ceremony.atMs;
        r.expect(between(wait, GYM_CONFIRMATION_MS - 5 * SECOND, GYM_CONFIRMATION_MS + 15 * SECOND), `ceremony confirmed after ${seconds(wait)}`, `ceremony confirmed after ${seconds(wait)} (expected about 30 s)`);
      } else if (arrival) r.note('no nav.route unlock/gym recorded, confirmation timing not checked');
      if (arrival) {
        const unlocked = firstAfter(entries, arrival.atMs, 'enforcement.apply', (d) => d.shields === 'down');
        r.expect(unlocked, 'shields lifted after confirmation', 'no shields-down apply after the arrival');
      }
      return r.result();
    },
  },
  {
    id: 'gym-dwell-hour-app-killed',
    title: 'An hour at the gym with the app killed is credited in full on the next open',
    rows: ['18'],
    check(entries) {
      const r = collector();
      const visit = where(entries, 'gym.visit', (d) => d.event === 'closed' && d.source === 'geofence' && ms(d.exitedAt) - ms(d.enteredAt) >= 55 * MINUTE)[0];
      if (!r.anchor(visit, 'gym.visit event=closed source=geofence lasting at least 55 min')) return r.result();
      const dwell = ms(visit.data.exitedAt) - ms(visit.data.enteredAt);
      r.note(`visit lasted ${minutes(dwell)}`);
      const credit = where(entries, 'progress.applied', (d, e) => d.activity === 'gym' && e.atMs >= visit.atMs - SECOND).pop();
      r.expect(credit && Number(credit.data.value) >= Math.floor(dwell / MINUTE) - 2, `credited ${credit?.data.value} minutes`, `credited ${credit?.data.value ?? 'nothing'}; expected at least ${Math.floor(dwell / MINUTE) - 2} minutes`);
      return r.result();
    },
  },
  {
    id: 'running-from-health',
    title: 'A run recorded by the Watch or a Health app progresses the run rule',
    rows: ['7'],
    check(entries) {
      const r = collector();
      const workouts = where(entries, 'health.workouts', (d) => d.activity === 'running' && Number(d.count) >= 1)[0];
      if (!r.anchor(workouts, 'health.workouts activity=running count>=1')) return r.result();
      const progress = firstAfter(entries, workouts.atMs, 'progress.applied', (d) => d.activity === 'running' && Number(d.value) > 0);
      r.expect(progress, `run rule progressed to ${progress?.data.value}/${progress?.data.goal}`, 'no progress.applied activity=running with a positive value after the Health read');
      if (progress && progress.data.met) r.note('run rule met');
      if (Number(workouts.data.excludedManual) > 0) r.note(`${workouts.data.excludedManual} manual workouts were excluded`);
      return r.result();
    },
  },
  {
    id: 'trial-reminder',
    title: 'The trial reminder is scheduled before renewal and lands on Settings',
    rows: ['8'],
    check(entries) {
      const r = collector();
      const trial = where(entries, 'entitlement.status', (d) => d.status === 'trial' && !Number.isNaN(ms(d.renewsAt)))[0];
      if (!r.anchor(trial, 'entitlement.status status=trial with renewsAt')) return r.result();
      const renewsAt = ms(trial.data.renewsAt);
      const scheduled = firstAfter(entries, trial.atMs, 'notification', (d) => notificationIs(d, 'trial') && d.event === 'scheduled');
      r.expect(scheduled, `reminder scheduled for ${scheduled?.data.fireAt}`, 'no scheduled trial notification after the trial began');
      if (scheduled) {
        const fireAt = ms(scheduled.data.fireAt);
        r.expect(fireAt < renewsAt && fireAt >= renewsAt - 3 * DAY, 'fires inside the three days before renewal', `fireAt ${scheduled.data.fireAt} is not inside the three days before ${trial.data.renewsAt}`);
        if (renewsAt - trial.atMs >= 3 * DAY) r.note(`fires at local hour ${new Date(fireAt).getHours()} (expected 18 on this Mac's timezone)`);
      }
      const permission = lastBefore(entries, scheduled?.atMs ?? Infinity, 'permission.status', (d) => d.name === 'notifications');
      if (permission) r.note(`notification permission was ${permission.data.status}`);
      const opened = where(entries, 'notification', (d) => notificationIs(d, 'trial') && d.event === 'opened')[0];
      if (opened) r.expect(/settings/.test(String(opened.data.route)), `tap landed on ${opened.data.route}`, `tap landed on ${opened.data.route}, expected Settings`);
      else r.note('reminder not tapped in this log (it fires days later); the landing route is covered by lockwindow-subtitle-and-tap-through');
      return r.result();
    },
  },
  {
    id: 'sentry-test-crash',
    title: 'A forced test crash is captured and the log survives the relaunch',
    rows: ['8'],
    check(entries) {
      const r = collector();
      const crash = of(entries, 'sentry.testCrash')[0];
      if (!r.anchor(crash, 'sentry.testCrash')) return r.result();
      r.expect(launchesAfter(entries, crash.atMs).length > 0, 'the app relaunched after the crash', 'no app.launch after the crash: the log did not survive or the app was not reopened');
      r.note('confirm the event in Sentry project excerlock-mobile with a scrubbed payload');
      return r.result();
    },
  },
  {
    id: 'posthog-session-events',
    title: 'The session emitted product events',
    rows: ['8'],
    check(entries) {
      const r = collector();
      const events = of(entries, 'analytics.event');
      if (!r.anchor(events.length > 0, 'analytics.event')) return r.result();
      const names = new Set(events.map((e) => e.data.name));
      const expected = ['onboarding_screen_viewed', 'sign_in_completed', 'rule_met', 'walking_session_started', 'setup_permission_result'];
      const seen = expected.filter((name) => names.has(name));
      r.expect(seen.length > 0, `${events.length} events including ${seen.join(', ')}`, `${events.length} events but none of ${expected.join(', ')}`);
      r.note('confirm in PostHog that the distinct id is the Supabase uid and app=excerlock');
      return r.result();
    },
  },
  signInScenario('apple'),
  signInScenario('google'),
  signInScenario('email'),
  {
    id: 'restore-after-reinstall',
    title: 'Sign-in after a reinstall restores rules and history but not the app selection',
    rows: ['9', 'P2-T08'],
    check(entries) {
      const r = collector();
      const pull = where(entries, 'sync.pull', (d) => Number(d.rules) >= 1)[0];
      if (!r.anchor(pull, 'sync.pull with rules>=1')) return r.result();
      r.note(`restored ${pull.data.rules} rules, ${pull.data.history ?? 0} history days, ${pull.data.earnedUnlocks ?? 0} earned unlocks`);
      const signedIn = lastBefore(entries, pull.atMs, 'auth.session', (d) => d.kind === 'signedIn');
      r.expect(signedIn, `pull followed a ${signedIn?.data.provider} sign-in`, 'no signedIn auth.session before the pull');
      const selection = firstAfter(entries, pull.atMs, 'screentime.selection');
      r.expect(selection && selection.data.hasHandle === false, 'the app selection was not restored (hasHandle=false)', 'no screentime.selection hasHandle=false after the pull: the device-bound selection must not come back');
      const apply = firstAfter(entries, pull.atMs, 'enforcement.apply');
      if (apply) r.expect(apply.data.reason === 'noSelection' || apply.data.shields === 'down', `enforcement after restore: ${apply.data.reason ?? apply.data.decision}`, 'enforcement after restore claimed to shield without a selection');
      return r.result();
    },
  },
  {
    id: 'usage-monitor',
    title: 'Ten minutes in a locked app after unlocking shows as about ten minutes',
    rows: ['10'],
    check(entries) {
      const r = collector();
      const thresholds = of(entries, 'usage.threshold');
      if (!r.anchor(thresholds.length > 0, 'usage.threshold')) return r.result();
      const day = thresholds[thresholds.length - 1].data.day;
      const sameDay = thresholds.filter((e) => e.data.day === day);
      r.expect(sameDay.length >= 2, `${sameDay.length} five-minute thresholds on ${day}`, `only ${sameDay.length} threshold event(s) on ${day}; ten minutes of use should produce two`);
      const total = where(entries, 'usage.day', (d) => d.day === day).pop();
      if (total) r.expect(Number(total.data.minutes) >= 10, `usage.day shows ${total.data.minutes} minutes`, `usage.day shows ${total.data.minutes} minutes, expected at least 10`);
      else r.note('no usage.day yet; open Analytics the next day and pull the log again');
      return r.result();
    },
  },
  {
    id: 'overlapping-windows-app-killed',
    title: 'Two overlapping windows stay shielded past the first window\'s end with the app killed',
    rows: ['11'],
    check(entries) {
      const r = collector();
      const plan = where(entries, 'enforcement.plan', (d) => Number(d.ruleCount) >= 2 && Array.isArray(d.monitors) && d.monitors.length > 0).pop();
      if (!r.anchor(plan, 'enforcement.plan ruleCount>=2 with monitors')) return r.result();
      const monitor = [...plan.data.monitors].sort((a, b) => ms(b.end) - ms(b.start) - (ms(a.end) - ms(a.start)))[0];
      r.note(`longest merged monitor ${monitor.name} ${monitor.start} → ${monitor.end}`);
      const relaunch = launchesAfter(entries, plan.atMs)[0];
      r.expect(relaunch, 'the app was killed and relaunched', 'no app.launch after the plan: kill not proven');
      const earlyEnd = where(entries, 'extension.event', (d) => d.kind === 'intervalDidEnd' && extensionAt({ data: d, atMs: 0 }) < ms(monitor.end) - MINUTE && extensionAt({ data: d, atMs: 0 }) > ms(monitor.start))[0];
      r.expect(!earlyEnd, 'no interval ended before the merged end', `extension intervalDidEnd ${earlyEnd?.data.name} fired at ${earlyEnd?.data.at}, before the merged end ${monitor.end}`);
      if (relaunch) {
        const apply = firstAfter(entries, relaunch.atMs, 'enforcement.apply');
        const inside = apply && apply.atMs < ms(monitor.end);
        r.expect(apply && (!inside || apply.data.shields === 'up'), inside ? 'shields were still up after the first window ended' : 'relaunch happened after the merged end; shield state not checkable', 'enforcement.apply after relaunch reported shields down inside the merged interval');
      }
      return r.result();
    },
  },
  {
    id: 'five-daily-rules-budget',
    title: 'Five daily rules register within the monitor budget with a week of coverage',
    rows: ['12'],
    check(entries) {
      const r = collector();
      const plan = where(entries, 'enforcement.plan', (d) => Number(d.ruleCount) >= 5).pop();
      if (!r.anchor(plan, 'enforcement.plan ruleCount>=5')) return r.result();
      const count = Array.isArray(plan.data.monitors) ? plan.data.monitors.length : Number(plan.data.monitorCount);
      r.expect(count <= MONITOR_BUDGET, `${count} monitors registered (budget ${MONITOR_BUDGET})`, `${count} monitors exceed the budget of ${MONITOR_BUDGET}`);
      r.expect(plan.data.truncatedAt == null, 'plan was not truncated', `plan truncated at ${plan.data.truncatedAt}`);
      if (!Number.isNaN(ms(plan.data.horizonEnd))) {
        const coverage = ms(plan.data.horizonEnd) - plan.atMs;
        r.expect(coverage >= 7 * DAY - HOUR, `coverage ${(coverage / DAY).toFixed(1)} days`, `coverage only ${(coverage / DAY).toFixed(1)} days, expected a week`);
      }
      const apply = firstAfter(entries, plan.atMs, 'enforcement.apply', (d) => d.planHash === plan.data.planHash) ?? firstAfter(entries, plan.atMs, 'enforcement.apply');
      r.expect(apply && apply.data.applied === true, `apply reported applied=true with ${apply?.data.monitors} monitors`, 'no enforcement.apply applied=true for the plan');
      return r.result();
    },
  },
  {
    id: 'sandbox-lapse-clears-shields',
    title: 'A sandbox lapse clears shields within one app run; Settings and the ceremonies stay reachable',
    rows: ['13'],
    check(entries) {
      const r = collector();
      const lapse = where(entries, 'entitlement.status', (d) => d.status === 'expired' || d.status === 'billingIssue')[0];
      if (!r.anchor(lapse, 'entitlement.status expired/billingIssue')) return r.result();
      const nextLaunch = launchesAfter(entries, lapse.atMs)[0];
      const limit = nextLaunch ? nextLaunch.atMs : Infinity;
      const cleared = where(entries, 'enforcement.apply', (d, e) => e.atMs >= lapse.atMs && e.atMs < limit && d.shields === 'down' && Number(d.monitors) === 0)[0];
      r.expect(cleared, `shields cleared and monitors unregistered ${seconds(cleared?.atMs - lapse.atMs)} after the lapse, same run`, 'no enforcement.apply shields=down monitors=0 in the same run as the lapse');
      const paywall = firstAfter(entries, lapse.atMs, 'paywall.presented', (d) => d.placement === 'in_app');
      r.expect(paywall && paywall.data.dismissible === true, 'in_app paywall presented as a dismissible modal', 'no paywall.presented placement=in_app dismissible=true after the lapse');
      const settings = firstAfter(entries, lapse.atMs, 'nav.route', (d) => /settings/.test(String(d.route)));
      r.expect(settings, 'Settings was reached while lapsed', 'no nav.route settings after the lapse');
      const ceremony = firstAfter(entries, lapse.atMs, 'nav.route', (d) => /unlock\//.test(String(d.route)));
      r.expect(ceremony, `ceremony ${ceremony?.data.route} was reached while lapsed`, 'no nav.route unlock/* after the lapse');
      return r.result();
    },
  },
  {
    id: 'sandbox-restore',
    title: 'Restore purchases re-activates a sandbox subscription and never downgrades a live one',
    rows: ['P2-T06'],
    check(entries) {
      const r = collector();
      const restore = of(entries, 'subscription.restore')[0];
      if (!r.anchor(restore, 'subscription.restore')) return r.result();
      const before = lastBefore(entries, restore.atMs, 'entitlement.status');
      const after = firstAfter(entries, restore.atMs, 'entitlement.status');
      if (restore.data.result === 'restored') r.expect(after && /trial|active/.test(String(after.data.status)), `entitlement is ${after?.data.status} after restore`, `entitlement is ${after?.data.status ?? 'unchanged'} after a successful restore`);
      else if (restore.data.result === 'notFound') {
        const live = before && /trial|active/.test(String(before.data.status));
        r.expect(!live || !after || /trial|active/.test(String(after.data.status)), 'nothing to restore kept the live entitlement', `a restore that found nothing downgraded ${before?.data.status} to ${after?.data.status}`);
      } else r.expect(false, '', `restore ended with result=${restore.data.result}`);
      return r.result();
    },
  },
  {
    id: 'clock-rewind-keeps-lock',
    title: 'Setting the clock back an hour keeps the apps locked',
    rows: ['14'],
    check(entries) {
      const r = collector();
      const rewind = of(entries, 'watermark.rewind')[0];
      if (!r.anchor(rewind, 'watermark.rewind')) return r.result();
      const observed = ms(rewind.data.observed);
      const watermark = ms(rewind.data.watermark);
      const effective = ms(rewind.data.effective);
      if (![observed, watermark, effective].some(Number.isNaN)) r.expect(effective >= watermark && observed < watermark, `effective time held at the watermark (${minutes(watermark - observed)} rewind)`, `effective ${rewind.data.effective} is before the watermark ${rewind.data.watermark}`);
      const applies = where(entries, 'enforcement.apply', (d, e) => e.atMs >= rewind.atMs);
      r.expect(applies.length > 0 && applies.every((e) => e.data.shields === 'up'), `all ${applies.length} applies after the rewind kept shields up`, applies.length === 0 ? 'no enforcement.apply after the rewind' : 'an enforcement.apply after the rewind put shields down');
      return r.result();
    },
  },
  {
    id: 'lockwindow-subtitle-and-tap-through',
    title: 'The lockWindow shield has its own subtitle and the shield notification lands on Home',
    rows: ['15'],
    check(entries) {
      const r = collector();
      const published = where(entries, 'shield.content', (d) => d.byMonitor && Object.values(d.byMonitor).some((c) => c.cause === 'lockWindow'))[0];
      if (!r.anchor(published, 'shield.content with a lockWindow cause')) return r.result();
      const contents = Object.values(published.data.byMonitor);
      const window = contents.find((c) => c.cause === 'lockWindow');
      const locked = contents.find((c) => c.cause === 'locked');
      r.expect(typeof window.subtitle === 'string' && window.subtitle.trim().length > 0, `lockWindow subtitle: "${window.subtitle}"`, 'lockWindow subtitle is empty');
      if (locked) r.expect(locked.subtitle !== window.subtitle, 'lockWindow subtitle differs from the locked subtitle', 'lockWindow and locked subtitles are identical');
      const tap = where(entries, 'extension.shieldAction', (d) => d.action === 'primary')[0];
      r.expect(tap, 'the shield primary button was tapped', 'no extension.shieldAction primary');
      const opened = tap ? firstAfter(entries, tap.atMs, 'notification', (d) => notificationIs(d, 'shield.open') && d.event === 'opened') : undefined;
      r.expect(opened, 'the shield notification was opened', 'no opened notification with id excerlock.shield.open after the tap');
      const home = (opened ?? tap) ? firstAfter(entries, (opened ?? tap).atMs, 'nav.route', (d) => /home|locked-apps/.test(String(d.route))) : undefined;
      r.expect(home, `landed on ${home?.data.route}`, 'no nav.route home/locked-apps after the notification');
      return r.result();
    },
  },
  {
    id: 'merged-30-minute-interval',
    title: 'A 30-minute merged interval registers and its end clears the shield',
    rows: ['16'],
    check(entries) {
      const r = collector();
      const plan = where(entries, 'enforcement.plan', (d) => Array.isArray(d.monitors) && d.monitors.some((m) => between(ms(m.end) - ms(m.start), 30 * MINUTE, 31 * MINUTE))).pop();
      if (!r.anchor(plan, 'enforcement.plan with a 30-minute monitor')) return r.result();
      const monitor = plan.data.monitors.find((m) => between(ms(m.end) - ms(m.start), 30 * MINUTE, 31 * MINUTE));
      r.note(`monitor ${monitor.name} ${monitor.start} → ${monitor.end}`);
      const started = where(entries, 'extension.event', (d) => d.kind === 'intervalDidStart' && d.name === monitor.name)[0];
      const ended = where(entries, 'extension.event', (d) => d.kind === 'intervalDidEnd' && d.name === monitor.name)[0];
      r.expect(started, 'intervalDidStart fired', `no intervalDidStart for ${monitor.name}`);
      r.expect(ended, 'intervalDidEnd fired', `no intervalDidEnd for ${monitor.name}`);
      if (started && ended) {
        const length = extensionAt(ended) - extensionAt(started);
        r.expect(between(length, 30 * MINUTE - 90 * SECOND, 30 * MINUTE + 90 * SECOND), `the extension saw ${minutes(length)}`, `the extension saw ${minutes(length)}, expected about 30 min`);
      }
      const cleared = firstAfter(entries, ms(monitor.end) - MINUTE, 'enforcement.apply', (d) => d.shields === 'down');
      r.expect(cleared, 'shields were down when the app next applied after the end', 'no shields-down apply after the interval end');
      return r.result();
    },
  },
  {
    id: 'shield-refresh-cadence',
    title: 'Measured: how quickly the shield extension picks up newly published content',
    rows: ['20'],
    check(entries) {
      const r = collector();
      const published = of(entries, 'shield.content').filter((e) => e.data.revision !== undefined);
      const reads = of(entries, 'extension.shieldRead');
      if (!r.anchor(published.length > 0 && reads.length > 0, 'shield.content with revisions and extension.shieldRead')) return r.result();
      const delays = reads
        .map((read) => {
          const publish = published.find((p) => p.data.revision === read.data.revision);
          return publish ? extensionAt(read) - publish.atMs : null;
        })
        .filter((d) => d !== null)
        .sort((a, b) => a - b);
      if (delays.length === 0) {
        r.note(`${reads.length} extension reads matched no published revision`);
        return r.result();
      }
      const median = delays[Math.floor(delays.length / 2)];
      r.note(`${delays.length} matched reads: min ${seconds(delays[0])}, median ${seconds(median)}, max ${seconds(delays[delays.length - 1])}`);
      r.expect(true, 'measurement recorded; copy the numbers into the P2-T04 open question', '');
      return r.result();
    },
  },
];

const ids = new Set();
for (const scenario of SCENARIOS) {
  if (ids.has(scenario.id)) throw new Error(`duplicate scenario id ${scenario.id}`);
  ids.add(scenario.id);
}

function scenarioForFile(fileName) {
  const stem = fileName.replace(/\.(log|txt|jsonl|tsv)$/i, '');
  return [...SCENARIOS].sort((a, b) => b.id.length - a.id.length).find((s) => stem === s.id || stem.startsWith(`${s.id}-`) || stem.startsWith(`${s.id}.`)) ?? null;
}

module.exports = { SCENARIOS, scenarioForFile, LEASE_MS, LEASE_WARNING_LEAD_MS, GYM_CONFIRMATION_MS, MONITOR_BUDGET };
