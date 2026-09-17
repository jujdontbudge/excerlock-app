#!/usr/bin/env python3
"""Catalog drift guardrail for the ExcerLock subscription catalog.

Compares three inventories by App Store product identifier:

  * App Store Connect  - `asc subscriptions list --app <ASC_APP> --paginate`
  * Adapty             - `adapty products list --app <ADAPTY_APP> --json` (all pages)
  * Local StoreKit     - `app-next/storekit/ExcerLock.storekit` (the UI-test harness catalog)

Any identifier present in one inventory but not the others is drift: a price/trial SKU could
exist in the store but not be servable from the Adapty dashboard, or be servable but absent
from the local StoreKit lane. Exit codes:

  0  aligned
  1  drift (see the printed report)
  2  an inventory could not be read (missing/failing CLI, unreadable file, malformed payload)

`--report-only` prints the same report but always exits 0, for scheduled CI runs that report
drift instead of gating on it; omit it to enforce alignment. `--asc-file`/`--adapty-file`
read saved CLI JSON payloads instead of calling the CLIs, which keeps fixture tests offline.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys

ASC_APP = '6787265352'
ADAPTY_APP = '9b8a6cf2-22c5-46f9-b938-35c27da2c66f'
DEFAULT_STOREKIT = Path(__file__).resolve().parent.parent / 'storekit' / 'ExcerLock.storekit'


class CollectionError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise CollectionError(message)


def asc_product_ids(payload):
    require(isinstance(payload, dict) and isinstance(payload.get('data'), list), 'ASC payload has no data[] array')
    ids = []
    for row in payload['data']:
        product_id = row.get('attributes', {}).get('productId')
        require(isinstance(product_id, str) and product_id, 'ASC subscription row without attributes.productId')
        ids.append(product_id)
    return ids


def adapty_product_ids(payload):
    require(isinstance(payload, dict) and isinstance(payload.get('data'), list), 'Adapty payload has no data[] array')
    ids = []
    for product in payload['data']:
        app_store = (product.get('vendor_products') or {}).get('app_store') or {}
        product_id = app_store.get('product_id')
        require(isinstance(product_id, str) and product_id,
                "Adapty product " + str(product.get('id', '<unknown>')) + ' has no App Store product binding')
        ids.append(product_id)
    return ids


def storekit_product_ids(payload):
    require(isinstance(payload, dict), 'StoreKit config is not a JSON object')
    ids = []
    for group in payload.get('subscriptionGroups') or []:
        for subscription in group.get('subscriptions') or []:
            product_id = subscription.get('productID')
            require(isinstance(product_id, str) and product_id, 'StoreKit subscription without productID')
            ids.append(product_id)
    return ids


def duplicate_ids(ids):
    seen, duplicates = set(), []
    for product_id in ids:
        if product_id in seen and product_id not in duplicates:
            duplicates.append(product_id)
        seen.add(product_id)
    return duplicates


def compare_inventories(inventories):
    """Return (union ids, findings) where findings maps an inventory to missing and duplicate ids."""
    union = sorted(set().union(*[set(ids) for ids in inventories.values()])) if inventories else []
    findings = {}
    for name, ids in inventories.items():
        missing = sorted(set(union) - set(ids))
        duplicates = sorted(duplicate_ids(ids))
        if missing or duplicates:
            findings[name] = {'missing': missing, 'duplicates': duplicates}
    return union, findings


def print_report(inventories, union, findings, stream=None):
    if stream is None:
        stream = sys.stdout
    counts = ', '.join(name + ' ' + str(len(ids)) for name, ids in inventories.items())
    print('Catalog inventory: ' + counts, file=stream)
    if not findings:
        print('CATALOG ALIGNED: ' + str(len(union)) + ' product ids match across all inventories', file=stream)
        return
    for name, finding in findings.items():
        for product_id in finding['missing']:
            print('  ' + name + ' missing: ' + product_id, file=stream)
        for product_id in finding['duplicates']:
            print('  ' + name + ' duplicate: ' + product_id, file=stream)
    total = sum(len(finding['missing']) + len(finding['duplicates']) for finding in findings.values())
    print('CATALOG DRIFT: ' + str(total) + ' finding(s) across ' + str(len(union)) + ' union product ids', file=stream)


def run_cli(command):
    try:
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        raise CollectionError(command[0] + ' is not installed or not on PATH')
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout).strip().splitlines()
        raise CollectionError(' '.join(command) + ' exited ' + str(completed.returncode) +
                              ': ' + (detail[-1] if detail else 'no output'))
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise CollectionError(' '.join(command) + ' returned invalid JSON: ' + str(error))


def load_file(path, parser):
    try:
        with open(path, encoding='utf-8') as handle:
            payload = json.load(handle)
    except OSError as error:
        raise CollectionError('cannot read ' + str(path) + ': ' + str(error))
    except json.JSONDecodeError as error:
        raise CollectionError(str(path) + ' is not valid JSON: ' + str(error))
    return parser(payload)


def fetch_asc_product_ids(app):
    return asc_product_ids(run_cli(['asc', 'subscriptions', 'list', '--app', app, '--paginate', '--output', 'json']))


def fetch_adapty_product_ids(app, page_size=100):
    ids, page = [], 1
    while True:
        payload = run_cli(['adapty', 'products', 'list', '--app', app, '--json',
                           '--page-size', str(page_size), '--page', str(page)])
        ids.extend(adapty_product_ids(payload))
        pagination = (payload.get('meta') or {}).get('pagination') or {}
        if page >= (pagination.get('pages_count') or 1):
            return ids
        page += 1


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Compare the ASC, Adapty and StoreKit subscription catalogs.')
    parser.add_argument('--report-only', action='store_true',
                        help='print the report but always exit 0 (scheduled CI runs)')
    parser.add_argument('--asc-app', default=ASC_APP, help='App Store Connect app id (default: ' + ASC_APP + ')')
    parser.add_argument('--adapty-app', default=ADAPTY_APP, help='Adapty app id (default: ' + ADAPTY_APP + ')')
    parser.add_argument('--storekit-file', type=Path, default=DEFAULT_STOREKIT,
                        help='StoreKit configuration to read (default: ' + str(DEFAULT_STOREKIT) + ')')
    parser.add_argument('--asc-file', type=Path, help='read a saved asc subscriptions JSON payload instead of calling asc')
    parser.add_argument('--adapty-file', type=Path, help='read a saved adapty products JSON payload instead of calling adapty')
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        inventories = {
            'App Store Connect': load_file(args.asc_file, asc_product_ids) if args.asc_file
            else fetch_asc_product_ids(args.asc_app),
            'Adapty': load_file(args.adapty_file, adapty_product_ids) if args.adapty_file
            else fetch_adapty_product_ids(args.adapty_app),
            'StoreKit': load_file(args.storekit_file, storekit_product_ids),
        }
    except CollectionError as error:
        print('CATALOG COLLECTION ERROR: ' + str(error), file=sys.stderr)
        return 0 if args.report_only else 2
    union, findings = compare_inventories(inventories)
    print_report(inventories, union, findings)
    if findings and not args.report_only:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
