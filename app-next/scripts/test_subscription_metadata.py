import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('subscription_metadata',
                                             Path(__file__).with_name('subscription-metadata.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

GRID = Path(__file__).resolve().parent.parent / 'storekit' / 'ExcerLock.storekit'


def aligned_snapshot(contracts):
    """A snapshot in which every SKU matches its contract."""
    groups = {}
    subscriptions = []
    for contract in module.contract_rows(contracts):
        group = groups.setdefault(contract['groupName'], {
            'id': 'group-' + contract['group'],
            'referenceName': contract['groupName'],
            'versionId': 'version-' + contract['group'],
            'versionState': 'PREPARE_FOR_SUBMISSION',
            'localizations': [{'id': 'group-loc-' + contract['group'], 'locale': module.LOCALE,
                               'name': module.GROUP_DISPLAY_NAME, 'customAppName': 'ExcerLock'}],
        })
        subscriptions.append({
            'id': 'sub-' + contract['productId'],
            'productId': contract['productId'],
            'referenceName': contract['name'],
            'state': 'READY_TO_SUBMIT',
            'period': contract['periodDuration'],
            'groupLevel': contract['level'],
            'groupId': group['id'],
            'groupName': contract['groupName'],
            'reviewNote': None,
            'versionId': 'version-' + contract['productId'],
            'versionState': 'PREPARE_FOR_SUBMISSION',
            'localizations': [{'id': 'loc-' + contract['productId'], 'locale': module.LOCALE,
                               'name': contract['name'], 'description': contract['description']}],
            'versionImageCount': 0,
            'productReviewScreenshotId': 'shot-' + contract['productId'],
            'introductoryOffers': ([] if contract['trialDuration'] is None else
                                   [{'duration': contract['trialDuration'], 'offerMode': 'FREE_TRIAL',
                                     'numberOfPeriods': 1, 'startDate': '2026-09-09'}]),
        })
    return {'app': module.ASC_APP, 'groups': [groups[key] for key in sorted(groups)], 'subscriptions': subscriptions}


def find(snapshot, product_id):
    return next(row for row in snapshot['subscriptions'] if row['productId'] == product_id)


def findings_by_kind(findings, kind):
    return [finding for finding in findings if finding['kind'] == kind]


class ContractTests(unittest.TestCase):
    def setUp(self):
        with open(GRID, encoding='utf-8') as handle:
            self.grid = json.load(handle)
        self.contracts = module.build_contracts(self.grid)

    def test_covers_every_harness_product(self):
        self.assertEqual(51, len(self.contracts))
        grid = [c for c in self.contracts.values() if c['family'] == 'grid']
        self.assertEqual(45, len(grid))
        self.assertEqual(6, len([c for c in self.contracts.values() if c['family'] == 'A/B']))

    def test_grid_levels_follow_the_grid_order(self):
        grid = sorted([c for c in self.contracts.values() if c['family'] == 'grid'],
                      key=lambda c: c['level'])
        self.assertEqual(list(range(1, 46)), [c['level'] for c in grid])
        self.assertEqual('Weekly', grid[0]['periodLabel'])
        self.assertEqual('Monthly', grid[9]['periodLabel'])
        self.assertEqual('Annual', grid[30]['periodLabel'])
        self.assertEqual(['$5.99', '$5.99', '$5.99'], [c['name'].split(' ')[1] for c in grid[:3]])
        self.assertEqual(['Weekly'] * 3 + ['Monthly'] * 7 + ['Annual'] * 5,
                         [c['periodLabel'] for c in grid if c['trial'] == 't0'])

    def test_names_and_descriptions_fit_app_store_connect(self):
        for contract in self.contracts.values():
            self.assertLessEqual(len(contract['name']), module.MAX_NAME, contract['productId'])
            self.assertLessEqual(len(contract['description']), module.MAX_DESCRIPTION, contract['productId'])
            self.assertTrue(contract['name'])
            self.assertTrue(contract['description'])

    def test_display_names_are_unique_inside_their_group(self):
        for group in {c['groupName'] for c in self.contracts.values()}:
            names = [c['name'] for c in self.contracts.values()
                     if c['groupName'] == group and c['family'] == 'grid']
            self.assertEqual(len(names), len(set(names)), group)

    def test_grid_contract_is_derived_from_the_product_id(self):
        contract = self.contracts['com.johansardar.excerlock.premium.monthly.1799.t3']
        self.assertEqual('Monthly $17.99 (3-day trial)', contract['name'])
        self.assertEqual('Unlock your apps by exercising. Renews monthly.', contract['description'])
        self.assertEqual(3, contract['trialDays'])
        self.assertEqual('THREE_DAYS', contract['trialDuration'])
        self.assertEqual('ExcerLock Premium', contract['groupName'])
        self.assertEqual(26, contract['level'])

    def test_a_b_contracts_mirror_the_live_products(self):
        annual = self.contracts['com.johansardar.excerlock.premium.a.annual']
        self.assertEqual('Premium Annual', annual['name'])
        self.assertEqual('Earn screen time by moving. Billed yearly.', annual['description'])
        self.assertEqual(1, annual['level'])
        winback = self.contracts['com.johansardar.excerlock.premium.b.winback.annual']
        self.assertEqual('Premium Annual Offer', winback['name'])
        self.assertEqual('Discounted yearly plan for returning members.', winback['description'])

    def test_rejects_a_grid_product_id_that_disagrees_with_the_catalog(self):
        self.grid['subscriptionGroups'][2]['subscriptions'][0]['displayPrice'] = '1.00'
        with self.assertRaises(module.CollectionError):
            module.build_contracts(self.grid)

    def test_rejects_an_unknown_product(self):
        self.grid['subscriptionGroups'][2]['subscriptions'][0]['productID'] = \
            'com.johansardar.excerlock.premium.annual.2999.t9'
        with self.assertRaises(module.CollectionError):
            module.build_contracts(self.grid)


class AuditTests(unittest.TestCase):
    def setUp(self):
        with open(GRID, encoding='utf-8') as handle:
            self.contracts = module.build_contracts(json.load(handle))
        self.snapshot = aligned_snapshot(self.contracts)

    def test_aligned_snapshot_has_no_findings(self):
        self.assertEqual([], module.audit(self.snapshot, self.contracts))
        counts = module.state_counts(self.snapshot, self.contracts)
        self.assertEqual(51, counts['READY_TO_SUBMIT'])
        self.assertEqual(0, counts['MISSING_METADATA'])

    def test_reports_a_generic_display_name(self):
        row = find(self.snapshot, 'com.johansardar.excerlock.premium.annual.2999.t0')
        row['localizations'][0]['name'] = 'Annual'
        findings = module.audit(self.snapshot, self.contracts)
        self.assertEqual(["localization name 'Annual', expected 'Annual $29.99 (no trial)'"],
                         [f['detail'] for f in findings_by_kind(findings, 'name')])

    def test_reports_a_missing_screenshot_as_the_state_blocker(self):
        row = find(self.snapshot, 'com.johansardar.excerlock.premium.weekly.599.t3')
        row['state'] = 'MISSING_METADATA'
        row['productReviewScreenshotId'] = None
        findings = module.audit(self.snapshot, self.contracts)
        self.assertEqual(['MISSING_METADATA (App Store review screenshot missing)'],
                         [f['detail'] for f in findings_by_kind(findings, 'state')])

    def test_reports_order_group_offer_and_localization_gaps(self):
        out_of_order = find(self.snapshot, 'com.johansardar.excerlock.premium.weekly.699.t7')
        out_of_order['groupLevel'] = 1
        out_of_order['localizations'][0]['description'] = 'Renews weekly.'
        out_of_order['introductoryOffers'] = []
        wrong_group = find(self.snapshot, 'com.johansardar.excerlock.premium.b.monthly')
        wrong_group['groupName'] = 'ExcerLock Premium'
        no_localization = find(self.snapshot, 'com.johansardar.excerlock.premium.monthly.999.t0')
        no_localization['localizations'] = []
        self.snapshot['groups'][0]['localizations'][0]['customAppName'] = None
        findings = module.audit(self.snapshot, self.contracts)
        self.assertEqual(['group level 1, expected 6'], [f['detail'] for f in findings_by_kind(findings, 'order')])
        self.assertEqual(['group ExcerLock Premium, expected ExcerLock Premium — Variant B'],
                         [f['detail'] for f in findings_by_kind(findings, 'group')])
        self.assertEqual(['introductory offers none, expected ONE_WEEK'],
                         [f['detail'] for f in findings_by_kind(findings, 'offer')])
        self.assertEqual(['no en-US localization'], [f['detail'] for f in findings_by_kind(findings, 'localization')])
        self.assertEqual(['localization description \'Renews weekly.\', expected '
                          '\'Unlock your apps by exercising. Renews weekly.\''],
                         [f['detail'] for f in findings_by_kind(findings, 'description')])
        self.assertEqual(['group version localization has no customAppName'],
                         [f['detail'] for f in findings_by_kind(findings, 'group-localization')])


class FillTests(unittest.TestCase):
    def setUp(self):
        with open(GRID, encoding='utf-8') as handle:
            self.contracts = module.build_contracts(json.load(handle))
        self.snapshot = aligned_snapshot(self.contracts)

    def ready_states(self):
        return {row['state'] for row in self.snapshot['subscriptions']}

    def test_aligned_snapshot_plans_nothing(self):
        self.assertEqual([], module.plan_fill(self.snapshot, self.contracts))

    def test_ready_to_submit_products_are_never_planned_against(self):
        row = find(self.snapshot, 'com.johansardar.excerlock.premium.a.annual')
        row['localizations'][0]['name'] = 'Wrong Name'
        row['groupLevel'] = 99
        row['state'] = 'READY_TO_SUBMIT'
        actions = module.plan_fill(self.snapshot, self.contracts)
        self.assertNotIn('com.johansardar.excerlock.premium.a.annual', [a['productId'] for a in actions])

    def test_plans_only_the_fields_that_differ(self):
        row = find(self.snapshot, 'com.johansardar.excerlock.premium.annual.2999.t0')
        row['localizations'][0]['name'] = 'Annual'
        row['state'] = 'MISSING_METADATA'
        actions = module.plan_fill(self.snapshot, self.contracts)
        self.assertEqual([{'productId': 'com.johansardar.excerlock.premium.annual.2999.t0',
                           'kind': 'localization-update', 'localizationId': 'loc-'
                           'com.johansardar.excerlock.premium.annual.2999.t0',
                           'field': 'name', 'value': 'Annual $29.99 (no trial)', 'current': 'Annual'}],
                         actions)

    def test_plans_a_localization_create_when_the_locale_is_absent(self):
        row = find(self.snapshot, 'com.johansardar.excerlock.premium.monthly.799.t3')
        row['localizations'] = []
        row['state'] = 'MISSING_METADATA'
        actions = module.plan_fill(self.snapshot, self.contracts)
        self.assertEqual([{'kind': 'localization-create', 'productId': row['productId'],
                           'versionId': row['versionId'], 'name': 'Monthly $7.99 (3-day trial)',
                           'description': 'Unlock your apps by exercising. Renews monthly.'}], actions)

    def test_orders_out_of_order_group_levels_without_a_collision(self):
        for product_id, level in [('com.johansardar.excerlock.premium.weekly.699.t7', 1),
                                  ('com.johansardar.excerlock.premium.weekly.699.t3', 2),
                                  ('com.johansardar.excerlock.premium.weekly.599.t0', 3),
                                  ('com.johansardar.excerlock.premium.weekly.599.t3', 4),
                                  ('com.johansardar.excerlock.premium.weekly.599.t7', 5),
                                  ('com.johansardar.excerlock.premium.weekly.699.t0', 6)]:
            row = find(self.snapshot, product_id)
            row['groupLevel'] = level
            row['state'] = 'MISSING_METADATA'
        actions = module.plan_fill(self.snapshot, self.contracts)
        grid_ids = [c['productId'] for c in self.contracts.values() if c['family'] == 'grid']
        levels = {row['productId']: row['groupLevel'] for row in self.snapshot['subscriptions']
                  if row['productId'] in grid_ids}
        moves = 0
        for action in actions:
            held_by = [product_id for product_id, level in levels.items()
                       if level == action['value'] and product_id != action['productId']]
            self.assertEqual([], held_by, 'level ' + str(action['value']) + ' is still held')
            levels[action['productId']] = action['value']
            moves += 1
        self.assertGreater(moves, 6, 'expected a park step plus one move per out-of-order SKU')
        for product_id, level in levels.items():
            self.assertEqual(self.contracts[product_id]['level'], level, product_id)

    def test_orders_group_levels_inside_each_group(self):
        grid = find(self.snapshot, 'com.johansardar.excerlock.premium.weekly.699.t7')
        variant = find(self.snapshot, 'com.johansardar.excerlock.premium.b.annual')
        grid['groupLevel'] = 1
        grid['state'] = 'MISSING_METADATA'
        variant['groupLevel'] = 2
        variant['state'] = 'MISSING_METADATA'
        actions = module.plan_fill(self.snapshot, self.contracts)
        self.assertEqual({('ExcerLock Premium', 6), ('ExcerLock Premium — Variant B', 1)},
                         {(action['group'], action['value']) for action in actions})
        self.assertEqual(['subscription-update'], sorted({action['kind'] for action in actions}))
        self.assertEqual('ExcerLock Premium — Variant B',
                         next(a for a in actions if a['productId'].endswith('b.annual'))['group'])

    def test_refuses_to_move_a_subscription_between_groups(self):
        row = find(self.snapshot, 'com.johansardar.excerlock.premium.monthly.999.t0')
        row['groupName'] = 'ExcerLock Premium — Variant A'
        row['state'] = 'MISSING_METADATA'
        with self.assertRaises(module.CollectionError):
            module.plan_fill(self.snapshot, self.contracts)

    def test_fills_the_group_custom_app_name(self):
        for group in self.snapshot['groups']:
            group['localizations'][0]['customAppName'] = None
        actions = module.plan_fill(self.snapshot, self.contracts)
        self.assertEqual(3, len(actions))
        self.assertEqual({'group-localization-update'}, {action['kind'] for action in actions})
        self.assertEqual({'ExcerLock'}, {action['value'] for action in actions})


class FillCommandTests(unittest.TestCase):
    def test_every_action_kind_maps_to_the_installed_cli_flags(self):
        actions = [
            {'kind': 'localization-create', 'productId': 'p', 'versionId': 'v', 'name': 'n', 'description': 'd'},
            {'kind': 'localization-update', 'productId': 'p', 'localizationId': 'l', 'field': 'name', 'value': 'n'},
            {'kind': 'localization-update', 'productId': 'p', 'localizationId': 'l', 'field': 'description',
             'value': 'd'},
            {'kind': 'group-localization-update', 'productId': 'g', 'localizationId': 'l', 'field': 'customAppName',
             'value': 'ExcerLock'},
            {'kind': 'subscription-update', 'productId': 'p', 'subscriptionId': 's', 'field': 'groupLevel',
             'value': 3},
        ]
        commands = [module.fill_command(action) for action in actions]
        self.assertEqual(['asc', 'subscriptions', 'versions', 'localizations', 'create',
                          '--version-id', 'v', '--locale', module.LOCALE, '--name', 'n', '--description', 'd',
                          '--output', 'json'], commands[0])
        self.assertEqual(['--id', 'l', '--name', 'n', '--output', 'json'], commands[1][-6:])
        self.assertEqual(['--id', 'l', '--description', 'd', '--output', 'json'], commands[2][-6:])
        self.assertEqual(['--id', 'l', '--custom-app-name', 'ExcerLock', '--output', 'json'], commands[3][-6:])
        self.assertEqual(['asc', 'subscriptions', 'update', '--id', 's', '--group-level', '3', '--output', 'json'],
                         commands[4])

    def test_reports_the_error_line_rather_than_the_help_footer(self):
        class Completed:
            returncode = 1
            stdout = ''
            stderr = 'Error: unknown flag `--groupLevel` for `asc subscriptions update`\nTry:\n  --group-level\n'
        self.assertEqual('Error: unknown flag `--groupLevel` for `asc subscriptions update`',
                         module.cli_error(Completed()))

    def test_screenshot_absence_is_final_but_transient_failures_retry(self):
        class Completed:
            def __init__(self, returncode, stderr=''):
                self.returncode = returncode
                self.stdout = ''
                self.stderr = stderr

        calls = []
        original = module.run_cli
        try:
            def transient(command):
                calls.append(command)
                if len(calls) == 1:
                    return Completed(1, 'Error: failed to fetch: retry limit exceeded after 4 retries: '
                                        'App Store Connect internal server error (status 500)\n')
                return Completed(0)
            module.run_cli = transient
            completed = module.run_cli_until(['asc', 'view'], module.screenshot_absent, pause=0)
            self.assertEqual(2, len(calls))
            self.assertEqual(0, completed.returncode)

            def absent(command):
                calls.append(command)
                return Completed(4, 'Error: subscriptions review app-store-screenshot view: '
                                    'no App Store review screenshot found for subscription "1": '
                                    'resource not found\n')
            calls.clear()
            self.assertIsNone(module.review_screenshot_id(absent(['asc', 'view'])))
            self.assertEqual(1, len(calls))

            def broken(command):
                return Completed(1, 'Error: failed to fetch: retry limit exceeded after 4 retries\n')
            with self.assertRaises(module.CollectionError):
                module.review_screenshot_id(broken(['asc', 'view']))
        finally:
            module.run_cli = original


class CliTests(unittest.TestCase):
    def setUp(self):
        with open(GRID, encoding='utf-8') as handle:
            self.contracts = module.build_contracts(json.load(handle))
        self.snapshot = aligned_snapshot(self.contracts)

    def run_main(self, snapshot, extra=None):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'snapshot.json'
            path.write_text(json.dumps(snapshot))
            argv = ['--snapshot-file', str(path), '--grid-file', str(GRID)] + (extra or [])
            stdout, stderr = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                code = module.main(argv)
            return code, stdout.getvalue(), stderr.getvalue()

    def test_aligned_snapshot_exits_zero(self):
        code, stdout, _ = self.run_main(self.snapshot)
        self.assertEqual(0, code)
        self.assertIn('SUBSCRIPTION METADATA ALIGNED', stdout)

    def test_gaps_exit_one_unless_report_only(self):
        find(self.snapshot, 'com.johansardar.excerlock.premium.annual.2999.t0')['state'] = 'MISSING_METADATA'
        code, stdout, _ = self.run_main(self.snapshot)
        self.assertEqual(1, code)
        self.assertIn('SUBSCRIPTION METADATA GAPS: 1 finding(s) across 51 SKUs', stdout)
        code, stdout, _ = self.run_main(self.snapshot, ['--report-only'])
        self.assertEqual(0, code)
        self.assertIn('SUBSCRIPTION METADATA GAPS', stdout)

    def test_unreadable_snapshot_exits_two(self):
        stdout, stderr = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
            code = module.main(['--snapshot-file', '/nonexistent/snapshot.json', '--grid-file', str(GRID)])
        self.assertEqual(2, code)
        self.assertIn('SUBSCRIPTION METADATA COLLECTION ERROR', stderr.getvalue())

    def test_json_output_reports_counts_and_findings(self):
        find(self.snapshot, 'com.johansardar.excerlock.premium.weekly.999.t7')['state'] = 'MISSING_METADATA'
        code, stdout, _ = self.run_main(self.snapshot, ['--json', '--report-only'])
        self.assertEqual(0, code)
        payload = json.loads(stdout)
        self.assertEqual(50, payload['counts']['READY_TO_SUBMIT'])
        self.assertEqual(1, payload['counts']['MISSING_METADATA'])
        self.assertEqual('state', payload['findings'][0]['kind'])


if __name__ == '__main__':
    unittest.main()
