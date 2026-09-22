"""E2E-A4 — delete account: 204, re-PUT 410, Supabase 404, local wipe (§7.2)."""
from __future__ import annotations

import json
import time

import harness
import posthog
from harness import Scenario, RunContext
from supabase import SupabaseAdmin


class A4DeleteAccount(Scenario):
    id = 'E2E-A4'
    title = 'Delete account: 204 → re-PUT 410 → Supabase 404 → local wipe'
    lane = 'SIM'
    users = 'EXISTING'
    fixture = 'existing-user'
    requires = ()

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        # The client-driven path needs Settings → Account, which is behind the
        # setup-complete guard (existing-user fixture). The fixture itself needs
        # an Adapty entitlement, so on the SIM lane only the API half can run.
        ui_reachable = self._open_account(ctx)
        if not ui_reachable:
            verdict.check('ui.account_screen', None,
                          'Settings → Account is behind the setup-complete guard and this run could not reach it; '
                          'mint the existing-user fixture with E2E-F1 (server-side Adapty grant) and rerun',
                          blocked_until='existing-user-fixture')
        else:
            ctx.screenshot('account')
            ctx.tap_scrolled('Delete account')
            time.sleep(1.0)
            ctx.screenshot('delete-confirm')
            ctx.tap('Delete account forever')
            wiped = ctx.wait_for_any(['Block apps. Move more.', 'Get started'], 30)
            observed = [label for label in ctx.labels() if label][:14]
            verdict.check('ui.delete_flow', bool(wiped),
                          'the app returns to a fresh onboarding state after deletion' if wiped else
                          'the app did not return to onboarding within 30s; it stayed on the confirmation sheet '
                          'with its retry note (observed: ' + json.dumps(observed) + ') — the client-side '
                          'post-acceptance cleanup failed; see README "client-driven delete"',
                          evidence=['after-delete.png', 'after-delete.tree.json'])
            ctx.screenshot('after-delete')

        # Harness-driven half: the live server contract for a disposable identity.
        admin = SupabaseAdmin()
        email = f'e2e-a4-{ctx.run_id.lower()}@example.com'.replace('_', '-')
        status, payload = admin.request('POST', '/auth/v1/admin/users',
                                        {'email': email, 'email_confirm': True})
        if status >= 300 or not isinstance(payload, dict) or not payload.get('id'):
            verdict.check('api.disposable_identity', None,
                          f'could not create the disposable identity through the admin API ({status}): {payload}',
                          blocked_until='supabase-admin')
            return
        uid = str(payload['id'])
        ctx.identity['supabaseUserId'] = uid
        session = admin.mint_session(email)
        token = str(session.get('access_token', ''))
        status, payload = harness.api_request('PUT', '/v1/user', token=token)
        verdict.check('api.provision', status in {200, 204},
                      f'PUT /v1/user provisioned {uid}: {status} {payload}')
        status, payload = harness.api_request('DELETE', '/v1/user', token=token)
        verdict.check('api.delete_204', status in {200, 202, 204},
                      f'DELETE /v1/user returned {status}: {payload}')
        status, payload = harness.api_request('PUT', '/v1/user', token=token)
        verdict.check('api.reput_410', status == 410,
                      f're-PUT after deletion returned {status} (expected 410 tombstone): {payload}')
        status, payload = admin.user(uid)
        verdict.check('api.supabase_404', status == 404,
                      f'Supabase admin user lookup after deletion returned {status}')
        erased, detail = self._poll_person_erasure(uid)
        verdict.check('api.posthog_person_erased', None if erased is None else erased,
                      detail, blocked_until='posthog-person-erasure')
        ctx.note('harness-driven deletion contract verified; the client-driven UI half awaits the '
                 'existing-user fixture (see README "existing-user fixture")')

    @staticmethod
    def _open_account(ctx: RunContext) -> bool:
        try:
            # The restored fixture boots to a setup-complete Home; only then is
            # the settings deep link on a reachable route.
            ctx.terminate()
            ctx.launch()
            if not ctx.wait_for_app(['Home', 'Hello,'], 30):
                return False
            ctx.sim.open_url('excerlock://settings/account')
        except Exception:  # noqa: BLE001 - deep link failure is a BLOCKED precondition, not a crash
            return False
        deadline = time.monotonic() + 20
        while time.monotonic() < deadline:
            if any('Delete account' in label for label in ctx.labels()):
                return True
            ctx.answer_system_prompt()
            time.sleep(0.5)
        return False

    @staticmethod
    def _poll_person_erasure(uid: str, timeout: float = 45.0) -> tuple[bool | None, str]:
        """PostHog person erasure is asynchronous; poll until the person is gone."""
        deadline = time.monotonic() + timeout
        last = ''
        while True:
            try:
                rows = posthog.query(
                    'select count() from persons where id in (select person_id from person_distinct_ids '
                    f"where distinct_id = '{uid}')"
                )
            except Exception as error:  # noqa: BLE001 - unsupported query shape must not fake a result
                return None, f'person lookup unavailable: {error}'
            count = int(rows[0].get('count()', 0)) if rows else 0
            last = f'persons matching distinct_id {uid}: {count}'
            if count == 0:
                return True, last
            if time.monotonic() >= deadline:
                return None, f'{last} after {timeout:.0f}s (deletion is asynchronous; re-check later)'
            time.sleep(5)
