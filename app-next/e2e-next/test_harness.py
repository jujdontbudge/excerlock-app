#!/usr/bin/env python3
"""Hermetic unit tests for the e2e-next harness contract.

Run: python3 app-next/e2e-next/test_harness.py

These tests never touch a simulator, PostHog or Supabase: they pin the verdict
semantics (FAIL > BLOCKED > PASS, never SKIP-as-pass), the BLOCKED-until naming
against the capability map, the run-scoped PostHog SQL and the onboarding
step identification the walk relies on.
"""
from __future__ import annotations

import os
import sys
import tempfile
import unittest
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
                         {'E2E-N1', 'E2E-N4', 'E2E-N4W', 'E2E-E1', 'E2E-V1', 'E2E-S1', 'E2E-A3', 'E2E-A4', 'E2E-E2'})

    def test_e2_ota_stub_is_blocked_by_design(self):
        scenario = SCENARIOS['E2E-E2']
        self.assertTrue(scenario.blocked_reason)
        self.assertIn('EAS Update', scenario.blocked_reason)

    def test_fixtures_are_declared(self):
        for scenario in SCENARIOS.values():
            self.assertIn(scenario.fixture, {'fresh-install', 'existing-user', 'none'})


if __name__ == '__main__':
    unittest.main(verbosity=2)
