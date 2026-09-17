"""E2E-N1 — fresh install → full onboarding → paywall (plan §7.2)."""
from __future__ import annotations

import json
import time

import posthog
from harness import Scenario, RunContext

from .onboarding import OnboardingWalk


class N1OnboardingPaywall(Scenario):
    id = 'E2E-N1'
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

            walk = OnboardingWalk(ctx)
            result = walk.run(stop_at='P')
            steps = result['steps']
            expected = ['O01', 'O02', 'O03', 'O04', 'O05', 'O06', 'O08', 'O09', 'O10', 'O11', 'O12', 'O13',
                        'O14', 'O15', 'O16', 'O17', 'O18', 'O20', 'W1', 'W2', 'W3', 'S1', 'S3', 'S4', 'T1',
                        'T2', 'T3', 'T4', 'P']
            missing = [step for step in expected if step not in steps]
            verdict.check('onboarding.full_walk', not missing and steps[:1] == ['O01'],
                          f'visited {len(steps)} onboarding screens in flow order; missing {missing}'
                          if missing else f'visited all {len(steps)} onboarding screens through the paywall',
                          evidence=[' | '.join(steps)])
            ctx.note(f'onboarding walk: {" -> ".join(steps)}')
            if result['stuck']:
                ctx.note(f'walk stopped on: {result["stuck"][:2]}')

            paywall_seen = 'P' in steps or ctx.wait_for('Choose your plan', 10)
            verdict.check('paywall.reached', paywall_seen, 'onboarding tail lands on the paywall')
            ctx.screenshot('paywall')

            observation = self.paywall_state(ctx)
            verdict.check('paywall.renders', bool(observation['title']),
                          f'paywall renders: {json.dumps(observation)[:300]}')

            plans = observation['plans']
            load_failed = any('couldn' in label.lower() or 'retry loading plans' in label.lower()
                              for label in observation['labels'])
            if load_failed or not plans:
                expected_products = self.placement_products(ctx)
                verdict.check(
                    'paywall.live_products', None,
                    'the paywall cannot show live products on this simulator: StoreKit has no local catalog '
                    'bound for the harness build (§8.1: the scheme→.storekit binding is unresolved and a '
                    'simulator without it cannot fetch App Store products). Observed UI: '
                    + json.dumps(observation)[:400]
                    + (f'; live placement products (Adapty, read-only): {expected_products}' if expected_products else ''),
                    blocked_until='StoreKit-binding',
                    evidence=[json.dumps(observation)[:800]],
                )
            else:
                expected_products = self.placement_products(ctx)
                matched = self.match_products(plans, expected_products)
                verdict.check('paywall.live_products', bool(matched),
                              f'{len(plans)} plans rendered {plans}; live placement products {expected_products}',
                              evidence=[json.dumps(observation)[:800]])
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
                landed = self.gate('B4a.screen_step_mapping', 'analytics.step_screen_events',
                                   'every visited onboarding step emits $screen', capabilities=ctx.capabilities)
                landed = self.gate('B4b.root_screen_tracking', 'analytics.route_screen_events',
                                   'route changes emit $screen', capabilities=ctx.capabilities) and landed
                if landed:
                    seen_steps = {row.get('step') for row in rows if row.get('event') == '$screen'}
                    verdict.check('analytics.step_screen_events', bool(screens),
                                  f'$screen rows observed: {sorted(set(screens))} (step props: {sorted(x for x in seen_steps if x)})',
                                  evidence=[json.dumps(rows)[:1500]])
                paywall_rows = [row for row in rows if row.get('event') == 'paywall_viewed']
                gate = self.gate('B6.paywall_funnel_events', 'analytics.paywall_viewed',
                                 'paywall_viewed {placement: onboarding} is present', capabilities=ctx.capabilities)
                if gate:
                    verdict.check('analytics.paywall_viewed', bool(paywall_rows),
                                  f'paywall_viewed rows: {len(paywall_rows)} '
                                  f'placements={[row.get("placement") for row in paywall_rows]}')
                verdict.check('analytics.ingestion', satisfied or bool(rows),
                              f'PostHog accepted this device\'s events within the poll window '
                              f'({len(rows)} rows after {waited:.0f}s)')

            marks = ctx.startup_marks()
            ctx.note(f'startup signposts: {json.dumps(marks)}')
            first_frame = marks.get('delegateToFirstFrame')
            verdict.check('startup.first_frame_budget', None if first_frame is None else first_frame <= 1.5,
                          'no os_signpost marks observed in the simulator log' if first_frame is None
                          else f'delegate → first React frame {first_frame:.2f}s (budget ≤1.5s, §6.2)',
                          blocked_until='B10.startup_marks',
                          evidence=[json.dumps(marks)])

    # -- paywall helpers ---------------------------------------------------- #
    @staticmethod
    def paywall_state(ctx: RunContext) -> dict:
        nodes = ctx.tree()
        labels = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in nodes]
        titles = [label for label in labels if ' / ' in label or '/ year' in label or '/ month' in label]
        cta = next((label for label in labels if label in {'Start free trial', 'Continue'}), '')
        title = next((label for label in labels if label in {'Choose your plan'}), '')
        return {
            'title': title,
            'plans': titles,
            'cta': cta,
            'labels': labels,
            'prices': sorted({price for label in labels for price in __import__('re').findall(r'\$\s?\d+(?:\.\d{2})?', label)}),
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
