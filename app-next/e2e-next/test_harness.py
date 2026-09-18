#!/usr/bin/env python3
"""Hermetic unit tests for the e2e-next harness contract.

Run: python3 app-next/e2e-next/test_harness.py

These tests never touch a simulator, PostHog or Supabase: they pin the verdict
semantics (FAIL > BLOCKED > PASS, never SKIP-as-pass), the BLOCKED-until naming
against the capability map, the run-scoped PostHog SQL and the onboarding
step identification the walk relies on.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
import unittest.mock
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import harness  # noqa: E402
import posthog  # noqa: E402
from scenarios import SCENARIOS  # noqa: E402
from scenarios.onboarding import identify  # noqa: E402


class VerdictSemantics(unittest.TestCase):
    def verdict(self) -> harness.Verdict:
        return harness.Verdict('E2E-T', 'test')

    def test_passing_assertions_pass(self):
        verdict = self.verdict()
        verdict.check('a', True, 'ok')
        verdict.check('b', True, 'ok')
        self.assertEqual(verdict.status(), harness.PASS)

    def test_any_failure_fails(self):
        verdict = self.verdict()
        verdict.check('a', True)
        verdict.check('b', False, 'bad')
        self.assertEqual(verdict.status(), harness.FAIL)
        self.assertIn('b: bad', verdict.reason())

    def test_blocked_outranks_pass_but_not_fail(self):
        verdict = self.verdict()
        verdict.check('a', True)
        verdict.check('b', None, 'precondition missing', blocked_until='B4a')
        self.assertEqual(verdict.status(), harness.BLOCKED)
        self.assertIn('blocked until B4a', verdict.reason())
        verdict.check('c', False, 'bad')
        self.assertEqual(verdict.status(), harness.FAIL)

    def test_scenario_block_reason_is_blocked(self):
        verdict = self.verdict()
        verdict.block('no fixture')
        self.assertEqual(verdict.status(), harness.BLOCKED)
        self.assertEqual(verdict.reason(), 'no fixture')

    def test_gate_reports_blocked_until_when_unlanded(self):
        verdict = self.verdict()
        capabilities = {'B4a.screen_step_mapping': {'landed': False, 'contract': 'maps step ids'}}
        landed = verdict.gate('B4a.screen_step_mapping', 'screens', 'per-step screens', capabilities=capabilities)
        self.assertFalse(landed)
        self.assertEqual(verdict.status(), harness.BLOCKED)
        self.assertEqual(verdict.assertions[0].blocked_until, 'B4a')

    def test_gate_passes_when_landed(self):
        verdict = self.verdict()
        capabilities = {'B4a.screen_step_mapping': {'landed': True, 'contract': 'maps step ids'}}
        self.assertTrue(verdict.gate('B4a.screen_step_mapping', 'screens', 'per-step screens',
                                     capabilities=capabilities))
        self.assertEqual(verdict.status(), harness.PASS)

    def test_unknown_gate_key_is_blocked_not_passed(self):
        verdict = self.verdict()
        self.assertFalse(verdict.gate('B9.not.a.real.key', 'x', 'y', capabilities={}))
        self.assertEqual(verdict.status(), harness.BLOCKED)


class BuildCache(unittest.TestCase):
    def test_app_source_revision_is_stable_and_short(self):
        import build
        first = build.app_source_revision()
        self.assertRegex(first, r'^[0-9a-f]{12}$')
        self.assertEqual(first, build.app_source_revision())

    def test_cache_matches_only_the_same_revision(self):
        import build
        revision = build.app_source_revision()
        self.assertTrue(build.cache_matches({'appSourceRevision': revision}, revision))
        self.assertFalse(build.cache_matches({'appSourceRevision': 'deadbeef0000'}, revision))
        self.assertFalse(build.cache_matches({}, revision))


class CapabilityMap(unittest.TestCase):
    def test_contract_keys_are_present_and_described(self):
        capabilities = harness.detect_capabilities()
        for key in ('B1.remote_config_copy', 'B2.paywall_error_reporting', 'B3.fallback_paywall',
                    'B4a.screen_step_mapping', 'B4b.root_screen_tracking', 'B6.paywall_funnel_events',
                    'B7.signin_required_flag', 'B10.startup_marks', 'A5.sentry_before_boot'):
            self.assertIn(key, capabilities)
            self.assertIn('landed', capabilities[key])
            self.assertTrue(capabilities[key]['contract'])

    def test_every_scenario_requires_key_exists_in_map(self):
        capabilities = harness.detect_capabilities()
        for scenario in SCENARIOS.values():
            for key in scenario.requires:
                self.assertIn(key, capabilities, f'{scenario.id} requires unknown capability {key}')


class PostHogSql(unittest.TestCase):
    def test_sql_is_scoped_to_the_run_device_id(self):
        sql = posthog.device_events_sql('abc-123', '2026-09-16 22:00:00', events=('$screen', 'paywall_viewed'))
        self.assertIn("properties.$device_id = 'abc-123'", sql)
        self.assertIn("timestamp > toDateTime('2026-09-16 22:00:00')", sql)
        self.assertIn("event in ('$screen', 'paywall_viewed')", sql)

    def test_sql_escapes_quotes(self):
        self.assertIn("'a\\'b'", posthog.device_events_sql("a'b", '2026-09-16 22:00:00'))

    def test_screen_names_filters_to_screen_events(self):
        rows = [{'event': '$screen', 'screen_name': 'home'}, {'event': 'paywall_viewed', 'screen_name': None},
                {'event': '$screen', 'screen_name': 'paywall'}]
        self.assertEqual(posthog.screen_names(rows), ['home', 'paywall'])


class OnboardingIdentification(unittest.TestCase):
    def test_identifies_shared_title_by_body(self):
        self.assertEqual(identify(['Block apps. Exercise more.', 'Less scrolling. More time to move.'])[0], 'O01')
        self.assertEqual(identify(['Block apps. Exercise more.', 'Reduce your screen time and track your progress.'])[0],
                         'O02')
        self.assertEqual(identify(['Block apps. Exercise more.', 'Exercise more each week and stay consistent.'])[0],
                         'O03')

    def test_identifies_branch_and_tail_screens(self):
        self.assertEqual(identify(['Where do you walk?', 'Choose every place that fits your routine.'])[0], 'W1')
        self.assertEqual(identify(['How should walking unlock your apps?', 'Choose the kind of nudge you need.'])[0],
                         'W2')
        self.assertEqual(identify(['Your plan is ready', 'A little movement. More room for your life.'])[0], 'S3')
        self.assertEqual(identify(["We'll remind you before it ends", 'A heads-up, so you can decide what comes next.'])[0],
                         'T2')
        self.assertEqual(identify(['Choose your plan', 'Build a healthier relationship with your phone.'])[0], 'P')

    def test_unknown_screen_is_not_guessed(self):
        self.assertEqual(identify(['Something else entirely']), ('', ''))


class EnvResolution(unittest.TestCase):
    def test_process_env_wins_over_dotfile(self):
        with tempfile.TemporaryDirectory() as folder:
            dotenv = Path(folder) / 'env'
            dotenv.write_text('EXCERLOCK_E2E_TEST_VALUE=from-file\n')
            previous_file = os.environ.get('EXCERLOCK_ENV_FILE')
            previous_value = os.environ.get('EXCERLOCK_E2E_TEST_VALUE')
            os.environ['EXCERLOCK_ENV_FILE'] = str(dotenv)
            harness._DOTENV = None
            try:
                self.assertEqual(harness.env_value('EXCERLOCK_E2E_TEST_VALUE'), 'from-file')
                os.environ['EXCERLOCK_E2E_TEST_VALUE'] = 'from-env'
                self.assertEqual(harness.env_value('EXCERLOCK_E2E_TEST_VALUE'), 'from-env')
            finally:
                os.environ.pop('EXCERLOCK_E2E_TEST_VALUE', None)
                if previous_value is not None:
                    os.environ['EXCERLOCK_E2E_TEST_VALUE'] = previous_value
                if previous_file is None:
                    os.environ.pop('EXCERLOCK_ENV_FILE', None)
                else:
                    os.environ['EXCERLOCK_ENV_FILE'] = previous_file
                harness._DOTENV = None


class ScenarioRegistry(unittest.TestCase):
    def test_expected_scenarios_are_registered(self):
        self.assertEqual(set(SCENARIOS),
                         {'E2E-N1', 'E2E-N4', 'E2E-N4W', 'E2E-E1', 'E2E-V1', 'E2E-S1', 'E2E-A3', 'E2E-A4', 'E2E-E2',
                          'E2E-F1', 'E2E-F2'})

    def test_fixture_mint_precedes_its_consumers_in_the_all_order(self):
        from scenarios import SCENARIO_CLASSES

        order = [cls.id for cls in SCENARIO_CLASSES]
        self.assertLess(order.index('E2E-F1'), order.index('E2E-E1'))
        self.assertLess(order.index('E2E-F1'), order.index('E2E-V1'))
        self.assertLess(order.index('E2E-E1'), order.index('E2E-F2'))
        self.assertEqual(order[-1], 'E2E-F2')

    def test_e2_ota_stub_is_blocked_by_design(self):
        scenario = SCENARIOS['E2E-E2']
        self.assertTrue(scenario.blocked_reason)
        self.assertIn('EAS Update', scenario.blocked_reason)

    def test_fixtures_are_declared(self):
        for scenario in SCENARIOS.values():
            self.assertIn(scenario.fixture, {'fresh-install', 'existing-user', 'none'})


class FixtureContract(unittest.TestCase):
    @staticmethod
    def _container(folder: str, stores: dict) -> Path:
        snapshot = Path(folder) / 'existing-user'
        storage = snapshot / 'Library' / 'Application Support' / 'RCTAsyncLocalStorage_V1'
        storage.mkdir(parents=True)
        manifest = {f'excerlock-next.{name}.v1': json.dumps({'state': {'data': data}, 'version': 0})
                    for name, data in stores.items()}
        (storage / 'manifest.json').write_text(json.dumps(manifest))
        return snapshot

    def test_manifest_scan_reads_setup_and_entitlement_state(self):
        import fixture

        with tempfile.TemporaryDirectory() as folder:
            snapshot = self._container(folder, {
                'onboarding': {'step': 'P', 'setupComplete': True},
                'entitlement': {'entitlement': {'status': 'active', 'renewsAt': None}},
            })
            self.assertIs(fixture.persisted_setup_complete(snapshot)[0], True)
            self.assertIs(fixture.persisted_entitlement(snapshot)[0], True)

    def test_manifest_scan_rejects_setup_incomplete(self):
        import fixture

        with tempfile.TemporaryDirectory() as folder:
            snapshot = self._container(folder, {'onboarding': {'step': 'P', 'setupComplete': False}})
            found, detail = fixture.persisted_setup_complete(snapshot)
            self.assertIs(found, False)
            self.assertIn('False', detail)

    def test_large_values_live_in_the_key_file(self):
        import hashlib

        import fixture

        with tempfile.TemporaryDirectory() as folder:
            snapshot = Path(folder) / 'existing-user'
            storage = snapshot / 'Library' / 'RCTAsyncLocalStorage_V1'
            storage.mkdir(parents=True)
            (storage / 'manifest.json').write_text(json.dumps({'excerlock-next.onboarding.v1': None}))
            (storage / hashlib.md5(b'excerlock-next.onboarding.v1').hexdigest()).write_text(
                json.dumps({'state': {'data': {'setupComplete': True}}, 'version': 0}))
            self.assertIs(fixture.persisted_setup_complete(snapshot)[0], True)

    def test_manifest_scan_reports_unknown_for_a_missing_snapshot(self):
        import fixture

        with tempfile.TemporaryDirectory() as folder:
            self.assertIsNone(fixture.persisted_setup_complete(Path(folder) / 'nope')[0])
            missing = Path(folder) / 'existing-user'
            missing.mkdir()
            (missing / 'Library').mkdir()
            self.assertIs(fixture.persisted_setup_complete(missing)[0], False)

    def test_entitlement_scan_does_not_accept_none(self):
        import fixture

        with tempfile.TemporaryDirectory() as folder:
            snapshot = self._container(folder, {'entitlement': {'entitlement': {'status': 'none'}}})
            found, detail = fixture.persisted_entitlement(snapshot)
            self.assertIs(found, False)
            self.assertIn('none', detail)

    def test_adapty_grant_readback_semantics(self):
        import adapty

        server = adapty.AdaptyServer(secret='secret_test', base='https://example.invalid/api/v2/server-side-api')
        payload = {'data': {'access_levels': [
            {'access_level_id': 'premium', 'starts_at': '2020-01-01T00:00:00Z',
             'expires_at': '2030-01-01T00:00:00Z'}]}}
        self.assertTrue(adapty.AdaptyServer.active(payload))
        self.assertEqual(adapty.AdaptyServer.access_level(payload)['access_level_id'], 'premium')
        expired = {'data': {'access_levels': [
            {'access_level_id': 'premium', 'starts_at': '2020-01-01T00:00:00Z',
             'expires_at': '2021-01-01T00:00:00Z'}]}}
        self.assertFalse(adapty.AdaptyServer.active(expired))
        self.assertFalse(adapty.AdaptyServer.active({'data': {'access_levels': []}}))

    def test_adapty_secret_is_required(self):
        import adapty

        with unittest.mock.patch.object(adapty, 'env_value', return_value=''):
            self.assertFalse(adapty.AdaptyServer.configured())
            with self.assertRaises(adapty.AdaptySecretMissing):
                adapty.AdaptyServer(secret='')

    def test_adapty_grant_targets_the_documented_endpoint(self):
        import adapty

        captured = {}

        class Response:
            status = 200

            def read(self):
                return b'{"data": {}}'

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        def fake_urlopen(request, timeout=0):
            captured['request'] = request
            return Response()

        server = adapty.AdaptyServer(secret='secret_test', base='https://api.adapty.io/api/v2/server-side-api')
        with unittest.mock.patch.object(adapty.urllib.request, 'urlopen', fake_urlopen):
            status, _ = server.grant('uid-1', days=3)
        self.assertEqual(status, 200)
        request = captured['request']
        self.assertEqual(request.method, 'POST')
        self.assertEqual(request.full_url, 'https://api.adapty.io/api/v2/server-side-api/purchase/profile/grant/access-level/')
        self.assertEqual(request.get_header('Authorization'), 'Api-Key secret_test')
        self.assertEqual(request.get_header('Adapty-customer-user-id'), 'uid-1')
        body = json.loads(request.data.decode())
        self.assertEqual(body['access_level_id'], 'premium')
        self.assertIn('expires_at', body)


class FieldTypingRepair(unittest.TestCase):
    """``idb ui text`` is lossy; typing must converge anyway (harness.type_verified)."""

    @staticmethod
    def _type(text: str, mutations: dict[int, str] | None = None, *, start: str = '') -> tuple[bool, str]:
        """Run ``type_verified`` against a keyboard that drops/garbles pieces.

        ``mutations`` maps a 1-based ``type_text`` call index to the alteration
        applied to that piece: 'drop' loses the last character, any other string
        replaces the last two characters with it (the two observed idb failure
        shapes).
        """
        mutations = mutations or {}
        ctx = harness.RunContext.__new__(harness.RunContext)
        ctx.udid = 'test-udid'
        state = {'value': start, 'calls': 0}
        ctx.field_value = lambda: state['value']
        ctx.log = lambda message: None

        def fake_type(piece: str) -> None:
            state['calls'] += 1
            mutation = mutations.get(state['calls'])
            if mutation == 'drop':
                piece = piece[:-1]
            elif mutation:
                piece = piece[:-2] + mutation
            state['value'] += piece

        ctx.type_text = fake_type

        def fake_shell(command, **kwargs):
            if isinstance(command, list) and 'key-sequence' in command:
                delete = sum(1 for part in command if part == '42')
                state['value'] = state['value'][:max(0, len(state['value']) - delete)]

            class Result:
                returncode = 0
                stdout = ''

            return Result()

        with unittest.mock.patch.object(harness, 'shell', fake_shell):
            ok = ctx.type_verified(text)
        return ok, state['value']

    def test_dropped_characters_are_retyped(self):
        email = 'e2e-fixture-20260917t1958z@excerlock.com'
        ok, value = self._type(email, {1: 'drop', 3: 'drop'})
        self.assertTrue(ok)
        self.assertEqual(value, email)

    def test_a_garbled_piece_is_repaired(self):
        email = 'e2e-fixture-20260917t1958z@excerlock.com'
        ok, value = self._type(email, {2: 'e-'})
        self.assertTrue(ok)
        self.assertEqual(value, email)

    def test_an_overtyped_tail_is_removed(self):
        ok, value = self._type('e2e-fixture', start='e2e-fixture-oops')
        self.assertTrue(ok)
        self.assertEqual(value, 'e2e-fixture')


class RouteStateExpectations(unittest.TestCase):
    def test_fresh_install_renders_only_the_paywall_and_gym_picker(self):
        from scenarios.v1_screen_sweep import V1ScreenSweep

        self.assertTrue(V1ScreenSweep.expected('/paywall', 'fresh-install', 'Choose your plan'))
        self.assertTrue(V1ScreenSweep.expected('/gym-picker', 'fresh-install', 'Pick your gym'))
        self.assertFalse(V1ScreenSweep.expected('/settings/account', 'fresh-install', 'Account'))

    def test_existing_user_renders_the_guarded_routes(self):
        from scenarios.v1_screen_sweep import V1ScreenSweep

        for route in ('/settings/account', '/settings/report', '/builder', '/unlock/gym', '/(tabs)/home'):
            self.assertTrue(V1ScreenSweep.expected(route, 'existing-user', 'x'), route)

    def test_setup_step_is_state_gated_in_both_states(self):
        from scenarios.v1_screen_sweep import V1ScreenSweep

        self.assertFalse(V1ScreenSweep.expected('/setup/X4', 'fresh-install', 'Save your progress'))
        self.assertFalse(V1ScreenSweep.expected('/setup/X4', 'existing-user', 'Save your progress'))

    def test_markerless_routes_are_not_judged_by_a_label(self):
        from scenarios.v1_screen_sweep import V1ScreenSweep

        self.assertIsNone(V1ScreenSweep.expected('/builder', 'fresh-install', ''))
        # An empty marker must never become a truthy ('' ,) that matches every label.
        self.assertEqual(V1ScreenSweep.markers(''), ())
        self.assertEqual(V1ScreenSweep.markers(('Pick your gym', '')), ('Pick your gym',))

    def test_entitled_paywall_is_not_judged_by_its_label(self):
        from scenarios.v1_screen_sweep import V1ScreenSweep

        # PaywallSlot forwards an entitled profile to Home, so the guarded phase
        # proves the route through its $screen row, not the on-screen label.
        self.assertIsNone(V1ScreenSweep.expected('/paywall', 'existing-user', ('Unlock ExcerLock Premium',)))
        self.assertTrue(V1ScreenSweep.expected('/paywall', 'fresh-install', ('Choose your plan',)))

    def test_expected_screens_cover_the_guarded_route_set(self):
        from scenarios.v1_screen_sweep import V1ScreenSweep

        guarded = V1ScreenSweep.expected_screens('existing-user')
        self.assertIn('builder', guarded)
        self.assertIn('unlock_treadmill', guarded)
        self.assertIn('settings_legal', guarded)
        self.assertNotIn('setup', guarded)
        self.assertEqual(V1ScreenSweep.expected_screens('fresh-install'), ['gym_picker', 'onboarding', 'paywall'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
