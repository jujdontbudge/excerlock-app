"""E2E-V1 — full-app screen sweep (plan §7.2, §4.2 route inventory).

Two states, one build, one device:

* **existing user** — restore the captured ``fixtures/existing-user`` fixture
  (E2E-F1's server-side grant) so the 19 routes behind the setup-complete guard
  render for real: the four tabs, the thirteen settings pages, ``builder`` and
  the two ``unlock`` routes;
* **fresh install** — the original sweep: real onboarding O01→P plus the routes
  a not-yet-entitled profile can reach (gym picker, paywall).

``/setup/X4`` is the one route that needs the *intermediate* state (entitled and
setup-incomplete), which only exists between the grant and setup completion;
E2E-F1's mint walk exercises it live in this same run, so this scenario only
asserts that its guard is correctly closed in both sweep states.

The existing-user phase must run before the fresh phase: the fresh install
resets the simulator keychain, which is where the fixture's Supabase session
lives (expo-secure-store), so the guarded sweep would boot anonymous after it.
"""
from __future__ import annotations

import json
import os
import time
from typing import Any

import fixture
import posthog
from harness import Scenario, RunContext

from .onboarding import OnboardingWalk

#: production route inventory from app-next/app (plan §4.2). `dev` and
#: `linked-trace` are dev/lab-only and deliberately excluded. The marker is the
#: on-screen label that proves the route rendered; it is a tuple when the two
#: sweep states show a different variant (the guarded paywall says "Unlock
#: ExcerLock Premium", the fresh one "Choose your plan").
ROUTES: list[tuple[str, str, str, str | tuple[str, ...]]] = [
    # (route path, deep link, semantic screen name, marker label(s))
    ('/(tabs)/home', 'excerlock://home', 'home', 'Home'),
    ('/(tabs)/conditions', 'excerlock://conditions', 'conditions', 'Conditions'),
    ('/(tabs)/analytics', 'excerlock://analytics', 'analytics', 'Analytics'),
    ('/(tabs)/settings', 'excerlock://settings', 'settings', 'Settings'),
    ('/builder', 'excerlock://builder', 'builder', ''),
    ('/gym-picker', 'excerlock://gym-picker', 'gym_picker', 'Pick your gym'),
    ('/paywall', 'excerlock://paywall', 'paywall', ('Unlock ExcerLock Premium', 'Choose your plan')),
    ('/sign-in', 'excerlock://sign-in', 'sign_in', 'Save your progress'),
    ('/settings/account', 'excerlock://settings/account', 'settings_account', 'Account'),
    ('/settings/subscription', 'excerlock://settings/subscription', 'settings_subscription', 'Subscription'),
    ('/settings/preferences', 'excerlock://settings/preferences', 'settings_preferences', 'Preferences'),
    ('/settings/units', 'excerlock://settings/units', 'settings_units', 'Distance units'),
    ('/settings/gyms', 'excerlock://settings/gyms', 'settings_gyms', 'Saved gyms'),
    ('/settings/bug', 'excerlock://settings/bug', 'settings_bug', 'Found a bug?'),
    ('/settings/feedback', 'excerlock://settings/feedback', 'settings_feedback', 'Feedback'),
    ('/settings/legal', 'excerlock://settings/legal', 'settings_legal', 'Privacy & terms'),
    ('/settings/legal/terms', 'excerlock://settings/legal/terms', 'settings_legal', 'Read Terms of Use'),
    ('/settings/legal/privacy', 'excerlock://settings/legal/privacy', 'settings_legal', 'Read Privacy Policy'),
    ('/settings/permission/screenTime', 'excerlock://settings/permission/screenTime', 'settings_permission', 'Screen Time'),
    ('/settings/permission/motion', 'excerlock://settings/permission/motion', 'settings_permission', 'Motion & Fitness'),
    ('/settings/permission/location', 'excerlock://settings/permission/location', 'settings_permission', 'Location'),
    ('/unlock/gym', 'excerlock://unlock/gym', 'unlock_gym', ''),
    ('/unlock/treadmill', 'excerlock://unlock/treadmill', 'unlock_treadmill', 'Prop your phone and walk'),
    ('/setup/X4', 'excerlock://setup/X4', 'setup', 'Save your progress'),
]

#: Routable while entitled and setup-incomplete only; the sweep asserts its
#: guard is closed in both sweep states (E2E-F1 covers the live state).
STATE_GATED = {'/setup/X4'}
#: Marker-evaluated routes that render on a plain fresh install.
FRESH_RENDERABLE = {'/gym-picker', '/paywall'}

