#!/usr/bin/env python3
"""Subscription metadata guardrail for the ExcerLock App Store catalog.

`catalog-drift.py` proves the three inventories list the same 51 product identifiers. This
script proves the App Store Connect products behind those identifiers carry the metadata a
review needs, per SKU:

  * an `en-US` localization whose display name and description come from the grid,
  * membership in the grid's subscription group, and a group level matching the grid order,
  * an introductory offer matching the grid's trial variant,
  * a state of `READY_TO_SUBMIT` (a missing App Store review screenshot keeps a product in
    `MISSING_METADATA`; uploading one is a separate concern from this contract).

The StoreKit harness catalog is the source of truth for identifiers, tiers, periods, groups
and trials. Display names are derived from it as `<Period> $<price> (<trial>)`, which keeps
every name unique inside the group and inside App Store Connect's 35-character limit. The
descriptions keep the shipped renewal-terms sentence (`Unlock your apps by exercising. Renews
yearly.`) rather than the harness placeholder text: it names the period, and App Store Connect
caps this field at 55 characters, so a trial clause cannot be added to it. The trial variant is
carried by the display name and re-checked against the introductory offer.

Exit codes mirror `catalog-drift.py`:

  0  every SKU is ready and matches the contract
  1  findings (see the report)
  2  the inventory could not be read (missing/failing CLI, unreadable file, malformed payload)

`--report-only` prints the same report but always exits 0. `--snapshot-file` re-reads a saved
snapshot instead of calling `asc`, and `--write-snapshot` saves what it read, so runs are
reproducible offline. `--fill` applies only what is missing or differs: it never touches a
subscription that is already `READY_TO_SUBMIT`, and it never changes prices or availability.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

ASC_APP = '6787265352'
DEFAULT_GRID = Path(__file__).resolve().parent.parent / 'storekit' / 'ExcerLock.storekit'
LOCALE = 'en-US'
MAX_NAME = 35
MAX_DESCRIPTION = 55

# The harness catalog names its groups 'Premium A'/'Premium B'/'Premium Grid'; App Store
# Connect calls them 'ExcerLock Premium — Variant A'/'— Variant B'/'ExcerLock Premium'.
GROUP_ALIASES = {
    'Premium A': 'ExcerLock Premium — Variant A',
    'Premium B': 'ExcerLock Premium — Variant B',
    'Premium Grid': 'ExcerLock Premium',
}
# All three groups present the same customer-facing plan group name.
GROUP_DISPLAY_NAME = 'ExcerLock Premium'
# Harness period -> (display name word, renewal adverb, App Store Connect period).
PERIODS = {
    'P1W': ('Weekly', 'weekly', 'ONE_WEEK'),
    'P1M': ('Monthly', 'monthly', 'ONE_MONTH'),
    'P1Y': ('Annual', 'yearly', 'ONE_YEAR'),
}
# Product-id period word -> harness period.
PERIOD_WORDS = {'weekly': 'P1W', 'monthly': 'P1M', 'annual': 'P1Y'}
# Grid display order: shortest period first, then price, then shortest trial.
GRID_PERIOD_ORDER = {'P1W': 0, 'P1M': 1, 'P1Y': 2}
# Harness trial key -> (free-trial days, name label, App Store Connect duration).
TRIALS = {
    't0': (None, 'no trial', None),
    't3': (3, '3-day trial', 'THREE_DAYS'),
    't7': (7, '7-day trial', 'ONE_WEEK'),
}
TRIAL_BY_PERIOD = {'P3D': 't3', 'P1W': 't7'}
# Where a group level that another SKU still holds must be claimed, the holder parks above the
# grid before the claimant takes the level; no parked level is left behind by the plan.
LEVEL_PARK_BASE = 100

# The six A/B contracts keep the display names and descriptions the live products already
# carry (mirrored from `premium.a.annual`/`premium.a.monthly`, plus the win-back copy the
# catalog records in docs/subscriptions.md). Their group order is the live order.
A_B_CONTRACTS = {
    'com.johansardar.excerlock.premium.a.monthly': {
        'group': 'Premium A', 'period': 'P1M', 'trial': 't0', 'level': 2,
        'name': 'Premium Monthly', 'description': 'Earn screen time by moving. Billed monthly.'},
    'com.johansardar.excerlock.premium.a.annual': {
        'group': 'Premium A', 'period': 'P1Y', 'trial': 't7', 'level': 1,
        'name': 'Premium Annual', 'description': 'Earn screen time by moving. Billed yearly.'},
    'com.johansardar.excerlock.premium.a.winback.annual': {
        'group': 'Premium A', 'period': 'P1Y', 'trial': 't7', 'level': 3,
        'name': 'Premium Annual Offer',
        'description': 'Discounted yearly plan for returning members.'},
    'com.johansardar.excerlock.premium.b.monthly': {
        'group': 'Premium B', 'period': 'P1M', 'trial': 't0', 'level': 2,
        'name': 'Premium Monthly', 'description': 'Earn screen time by moving. Billed monthly.'},
    'com.johansardar.excerlock.premium.b.annual': {
        'group': 'Premium B', 'period': 'P1Y', 'trial': 't7', 'level': 1,
        'name': 'Premium Annual', 'description': 'Earn screen time by moving. Billed yearly.'},
    'com.johansardar.excerlock.premium.b.winback.annual': {
        'group': 'Premium B', 'period': 'P1Y', 'trial': 't7', 'level': 3,
        'name': 'Premium Annual Offer',
        'description': 'Discounted yearly plan for returning members.'},
}


class CollectionError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise CollectionError(message)


def format_price(cents):
    return str(cents // 100) + '.' + str(cents % 100).zfill(2)


def parse_grid_product_id(product_id):
    """`…premium.<period>.<cents>.<t0|t3|t7>` -> (period, cents, trial key)."""
    require(product_id.startswith('com.johansardar.excerlock.premium.'), 'unexpected product id ' + product_id)
    parts = product_id.split('.')
    require(len(parts) == 7, 'product id does not encode premium.period.tier.trial: ' + product_id)
    premium, word, cents, trial = parts[3], parts[4], parts[5], parts[6]
    require(premium == 'premium', 'unexpected product id ' + product_id)
    require(word in PERIOD_WORDS, 'unknown period in ' + product_id)
    require(cents.isdigit(), 'unknown price tier in ' + product_id)
    require(trial in TRIALS, 'unknown trial in ' + product_id)
    return PERIOD_WORDS[word], int(cents), trial


def grid_name(period, cents, trial):
    return PERIODS[period][0] + ' $' + format_price(cents) + ' (' + TRIALS[trial][1] + ')'


def grid_description(period):
    return 'Unlock your apps by exercising. Renews ' + PERIODS[period][1] + '.'


def read_trial_days(subscription):
    offer = subscription.get('introductoryOffer')
    if not offer:
        return None
    require(offer.get('paymentMode') == 'free' and offer.get('numberOfPeriods') == 1,
            'only one-period free trials are modelled: ' + str(subscription.get('productID')))
    return {'P3D': 3, 'P1W': 7}.get(offer.get('subscriptionPeriod'))


def build_contracts(grid_payload):
    """Grid catalog -> {product_id: expected metadata}. Raises CollectionError on drift."""
    require(isinstance(grid_payload, dict), 'StoreKit config is not a JSON object')
    groups = {}
    for group in grid_payload.get('subscriptionGroups') or []:
        name = group.get('name')
        require(name in GROUP_ALIASES, 'unexpected subscription group ' + str(name))
        groups[name] = group
    require(set(groups) == set(GROUP_ALIASES), 'StoreKit config is missing a subscription group')

    contracts = {}
    for group_name, group in groups.items():
        for subscription in group.get('subscriptions') or []:
            product_id = subscription.get('productID')
            require(isinstance(product_id, str) and product_id, 'subscription without productID')
            require(product_id not in contracts, 'duplicate productID ' + product_id)
            period = subscription.get('recurringSubscriptionPeriod')
            trial_days = read_trial_days(subscription)
            price = subscription.get('displayPrice')
            if group_name in ('Premium A', 'Premium B'):
                expected = A_B_CONTRACTS.get(product_id)
                require(expected is not None, 'unexpected A/B product ' + product_id)
                require(expected['group'] == group_name, 'A/B product in the wrong harness group: ' + product_id)
                require(expected['period'] == period, 'harness period drifted for ' + product_id)
                expected_days = TRIALS[expected['trial']][0]
                require(expected_days == trial_days, 'harness trial drifted for ' + product_id)
            else:
                encoded_period, cents, trial = parse_grid_product_id(product_id)
                require(encoded_period == period, 'harness period disagrees with ' + product_id)
                require(format_price(cents) == price, 'harness price disagrees with ' + product_id)
                require(TRIALS[trial][0] == trial_days, 'harness trial disagrees with ' + product_id)
                expected = {
                    'period': period, 'trial': trial,
                    'level': (GRID_PERIOD_ORDER[period], cents, trial_days or 0),
                    'name': grid_name(period, cents, trial), 'description': grid_description(period),
                }
            contracts[product_id] = {
                'productId': product_id,
                'group': group_name,
                'groupName': GROUP_ALIASES[group_name],
                'family': 'A/B' if group_name in ('Premium A', 'Premium B') else 'grid',
                'period': period,
                'periodDuration': PERIODS[period][2],
                'periodLabel': PERIODS[period][0],
                'trial': expected['trial'],
                'trialDays': TRIALS[expected['trial']][0],
                'trialDuration': TRIALS[expected['trial']][2],
                'name': expected['name'],
                'description': expected['description'],
                'level': expected['level'],
            }
            require(len(expected['name']) <= MAX_NAME, 'derived display name is too long: ' + product_id)
            require(len(expected['description']) <= MAX_DESCRIPTION,
                    'expected description is too long: ' + product_id)
    for product_id in A_B_CONTRACTS:
        require(product_id in contracts, 'storekit catalog is missing ' + product_id)

    # Grid display order: shortest period first, then price, then shortest trial.
    grid = sorted([c for c in contracts.values() if c['family'] == 'grid'], key=lambda c: c['level'])
    for index, contract in enumerate(grid, start=1):
        contract['level'] = index
    return contracts


def contract_rows(contracts):
    return [contracts[product_id] for product_id in sorted(contracts)]


def run_cli(command):
    try:
        completed = subprocess.run(command, capture_output=True, text=True, check=False)
    except FileNotFoundError:
        raise CollectionError(command[0] + ' is not installed or not on PATH')
    return completed


def cli_error(completed):
    """The actionable line of a failed asc call, which prints its error before the help footer."""
    lines = [line for line in (completed.stderr or completed.stdout).strip().splitlines() if line.strip()]
    for line in lines:
        if line.startswith('Error'):
            return line
    return lines[-1] if lines else 'no output'


def run_cli_until(command, is_final, attempts=3, pause=2.0):
    """Run a read command, retrying while the failure is neither final nor the last attempt.

    App Store Connect answers a range of transient conditions (500s after its own retries,
    dropped connections) that must not be mistaken for a product having no review screenshot.
    """
    completed = None
    for attempt in range(1, attempts + 1):
        completed = run_cli(command)
        if completed.returncode == 0 or is_final(completed) or attempt == attempts:
            return completed
        time.sleep(pause)
    return completed


def screenshot_absent(completed):
    """True when App Store Connect says, definitively, that no review screenshot exists."""
    return 'no App Store review screenshot found' in (completed.stderr or completed.stdout)


def run_cli_json(command, attempts=3, pause=2.0):
    """Run a read-only asc call, retrying the transient network failures seen in practice."""
    completed = run_cli_until(command, lambda _: False, attempts=attempts, pause=pause)
    if completed.returncode != 0:
        raise CollectionError(' '.join(command) + ' exited ' + str(completed.returncode) +
                              ': ' + cli_error(completed))
    try:
        return json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        raise CollectionError(' '.join(command) + ' returned invalid JSON: ' + str(error))


def review_screenshot_id(completed):
    """The App Store review screenshot id, or None when the subscription genuinely has none."""
    if completed.returncode == 0:
        return (json.loads(completed.stdout).get('data') or {}).get('id')
    if screenshot_absent(completed):
        return None
    raise CollectionError('asc subscriptions review app-store-screenshot view failed: ' + cli_error(completed))


def collect_group_versions(app, contracts):
    """Group reference names -> (group id, group version id, version localizations)."""
    payload = run_cli_json(['asc', 'subscriptions', 'groups', 'list', '--app', app, '--output', 'json'])
    by_name = {}
    for row in payload.get('data') or []:
        by_name[row.get('attributes', {}).get('referenceName')] = row.get('id')
    groups = []
    for group in sorted({c['groupName'] for c in contracts.values()}):
        group_id = by_name.get(group)
        require(group_id, 'App Store Connect has no subscription group named ' + group)
        versions = run_cli_json(['asc', 'subscriptions', 'groups', 'versions', 'list',
                                 '--group-id', group_id, '--output', 'json']).get('data') or []
        require(versions, 'subscription group ' + group + ' has no version')
        version_id = versions[0]['id']
        localizations = run_cli_json(['asc', 'subscriptions', 'groups', 'versions', 'localizations',
                                      'list', '--version-id', version_id, '--output', 'json']).get('data') or []
        groups.append({
            'id': group_id, 'referenceName': group,
            'versionId': version_id, 'versionState': versions[0].get('attributes', {}).get('state'),
            'localizations': [
                {'id': row['id'], 'locale': row['attributes'].get('locale'),
                 'name': row['attributes'].get('name'), 'customAppName': row['attributes'].get('customAppName')}
                for row in localizations
            ],
        })
    return groups


def collect_subscription(subscription):
    subscription_id = subscription['id']
    attributes = subscription.get('attributes', {})
    versions = run_cli_json(['asc', 'subscriptions', 'versions', 'list', '--subscription-id', subscription_id,
                             '--include', 'localizations,images', '--localizations-limit', '50',
                             '--images-limit', '50', '--output', 'json'])
    version_rows = versions.get('data') or []
    require(version_rows, 'subscription ' + subscription_id + ' has no version')
    version = version_rows[0]
    relationships = version.get('relationships') or {}
    localizations = [
        {'id': row['id'], 'locale': row.get('attributes', {}).get('locale'),
         'name': row.get('attributes', {}).get('name'),
         'description': row.get('attributes', {}).get('description')}
        for row in versions.get('included') or [] if row.get('type') == 'subscriptionLocalizations'
    ]
    image_count = len((relationships.get('images') or {}).get('data') or [])
    offers = run_cli_json(['asc', 'subscriptions', 'offers', 'introductory', 'list',
                           '--subscription-id', subscription_id, '--output', 'json']).get('data') or []
    screenshot = run_cli_until(['asc', 'subscriptions', 'review', 'app-store-screenshot', 'view',
                                '--subscription-id', subscription_id, '--output', 'json'], screenshot_absent)
    return {
        'id': subscription_id,
        'productId': attributes.get('productId'),
        'referenceName': attributes.get('name'),
        'state': attributes.get('state'),
        'period': attributes.get('subscriptionPeriod'),
        'groupLevel': attributes.get('groupLevel'),
        'groupId': attributes.get('groupId'),
        'groupName': attributes.get('groupName'),
        'reviewNote': attributes.get('reviewNote'),
        'versionId': version['id'],
        'versionState': version.get('attributes', {}).get('state'),
        'localizations': localizations,
        'versionImageCount': image_count,
        'productReviewScreenshotId': review_screenshot_id(screenshot),
        'introductoryOffers': [
            {'duration': row.get('attributes', {}).get('duration'),
             'offerMode': row.get('attributes', {}).get('offerMode'),
             'numberOfPeriods': row.get('attributes', {}).get('numberOfPeriods'),
             'startDate': row.get('attributes', {}).get('startDate')}
            for row in offers
        ],
    }


def collect(app, contracts, workers=8):
    group_versions = collect_group_versions(app, contracts)
    # `asc subscriptions list` does not report the owning group, so list each group's members.
    rows = {}
    for group in group_versions:
        payload = run_cli_json(['asc', 'subscriptions', 'list', '--group-id', group['id'], '--paginate',
                                '--output', 'json'])
        for row in payload.get('data') or []:
            attributes = dict(row.get('attributes') or {})
            attributes['groupId'] = group['id']
            attributes['groupName'] = group['referenceName']
            rows[row['id']] = {'id': row['id'], 'attributes': attributes}
    require(rows, 'App Store Connect returned no subscriptions for app ' + app)
    known = [row for row in rows.values() if row['attributes'].get('productId') in contracts]
    require(len(known) == len(contracts),
            'App Store Connect lists ' + str(len(known)) + ' of ' + str(len(contracts)) + ' known products')
    with ThreadPoolExecutor(workers) as pool:
        collected = list(pool.map(collect_subscription, known))
    collected.sort(key=lambda row: row['productId'])
    return {'app': app, 'groups': group_versions, 'subscriptions': collected}


def find_localization(row, locale=LOCALE):
    for localization in row.get('localizations') or []:
        if localization.get('locale') == locale:
            return localization
    return None


def audit(snapshot, contracts):
    """Compare a snapshot against the contracts; return [finding, ...]."""
    findings = []
    by_product = {row.get('productId'): row for row in snapshot.get('subscriptions') or []}
    for contract in contract_rows(contracts):
        product_id = contract['productId']

        def report(kind, detail):
            findings.append({'productId': product_id, 'kind': kind, 'detail': detail})

        row = by_product.get(product_id)
        if row is None:
            report('missing', 'not in the App Store Connect listing')
            continue
        if row.get('groupId') is None:
            report('group', 'not a member of a subscription group')
        group = next((g for g in snapshot.get('groups') or [] if g.get('id') == row.get('groupId')), None)
        if row.get('groupName') != contract['groupName']:
            report('group', 'group ' + str(row.get('groupName')) + ', expected ' + contract['groupName'])
        if contract['family'] == 'grid' and row.get('groupLevel') != contract['level']:
            report('order', 'group level ' + str(row.get('groupLevel')) + ', expected ' + str(contract['level']))
        if contract['family'] == 'A/B' and row.get('groupLevel') != contract['level']:
            report('order', 'group level ' + str(row.get('groupLevel')) + ', expected ' + str(contract['level']))
        if row.get('period') != contract['periodDuration']:
            report('period', 'period ' + str(row.get('period')) + ', expected ' + contract['periodDuration'])
        localization = find_localization(row)
        if localization is None:
            report('localization', 'no ' + LOCALE + ' localization')
        else:
            if localization.get('name') != contract['name']:
                report('name', 'localization name ' + repr(localization.get('name')) +
                       ', expected ' + repr(contract['name']))
            if localization.get('description') != contract['description']:
                report('description', 'localization description ' + repr(localization.get('description')) +
                       ', expected ' + repr(contract['description']))
        durations = sorted({str(offer.get('duration')) for offer in row.get('introductoryOffers') or []})
        expected_durations = [] if contract['trialDuration'] is None else [contract['trialDuration']]
        if durations != expected_durations:
            report('offer', 'introductory offers ' + (', '.join(durations) or 'none') +
                   ', expected ' + (', '.join(expected_durations) or 'none'))
        if row.get('state') != 'READY_TO_SUBMIT':
            blocker = 'App Store review screenshot missing' if not (
                row.get('productReviewScreenshotId') or row.get('versionImageCount')) else 'metadata mismatch'
            report('state', row.get('state') + ' (' + blocker + ')')
    for group in snapshot.get('groups') or []:
        localization = find_localization(group)
        if localization is None:
            findings.append({'productId': group.get('referenceName'), 'kind': 'group-localization',
                             'detail': 'no ' + LOCALE + ' localization'})
            continue
        if localization.get('name') != GROUP_DISPLAY_NAME:
            findings.append({'productId': group.get('referenceName'), 'kind': 'group-localization',
                             'detail': 'group localization name ' + repr(localization.get('name')) +
                                       ', expected ' + repr(GROUP_DISPLAY_NAME)})
        if not localization.get('customAppName'):
            findings.append({'productId': group.get('referenceName'), 'kind': 'group-localization',
                             'detail': 'group version localization has no customAppName'})
    return findings


def state_counts(snapshot, contracts):
    counts = {'READY_TO_SUBMIT': 0, 'MISSING_METADATA': 0, 'other': 0}
    for row in snapshot.get('subscriptions') or []:
        if row.get('productId') not in contracts:
            continue
        state = row.get('state')
        if state in counts:
            counts[state] += 1
        else:
            counts['other'] += 1
    return counts


def print_report(snapshot, contracts, findings, stream=None):
    if stream is None:
        stream = sys.stdout
    counts = state_counts(snapshot, contracts)
    print('Subscription metadata: ' + str(len(contracts)) + ' SKUs, ' +
          str(counts['READY_TO_SUBMIT']) + ' READY_TO_SUBMIT, ' +
          str(counts['MISSING_METADATA']) + ' MISSING_METADATA' +
          (', ' + str(counts['other']) + ' other state' if counts['other'] else ''), file=stream)
    if not findings:
        print('SUBSCRIPTION METADATA ALIGNED: every SKU is READY_TO_SUBMIT and matches the grid', file=stream)
        return
    for finding in findings:
        print('  ' + str(finding['productId']) + ' ' + finding['kind'] + ': ' + finding['detail'], file=stream)
    blocked = sorted({finding['productId'] for finding in findings if finding['kind'] == 'state'})
    print('SUBSCRIPTION METADATA GAPS: ' + str(len(findings)) + ' finding(s) across ' +
          str(len(contracts)) + ' SKUs; ' + str(len(blocked)) + ' SKU(s) not READY_TO_SUBMIT', file=stream)
    if blocked:
        print('  not READY_TO_SUBMIT: ' + ', '.join(blocked), file=stream)


def plan_fill(snapshot, contracts):
    """Return the ordered list of mutations that bring the snapshot up to the contract.

    Subscriptions that are already `READY_TO_SUBMIT` are never planned against, fields that
    already match are skipped, and nothing here changes prices or availability.
    """
    by_product = {row.get('productId'): row for row in snapshot.get('subscriptions') or []}
    actions = []
    for contract in contract_rows(contracts):
        product_id = contract['productId']
        row = by_product.get(product_id)
        require(row is not None, 'cannot fill unknown product ' + product_id)
        if row.get('state') == 'READY_TO_SUBMIT':
            continue
        if row.get('groupName') != contract['groupName']:
            raise CollectionError(product_id + ' is in group ' + str(row.get('groupName')) +
                                  ', not ' + contract['groupName'] + '; moving a subscription between groups is manual')
        require(row.get('versionId'), product_id + ' has no subscription version')
        localization = find_localization(row)
        if localization is None:
            actions.append({'kind': 'localization-create', 'productId': product_id,
                            'versionId': row['versionId'], 'name': contract['name'],
                            'description': contract['description']})
        else:
            if localization.get('name') != contract['name']:
                actions.append({'kind': 'localization-update', 'productId': product_id,
                                'localizationId': localization['id'], 'field': 'name',
                                'value': contract['name'],
                                'current': localization.get('name')})
            if localization.get('description') != contract['description']:
                actions.append({'kind': 'localization-update', 'productId': product_id,
                                'localizationId': localization['id'], 'field': 'description',
                                'value': contract['description'],
                                'current': localization.get('description')})
        if row.get('groupLevel') != contract['level']:
            actions.append({'kind': 'subscription-update', 'productId': product_id, 'group': contract['groupName'],
                            'subscriptionId': row['id'], 'field': 'groupLevel',
                            'value': contract['level'], 'current': row.get('groupLevel')})
    for group in snapshot.get('groups') or []:
        localization = find_localization(group)
        require(localization is not None, 'group ' + str(group.get('referenceName')) + ' has no ' + LOCALE +
                ' localization')
        if not localization.get('customAppName'):
            actions.append({'kind': 'group-localization-update', 'productId': group.get('referenceName'),
                            'localizationId': localization['id'], 'field': 'customAppName', 'value': 'ExcerLock',
                            'current': None})
    return order_fill(actions)


def order_fill(actions):
    """Order plan_fill's actions: free every wanted group level before claiming it.

    Levels are ordered inside one subscription group: each target is free unless another SKU in
    the same group still holds it, and that SKU is parked on a level above the grid before the
    target is claimed. Parking never survives: every parked SKU still has its own assignment
    later in the plan.
    """
    moves = [action for action in actions if action['kind'] == 'subscription-update']
    others = [action for action in actions if action['kind'] != 'subscription-update']
    ordered = []
    for group in sorted({action['group'] for action in moves}):
        planned = [action for action in moves if action['group'] == group]
        wanted = {action['value'] for action in planned}
        holders = {action['current']: action for action in planned if action['current'] in wanted}
        settled = set()
        for action in sorted(planned, key=lambda a: a['value']):
            occupant = holders.get(action['value'])
            if occupant is not None and occupant['productId'] not in settled:
                settled.add(occupant['productId'])
                ordered.append({'kind': 'subscription-update', 'productId': occupant['productId'],
                                'group': group, 'subscriptionId': occupant['subscriptionId'],
                                'field': 'groupLevel', 'value': LEVEL_PARK_BASE + action['value'],
                                'current': occupant['current']})
            settled.add(action['productId'])
            ordered.append(action)
    return others + ordered


# App Store Connect spells some fields differently on the command line than in the payload.
FILL_FLAGS = {'groupLevel': '--group-level', 'customAppName': '--custom-app-name'}


def fill_command(action):
    """One plan_fill action -> the asc command that applies it."""
    if action['kind'] == 'localization-create':
        return ['asc', 'subscriptions', 'versions', 'localizations', 'create',
                '--version-id', action['versionId'], '--locale', LOCALE,
                '--name', action['name'], '--description', action['description'], '--output', 'json']
    if action['kind'] == 'localization-update':
        return ['asc', 'subscriptions', 'versions', 'localizations', 'update',
                '--id', action['localizationId'], FILL_FLAGS.get(action['field'], '--' + action['field']),
                action['value'], '--output', 'json']
    if action['kind'] == 'group-localization-update':
        return ['asc', 'subscriptions', 'groups', 'versions', 'localizations', 'update',
                '--id', action['localizationId'], FILL_FLAGS.get(action['field'], '--' + action['field']),
                action['value'], '--output', 'json']
    return ['asc', 'subscriptions', 'update', '--id', action['subscriptionId'],
            FILL_FLAGS.get(action['field'], '--' + action['field']), str(action['value']), '--output', 'json']


def run_fill_actions(actions, stream=None):
    if stream is None:
        stream = sys.stdout
    failures = []
    for action in actions:
        completed = run_cli(fill_command(action))
        status = 'ok' if completed.returncode == 0 else 'FAILED'
        print('  ' + status + ' ' + action['kind'] + ' ' + str(action['productId']) + ' ' +
              action['field'] + '=' + repr(action['value']), file=stream)
        if completed.returncode != 0:
            failures.append({'action': action, 'error': cli_error(completed)})
            print('    ' + failures[-1]['error'], file=stream)
    return failures


def load_grid(path):
    try:
        with open(path, encoding='utf-8') as handle:
            return json.load(handle)
    except OSError as error:
        raise CollectionError('cannot read ' + str(path) + ': ' + str(error))
    except json.JSONDecodeError as error:
        raise CollectionError(str(path) + ' is not valid JSON: ' + str(error))


def load_snapshot(path):
    return load_grid(path)


def write_snapshot(path, snapshot):
    with open(path, 'w', encoding='utf-8') as handle:
        json.dump(snapshot, handle, indent=1, sort_keys=True)
        handle.write('\n')


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Check and fill the App Store subscription metadata.')
    parser.add_argument('--app', default=ASC_APP, help='App Store Connect app id (default: ' + ASC_APP + ')')
    parser.add_argument('--grid-file', type=Path, default=DEFAULT_GRID,
                        help='StoreKit catalog to read (default: ' + str(DEFAULT_GRID) + ')')
    parser.add_argument('--snapshot-file', type=Path, help='read a saved snapshot instead of calling asc')
    parser.add_argument('--write-snapshot', type=Path, help='save what asc returned to this path')
    parser.add_argument('--fill', action='store_true', help='apply the missing or differing fields')
    parser.add_argument('--report-only', action='store_true', help='print the report but always exit 0')
    parser.add_argument('--json', action='store_true', help='print the findings as JSON')
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        contracts = build_contracts(load_grid(args.grid_file))
        snapshot = load_snapshot(args.snapshot_file) if args.snapshot_file else collect(args.app, contracts)
        if args.write_snapshot and not args.snapshot_file:
            write_snapshot(args.write_snapshot, snapshot)
    except CollectionError as error:
        print('SUBSCRIPTION METADATA COLLECTION ERROR: ' + str(error), file=sys.stderr)
        return 0 if args.report_only else 2
    findings = audit(snapshot, contracts)
    if args.json:
        print(json.dumps({'counts': state_counts(snapshot, contracts), 'findings': findings}, indent=1))
    else:
        print_report(snapshot, contracts, findings)
    if args.fill:
        try:
            actions = plan_fill(snapshot, contracts)
        except CollectionError as error:
            print('SUBSCRIPTION METADATA FILL REFUSED: ' + str(error), file=sys.stderr)
            return 2
        print('Applying ' + str(len(actions)) + ' metadata change(s):')
        failures = run_fill_actions(actions)
        if failures:
            print('SUBSCRIPTION METADATA FILL FAILED: ' + str(len(failures)) + ' change(s)')
            return 1
    if findings and not args.report_only:
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
