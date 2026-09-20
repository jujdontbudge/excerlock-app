"""E2E-D1: actual plan commit -> illustrated demo; six variants and every phase.

No entitlement/purchase fixture: this is pre-paywall onboarding. The presentation
seek port is accepted only in preview/dev builds. It cannot mutate a rule or
invoke a detector. The driver chooses every draft using the actual onboarding UI.
"""
from __future__ import annotations

import json
import subprocess
import time

import fixture
import posthog
from harness import RunContext, Scenario
from .onboarding import OnboardingWalk

# (kind, place, chosen mode, (scene time, phase, phone, locked)...)
CASES = [
    ('walk-steps', 'outside', 'Reach a step goal', [(1, 'walking', 'shield', True), (8, 'unlocked', 'tiktok', False)]),
    ('walk-state', 'outside', 'Unlock while walking (Recommended)', [(0.4, 'walking', 'tiktok', False), (1.4, 'walking', 'tiktok', False), (2.2, 'walking', 'tiktok', False), (6, 'blocked', 'shield', True)]),
    ('walk-state', 'treadmill', 'Unlock while walking (Recommended)', [(1, 'prop', 'excerlock', True), (3.5, 'scan', 'excerlock', True), (6, 'walking', 'tiktok', False), (11, 'blocked', 'shield', True)]),
    ('walk-minutes', 'outside', 'Walk for a set time', [(3, 'walking', 'shield', True), (8, 'unlocked', 'tiktok', False)]),
    ('gym-arrival', 'outside', 'Arrive at the gym', [(2, 'approach', 'shield', True), (5, 'confirming', 'shield', True), (8, 'unlocked', 'tiktok', False), (12, 'leave', 'tiktok', False)]),
    ('gym-minutes', 'outside', 'Spend time at the gym', [(2, 'approach', 'shield', True), (5, 'confirming', 'shield', True), (10, 'counting', 'tiktok', False), (14, 'unlocked', 'tiktok', False), (17, 'leave', 'tiktok', False)]),
]


def matches_state(node: dict, kind: str, place: str, phase: str, phone: str, locked: bool) -> bool:
    wanted = f'condition-demo-{kind}-{place}-{phase}-{phone}-{"locked" if locked else "unlocked"}'
    title = {
        'prop': 'Phone propped on the console', 'scan': 'Reading your stride',
        'walking': 'Unlocked while you walk' if kind == 'walk-state' else 'Apps are blocked',
        'blocked': 'Apps are blocked', 'approach': 'Apps are blocked',
        'confirming': "Confirming you're here", 'counting': 'Unlocked while at the gym',
        'unlocked': 'Unlocked for the rest of today', 'leave': 'Unlocked for the rest of today',
    }[phase]
    return (node.get('AXIdentifier') or node.get('AXUniqueId')) == wanted and (node.get('AXLabel') or '').startswith(title)


def has_state(ctx: RunContext, kind: str, place: str, phase: str, phone: str, locked: bool) -> bool:
    deadline = time.monotonic() + 8
    while time.monotonic() < deadline:
        if any(matches_state(node, kind, place, phase, phone, locked) for node in ctx.tree()):
            return True
        time.sleep(0.15)
    return False