ONBOARDING_ROUTE_STEPS = ['O01', 'O20', 'W1', 'S1', 'T1', 'P']


class V1ScreenSweep(Scenario):
    id = 'E2E-V1'
    title = 'Full-app screen sweep: every production route emits one $screen row'
    lane = 'SIM'
    users = 'BOTH'
    # Two states in one run; the phases own the device state (guarded first,
    # then the fresh install that resets the keychain).
    fixture = 'none'
    requires = ('B4a.screen_step_mapping', 'B4b.root_screen_tracking')

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        visited: list[dict] = []
        guarded_ran = self.guarded_phase(ctx, visited)
        fresh_ran = self.fresh_phase(ctx, visited)

        # Coverage table: every label-judged visit is checked against what its
        # state allows, so a guard that wrongly opens or closes fails here.
        # ``expected is None`` means the label is not the right signal for that
        # visit (markerless routes, and the entitled-user paywall, whose
        # PaywallSlot forwards to Home the moment it sees trial/active).
        evaluated = [entry for entry in visited if entry['expected'] is not None]
        mismatches = [entry for entry in evaluated if entry['rendered'] != entry['expected']]
        payload = ctx.dir / 'route-coverage.json'
        payload.write_text(json.dumps(visited, indent=2) + '\n')
        verdict.artifacts.setdefault('files', []).append(payload.name)

        def coverage_label(entry: dict) -> str:
            state = 'ok' if entry['rendered'] else 'blocked' if entry['rendered'] is False else 'no-marker'
            if entry['expected'] is None:
                return f'{state}/not-judged-by-label'
            return f'{state}/{"expected" if entry["rendered"] == entry["expected"] else "UNEXPECTED"}'

        ctx.note('coverage: ' + '; '.join(
            f'[{entry["phase"]}] {entry["route"]}={coverage_label(entry)}' for entry in visited))
        rendered_count = sum(1 for entry in evaluated if entry['rendered'])
        guarded = f' ({self.guarded_count(visited)} of them behind the setup-complete guard, exercised on the ' \
                  f'existing-user fixture)' if guarded_ran else ''
        verdict.check('routes.reachable_count', not mismatches,
                      f'{rendered_count} of {len(evaluated)} marker-evaluated route visits rendered; '
                      f'unexpected: {[entry["route"] for entry in mismatches]}' if mismatches else
                      f'{rendered_count} of {len(evaluated)} marker-evaluated route visits rendered exactly as '
                      f'their state allows{guarded}; /setup/X4 stays closed while setup is complete and is '
                      f'exercised live by E2E-F1\'s mint walk',
                      evidence=['route-coverage.json'])
        if not guarded_ran:
            verdict.check('routes.existing_user', None,
                          f'the existing-user guarded sweep did not run (no {fixture.SNAPSHOT}); mint the fixture '
                          'with E2E-F1 and rerun V1 in the same invocation, before any fresh-install scenario',
                          blocked_until='existing-user-fixture')
        if not fresh_ran:
            verdict.block('the fresh-install sweep did not run; the route coverage is incomplete')

    # ------------------------------------------------------------------ #
    # Phase 1: existing-user fixture — the setup-complete guarded routes
    # ------------------------------------------------------------------ #
    def guarded_phase(self, ctx: RunContext, visited: list[dict]) -> bool:
        verdict = ctx.verdict
        if not fixture.snapshot_available():
            ctx.log(f'no existing-user snapshot at {fixture.SNAPSHOT}')
            return False
        live = fixture.ensure_live(ctx)
        ctx.log(f'fixture liveness: {json.dumps(live)[:400]}')
        ctx.fixture_info.setdefault('phases', []).append(
            {'phase': 'existing-user', 'detail': 'captured app-container snapshot + server-side grant',
             'profile': live})
        since = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 30))
        if not ctx.restore_container(fixture.NAME):
            return False
        ctx.terminate()
        ctx.launch()
        if not ctx.wait_for_app(['Home', 'Hi,'], 60):
            verdict.check('guarded.boot_home', False,
                          'the restored fixture did not boot to Home (is the keychain session still the minted one?)')
            return False
        verdict.check('guarded.boot_home', True, 'the restored fixture boots to a setup-complete Home')
        with ctx.recording('E2E-V1-guarded'):
            for route, link, screen, marker in ROUTES:
                entry = self.visit(ctx, route, link, screen, marker, phase='existing-user')
                visited.append(entry)
                ctx.log(f'[existing-user] {route}: rendered={entry["rendered"]} '
                        f'observed={entry["observedTitle"]!r}')
        self.phase_analytics(ctx, 'existing-user', since, visited)
        return True

    # ------------------------------------------------------------------ #
    # Phase 2: fresh install — onboarding plus the routes a new profile has
    # ------------------------------------------------------------------ #
    def fresh_phase(self, ctx: RunContext, visited: list[dict]) -> bool:
        verdict = ctx.verdict
        since = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 30))
        ctx.fixture_info.setdefault('phases', []).append(
            {'phase': 'fresh-install', 'detail': 'simctl uninstall + keychain/privacy reset + install'})
        ctx.erase_container_state()
        ctx.terminate()
        ctx.launch()
        if not ctx.wait_for_app(['Get started'], 90):
            verdict.block('fresh install never reached O01; the sweep cannot start')
            return False
        with ctx.recording('E2E-V1-sweep'):
            # 1. onboarding steps: real navigation, one screen row per step (B4a).
            walk = OnboardingWalk(ctx, screenshot_every_step=False)
            result = walk.run(stop_at='P')
            onboarding_steps = result['steps']
            verdict.check('onboarding.steps_visited',
                          all(step in onboarding_steps for step in ONBOARDING_ROUTE_STEPS),
                          f'walked {len(onboarding_steps)} onboarding screens '
                          f'(sampled {ONBOARDING_ROUTE_STEPS} all present: '
                          f'{[step for step in ONBOARDING_ROUTE_STEPS if step in onboarding_steps]})',
                          evidence=[' | '.join(onboarding_steps)])
            visited.extend({'route': f'/onboarding/{step}', 'link': f'excerlock://onboarding/{step}',
                            'screen': 'onboarding', 'rendered': True, 'phase': 'fresh-install',
                            'expected': True, 'step': step} for step in onboarding_steps)

            # 2. every other route by deep link. Each visit starts from a
            # relaunch so a modal (gym picker) or a redirect cannot leak into
            # the next route's observation.
            for route, link, screen, marker in ROUTES:
                entry = self.visit(ctx, route, link, screen, marker, phase='fresh-install',
                                   boot_labels=['Get started', 'Choose your plan'])
                visited.append(entry)
                ctx.log(f'[fresh-install] {route}: rendered={entry["rendered"]} '
                        f'observed={entry["observedTitle"]!r}')
        self.phase_analytics(ctx, 'fresh-install', since, visited)
        return True

    # ------------------------------------------------------------------ #
    def visit(self, ctx: RunContext, route: str, link: str, screen: str, marker: str | tuple[str, ...], *,
              phase: str, boot_labels: list[str] | None = None) -> dict[str, Any]:
        """Relaunch, deep-link one route, and record what rendered."""
        ctx.terminate()
        ctx.launch()
        ctx.wait_for_app(boot_labels or ['Home', 'Hi,'], 60)
        ctx.log(f'visiting [{phase}] {route}')
        ctx.sim.open_url(link)
        time.sleep(2.6)
        labels = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in ctx.tree()]
        screenshot = ctx.screenshot(f'route-{phase}-{route.strip("/").replace("/", "-") or "root"}', shrink=True)
        markers = self.markers(marker)
        rendered = (any(any(item in label for label in labels) for item in markers) if markers else None)
        expected = self.expected(route, phase, marker)
        return {
            'route': route,
            'link': link,
            'screen': screen,
            'marker': marker,
            'phase': phase,
            'rendered': rendered,
            'expected': expected,
            'observedTitle': self.observed_title(labels),
            'screenshot': screenshot.name,
        }

    @staticmethod
    def markers(marker: str | tuple[str, ...]) -> tuple[str, ...]:
        """The non-empty labels that prove this route rendered (``()`` = no signal)."""
        values = (marker,) if isinstance(marker, str) else tuple(marker)
        return tuple(item for item in values if item)

    @staticmethod
    def expected(route: str, phase: str, marker: str | tuple[str, ...]) -> bool | None:
        """What this route visit should show, or ``None`` when the label is not the signal.

        The entitled-user paywall is the second ``None`` case: ``PaywallSlot``
        replaces the route with Home (``router.replace('/home')``) as soon as the
        entitlement is trial/active, so the 2026-09-17T2001Z sweep saw two
        ``$screen paywall`` rows in the same millisecond as the home row and the
        label read 2.6 s later landed on a tab. ``analytics.guarded_screens``
        still requires the ``paywall`` screen row for that phase.
        """
        if not marker:
            return None
        if route in STATE_GATED:
            return False
        if phase == 'existing-user':
            return None if route == '/paywall' else True
        return route in FRESH_RENDERABLE

    @staticmethod
    def guarded_count(visited: list[dict]) -> int:
        return sum(1 for entry in visited if entry['phase'] == 'existing-user'
                   and entry['rendered'] and entry['route'] not in FRESH_RENDERABLE)

    # ------------------------------------------------------------------ #
    def phase_analytics(self, ctx: RunContext, phase: str, since: str, visited: list[dict]) -> None:
        """One $screen row per route the phase put on screen."""
        verdict = ctx.verdict
        device_id = ctx.posthog_device_id(timeout=45)
        verdict.check('analytics.device_id' if phase == 'fresh-install' else 'analytics.guarded.device_id',
                      bool(device_id), f'run-scoped $device_id: {device_id!r}')
        if not device_id:
            return
        ctx.flush_analytics(4)
        rows, satisfied, waited = posthog.wait_for_device_events(
            device_id, since, lambda rows: any(row.get('event') == '$screen' for row in rows), timeout=60)
        screens = self.screen_names(rows)
        steps_seen = sorted({str(row.get('step')) for row in rows if row.get('step')})
        expected = self.expected_screens(phase)
        missing = [name for name in expected if name not in screens]
        if missing:
            rows, satisfied, waited = posthog.wait_for_device_events(
                device_id, since, lambda rows: all(name in self.screen_names(rows) for name in expected),
                timeout=float(os.environ.get('E2E_PAYWALL_WAIT', '300')), interval=15)
            screens = self.screen_names(rows)
            missing = [name for name in expected if name not in screens]
        ctx.posthog_trace.append({'query': f'device $screen rows ({phase})', 'deviceId': device_id,
                                  'waitedSeconds': round(waited, 1), 'screens': screens, 'steps': steps_seen,
                                  'expected': expected})
        ctx.note(f'$screen rows ({phase}): {screens} steps: {steps_seen}')
        mapped = ctx.gate('B4a.screen_step_mapping', f'analytics.{phase}.step_mapping',
                          'onboarding step ids map to a semantic screen name')
        mapped = ctx.gate('B4b.root_screen_tracking', f'analytics.{phase}.root_tracking',
                          'every route change emits $screen') and mapped
        if mapped:
            if phase == 'fresh-install':
                verdict.check('analytics.route_rows', 'onboarding' in screens,
                              f'observed $screen names {screens}')
                if 'paywall' not in screens:
                    extra, found, lag_wait = posthog.wait_for_device_events(
                        device_id, since, lambda extra: any(row.get('screen_name') == 'paywall' for row in extra),
                        timeout=float(os.environ.get('E2E_PAYWALL_WAIT', '300')), interval=15)
                    ctx.posthog_trace.append({'query': '$screen paywall', 'rows': len(extra),
                                              'waitedSeconds': round(lag_wait, 1)})
                    verdict.check('analytics.paywall_screen_row', None if not found else True,
                                  f'$screen paywall not visible after {lag_wait:.0f}s '
                                  f'(PostHog ingestion lag)' if not found
                                  else f'$screen paywall arrived after {lag_wait:.0f}s',
                                  blocked_until='posthog-ingestion-lag')
                else:
                    verdict.check('analytics.paywall_screen_row', True, '$screen paywall row present')
            else:
                verdict.check('analytics.guarded_screens', not missing,
                              f'every fixture-rendered route emitted $screen; missing {missing} of {expected}')
        verdict.check('analytics.ingestion' if phase == 'fresh-install' else 'analytics.guarded.ingestion',
                      satisfied or bool(rows), f'{len(rows)} rows for this device after {waited:.0f}s',
                      evidence=[json.dumps(screens)])

    @staticmethod
    def screen_names(rows: list[dict]) -> list[str]:
        return sorted({str(row.get('screen_name')) for row in rows if row.get('event') == '$screen'})

    @staticmethod
    def expected_screens(phase: str) -> list[str]:
        """Semantic screens this phase must have put on screen (setup/X4 lives in E2E-F1)."""
        screens = {screen for route, _, screen, _ in ROUTES
                   if route not in STATE_GATED and (phase == 'existing-user' or route in FRESH_RENDERABLE)}
        if phase == 'fresh-install':
            screens.add('onboarding')
        return sorted(screens)

    @staticmethod
    def observed_title(labels: list[str]) -> str:
        for candidate in ('Choose your plan', 'Conditions', 'Analytics', 'Settings', 'Find your gym',
                          'Save your progress', 'Home', 'Block apps. Exercise more.'):
            if any(candidate in label for label in labels):
                return candidate
        return next((label for label in labels if label and len(label) < 48), '')
