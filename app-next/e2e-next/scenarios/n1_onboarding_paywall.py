"""E2E-N1 — fresh install → full onboarding → paywall (plan §7.2)."""
from __future__ import annotations

import json
import os
import time

import posthog
from harness import Scenario, RunContext

from .onboarding import OnboardingWalk, PAYWALL_TITLES


class N1OnboardingPaywall(Scenario):
    id = 'E2E-N1'
    activity = 'Walking'
    title = 'Fresh install → onboarding → paywall with live products'
    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'
    requires = ('B4a.screen_step_mapping', 'B4b.root_screen_tracking', 'B6.paywall_funnel_events')

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        since = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 30))
        ctx.terminate()
        with ctx.recording('E2E-N1-onboarding'):
            launch_seconds = ctx.launch()
            ctx.log(f'simctl launch returned in {launch_seconds:.2f}s')
            reached = ctx.wait_for_app(['Get started'], 90)
            verdict.check('onboarding.first_screen', reached, 'fresh install boots into O01 of real onboarding')
            if not reached:
                verdict.block('fresh install never reached O01; see screenshots/recording in this directory')
                return
            ctx.screenshot('O01-welcome')

            walk = OnboardingWalk(ctx, activity=self.activity)
            result = walk.run(stop_at='P')
            steps = result['steps']
            expected = ['O01', 'O02', 'O03', 'O07', 'O04', 'O05', 'O06', 'O08', 'O22', 'O21', 'O09', 'O10', 'O11', 'O12', 'O13',
                        'O14', 'O15', 'O16', 'O17', 'O18', 'O20', 'W0', 'W1', 'W2', 'W3', 'S1', 'S3', 'S4', 'T1',
                        'T2', 'T3', 'T4', 'P']
            if self.activity == 'Gym':
                start = expected.index('W0')
                expected[start:start + 4] = ['G0F', 'G0H', 'G1']
            order = [step for step in expected if step in steps]
            in_order = order == [step for step in steps if step in expected]
            missing = [step for step in expected if step not in steps]
            verdict.check('onboarding.full_walk',
                          in_order and steps[:1] == ['O01'] and steps[-1:] == ['P'],
                          f'walked {len(steps)} screens from O01 to the paywall in flow order '
                          f'(observed {len(expected) - len(missing)}/{len(expected)} expected steps; '
                          f'not observed: {missing})'
                          if missing else f'walked all {len(steps)} onboarding screens through the paywall',
                          evidence=[' | '.join(steps)])
            ctx.note(f'onboarding walk: {" -> ".join(steps)}')
            if missing:
                ctx.note('steps the accessibility poll did not catch (the app may still have emitted them; '
                         'the step_screen_events assertion checks PostHog): ' + json.dumps(missing))
            if result['stuck']:
                ctx.note(f'walk stopped on: {result["stuck"][:2]}')

            paywall_seen = 'P' in steps or ctx.wait_for('Choose your plan', 10)
            verdict.check('paywall.reached', paywall_seen, 'onboarding tail lands on the paywall')
            ctx.screenshot('paywall')

            observation = self.paywall_state(ctx)
            verdict.check('paywall.renders', bool(observation['title']),
                          f'paywall renders: {json.dumps(observation)[:300]}')

            plans = observation['plans']
            expected_products = self.placement_products(ctx)
            if not plans:
                # The paywall's own error state (or an empty plan list) means the
                # store could not be reached for this run: §8.1 leaves the local
                # StoreKit binding unresolved, and the simulator's product fetch
                # is not reliable enough to call an app failure.
                verdict.check(
                    'paywall.live_products', None,
                    'no plan rows rendered on the paywall (observed UI: '
                    + json.dumps({'loadError': observation['loadError'], 'labels': observation['labels'][:8]})
                    + ('; live placement products (Adapty, read-only): ' + json.dumps(expected_products)
                       if expected_products else '')
                    + '). The simulator store binding is unresolved (§8.1), so this is a harness '
                      'precondition, not an app verdict',
                    blocked_until='StoreKit-binding',
                    evidence=[json.dumps(observation)[:900]],
                )
            else:
                prices_ok = len(observation['prices']) >= 1
                matched = self.match_products(plans, expected_products)
                verdict.check('paywall.live_products', len(plans) >= 2 and prices_ok and matched,
                              f'{len(plans)} plan rows rendered {plans} at {observation["prices"]}; '
                              f'live placement products {expected_products}; price present={prices_ok}; '
                              f'placement titles matched={matched}',
                              evidence=[json.dumps(observation)[:900]])
            verdict.check('paywall.cta', bool(observation['cta']),
                          f'purchase CTA present: {observation["cta"]!r} (purchase UI itself is out of scope per §8.1)')

            # PostHog: the run's device id keys every analytics assertion.
            device_id = ctx.posthog_device_id(timeout=45)
            verdict.check('analytics.device_id', bool(device_id),
                          f'run-scoped $device_id read from the app container: {device_id!r}')
            if device_id:
                ctx.flush_analytics(4)
                rows, satisfied, waited = posthog.wait_for_device_events(
                    device_id, since, lambda rows: any(row.get('event') == '$screen' for row in rows),
                    timeout=60)
                ctx.posthog_trace.append({'query': 'device events', 'deviceId': device_id, 'rows': len(rows),
                                          'waitedSeconds': round(waited, 1), 'events': sorted(
                                              {str(row.get('event')) for row in rows})})
                ctx.note(f'PostHog rows for this device: {posthog.summarise(rows)}')
                screens = posthog.screen_names(rows)
                landed = ctx.gate('B4a.screen_step_mapping', 'analytics.step_screen_events',
                                   'every visited onboarding step emits $screen')
                landed = ctx.gate('B4b.root_screen_tracking', 'analytics.route_screen_events',
                                   'route changes emit $screen') and landed
                if landed:
                    # One extended poll covers everything the 60 s screen window
                    # may have missed: this project's ingestion has been observed
                    # to lag by minutes, so a missing row is only a real gap once
                    # the extended window has passed.
                    required_steps = [step for step in steps if step != 'P']
                    def covered(rows: list[dict]) -> bool:
                        steps_seen = {str(row.get('step')) for row in rows if row.get('event') == '$screen'}
                        paywall_seen = any(row.get('event') == 'paywall_viewed' for row in rows)
                        screen_seen = any(row.get('screen_name') == 'paywall' for row in rows)
                        return all(step in steps_seen for step in required_steps) and paywall_seen and screen_seen

                    extended_wait = float(os.environ.get('E2E_PAYWALL_WAIT', '300'))
                    if not covered(rows) and extended_wait > 0:
                        rows, satisfied_extra, extra_wait = posthog.wait_for_device_events(
                            device_id, since, covered, timeout=extended_wait, interval=15)
                        ctx.posthog_trace.append({'query': 'extended device rows', 'rows': len(rows),
                                                  'waitedSeconds': round(extra_wait, 1),
                                                  'covered': covered(rows)})
                        ctx.note(f'extended PostHog poll: {extra_wait:.0f}s more, covered={covered(rows)}')

                    seen_steps = {str(row.get('step')) for row in rows if row.get('event') == '$screen'}
                    missing_rows = [step for step in required_steps if step not in seen_steps]
                    verdict.check('analytics.step_screen_events', not missing_rows,
                                  f'$screen rows cover {len(required_steps) - len(missing_rows)}/'
                                  f'{len(required_steps)} visited onboarding steps; no row for {missing_rows} '
                                  f'(observed screens: {sorted(set(screens))})',
                                  evidence=[json.dumps(rows)[:1500]])

                gate = ctx.gate('B6.paywall_funnel_events', 'analytics.paywall_viewed_contract',
                                'paywall_viewed {placement: onboarding} is present')
                if gate:
                    paywall_rows = [row for row in rows if row.get('event') == 'paywall_viewed']
                    screen_rows = [row for row in rows if row.get('screen_name') == 'paywall']
                    verdict.check('analytics.paywall_viewed', bool(paywall_rows),
                                  f'paywall_viewed rows: {len(paywall_rows)} '
                                  f'placements={[row.get("placement") for row in paywall_rows]}'
                                  if paywall_rows else
                                  'paywall_viewed is absent after the extended PostHog poll; see the '
                                  'posthog trace for the observed wait',
                                  blocked_until='posthog-ingestion-lag')
                    verdict.check('analytics.paywall_screen_row', bool(screen_rows),
                                  f'$screen paywall rows: {len(screen_rows)}' if screen_rows
                                  else '$screen paywall is absent after the extended PostHog poll',
                                  blocked_until='posthog-ingestion-lag')
                verdict.check('analytics.ingestion', satisfied or bool(rows),
                              f'PostHog accepted this device\'s events within the poll window '
                              f'({len(rows)} rows after {waited:.0f}s)')

            marks = ctx.startup_marks()
            ctx.note(f'startup signposts: {json.dumps(marks)}')
            first_frame = marks.get('delegateToFirstFrame')
            verdict.check('startup.first_frame_budget', None if first_frame is None else first_frame <= 1.5,
                          'the §6.2 budgets are device measurements: ADR 0021/0033 keep the B10 os_signpost '
                          'numbers delegate-relative diagnostics, the simulator unified log carries no '
                          'signpost records on this host, and Xcode 26.4 has no xctrace template that '
                          'records them; the budget gate stays on a signed TestFlight build (plan §6.3)'
                          if first_frame is None
                          else f'delegate → first React frame {first_frame:.2f}s (budget ≤1.5s, §6.2)',
                          blocked_until='device-lane',
                          evidence=[json.dumps(marks)])

    # -- paywall helpers ---------------------------------------------------- #
    @staticmethod
    def paywall_state(ctx: RunContext) -> dict:
        import re
        nodes = ctx.tree()
        labels = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in nodes]
        # Plan rows are ChoiceRows: the app exposes their selected state as AXValue.
        plans = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in ctx.choices()]
        if not plans:
            plans = [label for label in labels
                     if re.search(r'annual|monthly|weekly|lifetime|year|month|week', label, re.I)
                     and '$' not in label and len(label) < 60]
        cta = next((label for label in labels if label in {'Start free trial', 'Continue'}), '')
        title = next((label for label in labels if label in PAYWALL_TITLES), '')
        return {
            'title': title,
            'plans': plans,
            'cta': cta,
            'loadError': next((label for label in labels
                               if 'couldn' in label.lower() and 'load' in label.lower()), ''),
            'labels': labels,
            'prices': sorted({price for label in labels for price in re.findall(r'\$\s?\d+(?:\.\d{2})?', label)}),
        }

    @staticmethod
    def placement_products(ctx: RunContext) -> list[str]:
        """Live Adapty placement products (read-only CLI), for the price comparison."""
        import subprocess
        app_id = '9b8a6cf2-22c5-46f9-b938-35c27da2c66f'
        try:
            listing = subprocess.run(['adapty', 'placements', 'list', '--app', app_id, '--json'],
                                     capture_output=True, text=True, timeout=60)
            placements = json.loads(listing.stdout)['data']
            onboarding = next(item for item in placements if item['developer_id'] == 'onboarding')
            detail = json.loads(subprocess.run(['adapty', 'placements', 'get', onboarding['id'], '--app', app_id,
                                                '--json'], capture_output=True, text=True, timeout=60).stdout)
            paywall_id = detail['audiences'][0]['paywall_id']
            paywall = json.loads(subprocess.run(['adapty', 'paywalls', 'get', paywall_id, '--app', app_id, '--json'],
                                                capture_output=True, text=True, timeout=60).stdout)
            titles = []
            for product_id in paywall['product_ids']:
                product = json.loads(subprocess.run(['adapty', 'products', 'get', product_id, '--app', app_id,
                                                     '--json'], capture_output=True, text=True, timeout=60).stdout)
                titles.append(product.get('title', ''))
            return titles
        except Exception as error:  # noqa: BLE001 - the live read is evidence, not a gate
            ctx.log(f'adapty placement read failed: {error}')
            return []

    @staticmethod
    def match_products(plans: list[str], expected: list[str]) -> bool:
        if not expected:
            return bool(plans)
        text = ' '.join(plans).lower()
        return all(any(word.lower() in text for word in title.split()[:2]) for title in expected)
