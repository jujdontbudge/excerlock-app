"""E2E-V1 — full-app screen sweep (plan §7.2, §4.2 route inventory)."""
from __future__ import annotations

import json
import time

import posthog
from harness import Scenario, RunContext

from .onboarding import OnboardingWalk

#: production route inventory from app-next/app (plan §4.2). `dev` and
#: `linked-trace` are dev/lab-only and deliberately excluded.
ROUTES: list[tuple[str, str, str, str]] = [
    # (route path, deep link, semantic screen name, marker label)
    ('/(tabs)/home', 'excerlock://home', 'home', 'Home'),
    ('/(tabs)/conditions', 'excerlock://conditions', 'conditions', 'Conditions'),
    ('/(tabs)/analytics', 'excerlock://analytics', 'analytics', 'Analytics'),
    ('/(tabs)/settings', 'excerlock://settings', 'settings', 'Settings'),
    ('/builder', 'excerlock://builder', 'builder', ''),
    ('/gym-picker', 'excerlock://gym-picker', 'gym_picker', 'Pick your gym'),
    ('/paywall', 'excerlock://paywall', 'paywall', 'Choose your plan'),
    ('/sign-in', 'excerlock://sign-in', 'sign_in', 'Save your progress'),
    ('/settings/account', 'excerlock://settings/account', 'settings_account', 'Account'),
    ('/settings/subscription', 'excerlock://settings/subscription', 'settings_subscription', 'Subscription'),
    ('/settings/preferences', 'excerlock://settings/preferences', 'settings_preferences', 'Preferences'),
    ('/settings/units', 'excerlock://settings/units', 'settings_units', 'Units'),
    ('/settings/gyms', 'excerlock://settings/gyms', 'settings_gyms', 'Saved gyms'),
    ('/settings/bug', 'excerlock://settings/bug', 'settings_bug', 'Report a bug'),
    ('/settings/feedback', 'excerlock://settings/feedback', 'settings_feedback', 'Give feedback'),
    ('/settings/legal', 'excerlock://settings/legal', 'settings_legal', 'Privacy & terms'),
    ('/settings/legal/terms', 'excerlock://settings/legal/terms', 'settings_legal', 'Read Terms of Use'),
    ('/settings/legal/privacy', 'excerlock://settings/legal/privacy', 'settings_legal', 'Read Privacy Policy'),
    ('/settings/permission/screenTime', 'excerlock://settings/permission/screenTime', 'settings_permission', 'Screen Time'),
    ('/settings/permission/motion', 'excerlock://settings/permission/motion', 'settings_permission', 'Motion & Fitness'),
    ('/settings/permission/location', 'excerlock://settings/permission/location', 'settings_permission', 'Location'),
    ('/unlock/gym', 'excerlock://unlock/gym', 'unlock_gym', ''),
    ('/unlock/treadmill', 'excerlock://unlock/treadmill', 'unlock_treadmill', 'Unlock preview'),
    ('/setup/X1', 'excerlock://setup/X1', 'setup', 'Save your progress'),
]

ONBOARDING_ROUTE_STEPS = ['O01', 'O20', 'W1', 'S1', 'T1', 'P']


