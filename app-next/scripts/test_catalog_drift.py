import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('catalog_drift', Path(__file__).with_name('catalog-drift.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

THREE_IDS = ['com.example.premium.a', 'com.example.premium.b', 'com.example.premium.c']


def asc_payload(product_ids):
    return {'data': [{'attributes': {'productId': product_id}} for product_id in product_ids]}


def adapty_payload(product_ids):
    return {'data': [{'id': 'product-' + str(index), 'vendor_products': {'app_store': {'product_id': product_id}}}
                     for index, product_id in enumerate(product_ids)]}


def storekit_payload(product_ids):
    return {'subscriptionGroups': [{'subscriptions': [{'productID': product_id} for product_id in product_ids]}]}


class CatalogDriftTests(unittest.TestCase):
    def run_main(self, asc, adapty, storekit, extra=None, storekit_missing=False):
        with tempfile.TemporaryDirectory() as directory:
            paths = {}
            for name, payload in [('asc', asc), ('adapty', adapty), ('storekit', storekit)]:
                path = Path(directory) / (name + '.json')
                if not (storekit_missing and name == 'storekit'):
                    path.write_text(json.dumps(payload))
                paths[name] = path
            argv = ['--asc-file', str(paths['asc']), '--adapty-file', str(paths['adapty']),
                    '--storekit-file', str(paths['storekit'])] + (extra or [])
            stdout, stderr = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(stdout), contextlib.redirect_stderr(stderr):
                code = module.main(argv)
            return code, stdout.getvalue(), stderr.getvalue()

    def test_aligned_inventories_pass(self):
        code, stdout, stderr = self.run_main(asc_payload(THREE_IDS), adapty_payload(THREE_IDS), storekit_payload(THREE_IDS))
        self.assertEqual(code, 0)
        self.assertIn('CATALOG ALIGNED: 3 product ids', stdout)
        self.assertEqual(stderr, '')

    def test_missing_id_in_each_inventory_fails(self):
        cases = [
            ('App Store Connect', asc_payload(THREE_IDS[:2]), adapty_payload(THREE_IDS), storekit_payload(THREE_IDS)),
            ('Adapty', asc_payload(THREE_IDS), adapty_payload(THREE_IDS[:2]), storekit_payload(THREE_IDS)),
            ('StoreKit', asc_payload(THREE_IDS), adapty_payload(THREE_IDS), storekit_payload(THREE_IDS[:2])),
        ]
        for name, asc, adapty, storekit in cases:
            with self.subTest(name=name):
                code, stdout, _ = self.run_main(asc, adapty, storekit)
                self.assertEqual(code, 1)
                self.assertIn('CATALOG DRIFT: 1 finding(s)', stdout)
                self.assertIn(name + ' missing: ' + THREE_IDS[2], stdout)

    def test_extra_id_in_one_inventory_fails(self):
        code, stdout, _ = self.run_main(asc_payload(THREE_IDS + ['com.example.extra']),
                                        adapty_payload(THREE_IDS), storekit_payload(THREE_IDS))
        self.assertEqual(code, 1)
        self.assertIn('CATALOG DRIFT: 2 finding(s)', stdout)
        self.assertIn('Adapty missing: com.example.extra', stdout)

    def test_duplicate_identifier_fails(self):
        code, stdout, _ = self.run_main(asc_payload(THREE_IDS), adapty_payload(THREE_IDS + [THREE_IDS[0]]),
                                        storekit_payload(THREE_IDS))
        self.assertEqual(code, 1)
        self.assertIn('Adapty duplicate: ' + THREE_IDS[0], stdout)

    def test_report_only_reports_drift_without_failing(self):
        code, stdout, _ = self.run_main(asc_payload(THREE_IDS), adapty_payload(THREE_IDS[:2]),
                                        storekit_payload(THREE_IDS), extra=['--report-only'])
        self.assertEqual(code, 0)
        self.assertIn('CATALOG DRIFT: 1 finding(s)', stdout)

    def test_unreadable_inventory_is_a_collection_error(self):
        code, _, stderr = self.run_main(asc_payload(THREE_IDS), adapty_payload(THREE_IDS), None, storekit_missing=True)
        self.assertEqual(code, 2)
        self.assertIn('CATALOG COLLECTION ERROR', stderr)

    def test_report_only_never_fails_on_collection_error(self):
        code, _, stderr = self.run_main(asc_payload(THREE_IDS), adapty_payload(THREE_IDS), None,
                                        extra=['--report-only'], storekit_missing=True)
        self.assertEqual(code, 0)
        self.assertIn('CATALOG COLLECTION ERROR', stderr)

    def test_adapty_product_without_app_store_binding_is_a_collection_error(self):
        payload = {'data': [{'id': 'unbound', 'vendor_products': {}}]}
        code, _, stderr = self.run_main(asc_payload(THREE_IDS), payload, storekit_payload(THREE_IDS))
        self.assertEqual(code, 2)
        self.assertIn('unbound', stderr)

    def test_repository_storekit_catalog_matches_the_grid_contract(self):
        with open(module.DEFAULT_STOREKIT, encoding='utf-8') as handle:
            ids = module.storekit_product_ids(json.load(handle))
        self.assertEqual(len(ids), 51)
        self.assertEqual(len(set(ids)), 51)
        self.assertIn('com.johansardar.excerlock.premium.a.annual', ids)
        self.assertIn('com.johansardar.excerlock.premium.annual.4999.t7', ids)


if __name__ == '__main__':
    unittest.main()