class D1ConditionDemo(Scenario):
    id = 'E2E-D1'
    title = 'Every selected condition: plan commit, demo states, hold and live view analytics'
    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'

    def run(self, ctx: RunContext) -> None:
        since = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())
        ctx.launch()
        walk = OnboardingWalk(ctx)
        observed = walk.run(stop_at='S3b')
        reached = ctx.wait_for('How your plan works')
        ctx.verdict.check('navigation.after_plan', reached, f'Observed real onboarding to demo: {observed}')
        if not reached:
            return
        for index, (kind, place, mode, phases) in enumerate(CASES):
            if index and not self.choose_plan(ctx, kind, place, mode):
                ctx.verdict.check(f'{kind}.{place}.plan', False, 'Could not select and commit this draft in the UI')
                continue
            before, source = fixture.persisted_store_state('excerlock-next.rules.v1', ctx.app_container())
            rules = (before or {}).get('rules', [])
            expected_kind = 'state' if kind == 'walk-state' else 'event' if kind == 'gym-arrival' else 'target'
            ctx.verdict.check(f'{kind}.{place}.persisted_plan', len(rules) == 1 and rules[0].get('mode', {}).get('kind') == expected_kind,
                              f'Actual S3 commit, source={source}, rule modes={[r.get("mode") for r in rules]}')
            for at, phase, phone, locked in phases:
                ctx.sim.open_url(f'excerlock://onboarding/S3b?demoTime={at}&demoPause=1')
                ok = has_state(ctx, kind, place, phase, phone, locked)
                image = ctx.screenshot(f'{index + 1:02d}-{kind}-{place}-{phase}-{at}s', shrink=False)
                ctx.verdict.check(f'{kind}.{place}.{phase}.{at}s', ok, f'Visible phase={phase}, phone={phone}, locked={locked}', evidence=[str(image)])
            if kind == 'walk-state' and place == 'outside':
                self.hold_and_record(ctx)
            ctx.tap('Continue')
            advanced = ctx.wait_for('Help us make ExcerLock better')
            after, _ = fixture.persisted_store_state('excerlock-next.rules.v1', ctx.app_container())
            ctx.verdict.check(f'{kind}.{place}.continue_no_commit', advanced and after == before,
                              'Continue reaches S4 and leaves persisted rule state byte-equivalent')
            ctx.screenshot(f'{index + 1:02d}-S4', shrink=False)
            ctx.tap('Back')
            back = ctx.wait_for('How your plan works')
            ctx.tap('Back')
            ctx.verdict.check(f'{kind}.{place}.back', back and ctx.wait_for('Your plan is ready'), 'Back returns through S3b to S3')
        device_id = ctx.posthog_device_id()
        ctx.verdict.check('analytics.device_id', bool(device_id), 'Read the run-specific device ID from the real app container')
        if device_id:
            ctx.flush_analytics(4)
            query = ("select properties.scenario as scenario, properties.place as place from events where "
                     f"properties.$device_id={posthog.sql_literal(device_id)} and timestamp>toDateTime({posthog.sql_literal(since)}) "
                     "and event='onboarding_screen_viewed' and properties.screen='plan-demo'")
            expected = {(kind, place if kind == 'walk-state' else '') for kind, place, _, _ in CASES}
            def covered(rows):
                return expected.issubset({(row.get('scenario'), row.get('place') or '') for row in rows})
            rows, ok, waited = posthog.wait_for_query(query, covered, timeout=60)
            ctx.posthog_trace.append({'query': query, 'rows': rows, 'waitedSeconds': waited})
            ctx.verdict.check('analytics.live_scenario_views', ok, 'Live PostHog ingested every selected scenario/place', evidence=[json.dumps(rows)])
        ctx.note('This tests the explanatory UI and persisted plan plus live analytics, not native Family Controls or real sensor enforcement (unavailable on simulator).')

    def choose_plan(self, ctx: RunContext, kind: str, place: str, mode: str) -> bool:
        ctx.sim.open_url('excerlock://onboarding/O20')
        if not ctx.wait_for('What exercise should unlock your apps?'):
            return False
        if not ctx.tap('Walking' if kind.startswith('walk') else 'Gym') or not ctx.tap('Continue'):
            return False
        if kind.startswith('walk'):
            if not ctx.wait_for('Where do you walk?') or not ctx.tap('Treadmill' if place == 'treadmill' else 'Outside') or not ctx.tap('Continue'):
                return False
            if not ctx.wait_for('How should walking unlock your apps?') or not ctx.tap(mode) or not ctx.tap('Continue'):
                return False
            if kind != 'walk-state':
                if not ctx.wait_for('Set your walking goal') or not ctx.tap('Continue'):
                    return False
        else:
            if not ctx.wait_for('What counts at the gym?') or not ctx.tap(mode) or not ctx.tap('Continue'):
                return False
            if kind == 'gym-minutes':
                if not ctx.wait_for('How long at the gym unlocks your phone?') or not ctx.tap('Continue'):
                    return False
        if not ctx.wait_for('When should blocking be active?') or not ctx.tap('Continue'):
            return False
        return ctx.wait_for('Your plan is ready', timeout=25) and ctx.tap('Use this plan') and ctx.wait_for('How your plan works')

    def hold_and_record(self, ctx: RunContext) -> None:
        ctx.sim.open_url('excerlock://onboarding/S3b?demoTime=6&demoPause=1')
        if not has_state(ctx, 'walk-state', 'outside', 'blocked', 'shield', True):
            ctx.verdict.check('hold.precondition', False, 'Stopped shield was not visible')
            return
        node = ctx.find('Continue walking. Press and hold to walk. Release to stop.')
        if not node:
            ctx.verdict.check('hold.control', False, 'Accessible hold control not found')
            return
        frame = node['frame']
        process = subprocess.Popen(['idb', 'ui', 'tap', '--udid', ctx.udid, '--duration', '3.5',
                                    str(round(frame['x'] + frame['width'] / 2)), str(round(frame['y'] + frame['height'] / 2))],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        try:
            time.sleep(0.5)
            held = has_state(ctx, 'walk-state', 'outside', 'walking', 'tiktok', False)
            ctx.screenshot('hold-walking', shrink=False)
            ctx.verdict.check('hold.press_unlocks', held, 'A real sustained native touch shows walking and TikTok')
            process.wait(timeout=10)
            released = has_state(ctx, 'walk-state', 'outside', 'blocked', 'shield', True)
            ctx.screenshot('hold-released', shrink=False)
            ctx.verdict.check('hold.release_locks', released, 'Touch-up shows stopped character and shield')
            time.sleep(3.2)
            ctx.verdict.check('hold.auto_resume', has_state(ctx, 'walk-state', 'outside', 'walking', 'tiktok', False), 'After three stopped seconds, auto walking resumes')
        finally:
            if process.poll() is None:
                process.terminate()
                process.wait(timeout=5)
        ctx.sim.open_url('excerlock://onboarding/S3b?demoTime=0&demoPause=0')
        with ctx.recording('walking-10s'):
            time.sleep(10)