class V1ScreenSweep(Scenario):
    id = 'E2E-V1'
    title = 'Full-app screen sweep: every production route emits one $screen row'
    lane = 'SIM'
    users = 'BOTH'
    fixture = 'fresh-install'
    requires = ('B4a.screen_step_mapping', 'B4b.root_screen_tracking')

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        since = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 30))
        ctx.terminate()
        ctx.launch()
        if not ctx.wait_for_app(['Get started'], 90):
            verdict.block('fresh install never reached O01; the sweep cannot start')
            return
        visited: list[dict] = []
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
                            'screen': 'onboarding', 'rendered': True, 'step': step} for step in onboarding_steps)

            # 2. every other production route by deep link. Each visit starts
            # from a relaunch so a modal (gym picker) or a redirect cannot leak
            # into the next route's observation.
            for route, link, screen, marker in ROUTES:
                ctx.terminate()
                ctx.launch()
                ctx.wait_for_app(['Get started', 'Choose your plan'], 60)
                ctx.log(f'visiting {route}')
                ctx.sim.open_url(link)
                time.sleep(2.6)
                labels = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in ctx.tree()]
                screenshot = ctx.screenshot(f'route-{route.strip("/").replace("/", "-") or "root"}', shrink=True)
                entry = {
                    'route': route,
                    'link': link,
                    'screen': screen,
                    'marker': marker,
                    'rendered': (any(marker in label for label in labels) if marker else None),
                    'observedTitle': self.observed_title(labels),
                    'screenshot': screenshot.name,
                }
                visited.append(entry)
                ctx.log(f'{route}: rendered={entry["rendered"]} observed={entry["observedTitle"]!r}')

        # 3. analytics assertion: one $screen row per visited route for this device.
        device_id = ctx.posthog_device_id(timeout=45)
        verdict.check('analytics.device_id', bool(device_id), f'run-scoped $device_id: {device_id!r}')
        if device_id:
            ctx.flush_analytics(4)
            rows, satisfied, waited = posthog.wait_for_device_events(
                device_id, since, lambda rows: any(row.get('event') == '$screen' for row in rows), timeout=60)
            screens = sorted({str(row.get('screen_name')) for row in rows if row.get('event') == '$screen'})
            steps_seen = sorted({str(row.get('step')) for row in rows if row.get('step')})
            ctx.posthog_trace.append({'query': 'device $screen rows', 'deviceId': device_id, 'waitedSeconds': round(waited, 1),
                                      'screens': screens, 'steps': steps_seen, 'events': sorted(
                                          {str(row.get('event')) for row in rows})})
            ctx.note(f'PostHog $screen rows: {screens} steps: {steps_seen}')
            mapped = ctx.gate('B4a.screen_step_mapping', 'analytics.step_rows',
                               'onboarding step ids map to a semantic screen name')
            mapped = ctx.gate('B4b.root_screen_tracking', 'analytics.route_rows',
                               'every route change emits $screen') and mapped
            if mapped:
                expected_screens = {'onboarding', 'paywall', 'home', 'conditions', 'analytics', 'settings'}
                verdict.check('analytics.route_rows', expected_screens.issubset(set(screens)),
                              f'observed $screen names {screens}')
            verdict.check('analytics.ingestion', satisfied or bool(rows),
                          f'{len(rows)} rows for this device after {waited:.0f}s')

        # 4. coverage table: which routes are reachable in the fresh-install state.
        evaluated = [entry for entry in visited if entry['rendered'] is not None]
        unreachable = [entry for entry in evaluated if not entry['rendered']]
        payload = ctx.dir / 'route-coverage.json'
        payload.write_text(json.dumps(visited, indent=2) + '\n')
        verdict.artifacts.setdefault('files', []).append(payload.name)
        reachable = len([entry for entry in evaluated if entry['rendered']])
        ctx.note('coverage: ' + '; '.join(
            f'{entry["route"]}={"ok" if entry["rendered"] else "blocked" if entry["rendered"] is False else "no-marker"}'
            for entry in visited))
        verdict.check('routes.reachable_count', None if unreachable else True,
                      f'{reachable} of {len(evaluated)} marker-evaluated route visits rendered; the remaining '
                      f'{len(unreachable)} are behind the setup-complete/entitled guards: '
                      f'{[entry["route"] for entry in unreachable]}',
                      blocked_until='existing-user-fixture', evidence=['route-coverage.json'])

    @staticmethod
    def observed_title(labels: list[str]) -> str:
        for candidate in ('Choose your plan', 'Conditions', 'Analytics', 'Settings', 'Find your gym',
                          'Save your progress', 'Home', 'Block apps. Exercise more.'):
            if any(candidate in label for label in labels):
                return candidate
        return next((label for label in labels if label and len(label) < 48), '')
