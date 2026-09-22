"""E2E-E1 — existing user relaunch: no paywall, Home, identity restored (§7.2)."""
from __future__ import annotations

import json
import os
import time

import posthog
from harness import Scenario, RunContext


class E1ExistingUserHome(Scenario):
    id = 'E2E-E1'
    title = 'Existing signed-in user relaunch: no paywall, Home, identity restored'
    lane = 'SIM'
    users = 'EXISTING'
    fixture = 'existing-user'
    requires = ('B4b.root_screen_tracking',)

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        since = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 30))
        ctx.launch()
        home = ctx.wait_for_any(['Home', 'Hello,'], 60)
        if not home:
            # The existing-user fixture must boot straight to Home. Anything else
            # means the restored state is not a completed profile.
            labels = sorted({label for label in ctx.labels() if label})[:12]
            verdict.block('existing-user fixture did not boot to Home (observed: '
                          + json.dumps(labels) + '); the snapshot is not a setup-complete profile')
            return
        verdict.check('boot.no_paywall', not any('Choose your plan' in label for label in ctx.labels()),
                      'relaunch lands on Home without a paywall')
        ctx.screenshot('home')

        device_id = ctx.posthog_device_id(timeout=45)
        verdict.check('analytics.device_id', bool(device_id), f'run-scoped $device_id: {device_id!r}')
        if device_id:
            ctx.flush_analytics(4)
            rows, satisfied, waited = posthog.wait_for_device_events(
                device_id, since, lambda rows: any(row.get('event') == '$screen' for row in rows), timeout=60)
            screens = posthog.screen_names(rows)
            if 'home' not in screens:
                # E2E-F1 minted on this same $device_id seconds earlier, so its
                # onboarding rows satisfy the "any $screen" predicate before the
                # home row is ingested (2026-09-17T1948Z run); wait for the row
                # this assertion is actually about.
                rows, satisfied, waited = posthog.wait_for_device_events(
                    device_id, since, lambda rows: 'home' in posthog.screen_names(rows),
                    timeout=float(os.environ.get('E2E_PAYWALL_WAIT', '300')), interval=15)
                screens = posthog.screen_names(rows)
            ctx.posthog_trace.append({'query': 'device $screen rows', 'deviceId': device_id,
                                      'waitedSeconds': round(waited, 1), 'screens': screens,
                                      'events': sorted({str(row.get('event')) for row in rows})})
            ctx.note(f'PostHog rows for this device: {posthog.summarise(rows)}')
            if ctx.gate('B4b.root_screen_tracking', 'analytics.home_screen_contract',
                         '$screen home emitted on the home route'):
                verdict.check('analytics.home_screen', 'home' in screens, f'$screen rows: {screens}')
            verdict.check('analytics.ingestion', satisfied or bool(rows), f'{len(rows)} rows after {waited:.0f}s')

        marks = ctx.startup_marks()
        ctx.note(f'startup signposts: {json.dumps(marks)}')
        home_budget = marks.get('delegateToInteractiveHome')
        verdict.check('startup.home_budget', None if home_budget is None else home_budget <= 2.5,
                      'no InteractiveHome signpost observed' if home_budget is None
                      else f'delegate → interactive Home {home_budget:.2f}s (budget ≤2.5s, §6.2)',
                      blocked_until='B10.startup_marks', evidence=[json.dumps(marks)])
