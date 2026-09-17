"""E2E-F2 — tear the existing-user fixture down (§7.3).

The fixture mint (E2E-F1) leaves a real Adapty grant and a disposable Supabase
identity live so the consuming scenarios can run against them. Teardown revokes
the grant, deletes the identity, and removes the snapshot + metadata, asserting
each half the way E2E-A3's teardown does (request + readback). No disposable
fixture state survives a teardown run.
"""
from __future__ import annotations

import json
import time

import adapty
import fixture
from harness import Scenario, RunContext
from supabase import SupabaseAdmin


class F2FixtureTeardown(Scenario):
    id = 'E2E-F2'
    title = 'Existing-user fixture teardown: revoke the grant, delete the identity'
    lane = 'SIM'
    users = 'EXISTING'
    fixture = 'none'
    requires = ()

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        meta = fixture.read()
        if not meta:
            verdict.block(f'no fixture metadata at {fixture.METADATA}; nothing to tear down '
                          '(mint with E2E-F1 first)')
            return
        uid = str(meta.get('supabaseUserId') or '')
        email = str(meta.get('email') or '')
        ctx.identity['supabaseUserId'] = uid
        if not uid:
            verdict.fail('fixture metadata carries no supabaseUserId; cannot revoke the grant or delete the identity')
            return

        if not adapty.AdaptyServer.configured():
            verdict.check('teardown.adapty_revoke', None,
                          'ADAPTY_SECRET_KEY is not configured; the captured grant cannot be revoked here',
                          blocked_until='adapty-secret')
        else:
            server = adapty.AdaptyServer()
            status, payload = server.revoke(uid)
            verdict.check('teardown.adapty_revoke', status < 300,
                          f'POST revoke/access-level for customer_user_id {uid} returned {status}: '
                          f'{json.dumps(payload)[:200]}')
            time.sleep(1.0)
            status, payload = server.get_profile(uid)
            level = adapty.AdaptyServer.access_level(payload)
            active = adapty.AdaptyServer.active(payload)
            verdict.check('teardown.adapty_revoked', status < 300 and not active,
                          f'profile readback for {uid}: active={active}, level={json.dumps(level)[:200]}')

        admin = SupabaseAdmin()
        status = admin.delete_user(uid)
        readback, _ = admin.user(uid)
        # E2E-A4's UI half deletes the same identity through the app's own
        # contract; a 404 here means the fixture was already consumed, not that
        # the teardown broke, so judge it together with the 404 readback.
        verdict.check('teardown.supabase_delete', status in {200, 204} or (status == 404 and readback == 404),
                      f'Supabase admin delete of {email} ({uid}) returned {status}'
                      + (" (already deleted, e.g. by E2E-A4's UI half)" if status == 404 else ''))
        verdict.check('teardown.supabase_404', readback == 404,
                      f'Supabase admin user lookup after deletion returned {readback}')

        fixture.clear()
        verdict.check('teardown.fixture_removed', not fixture.SNAPSHOT.exists() and not fixture.METADATA.exists(),
                      f'removed {fixture.SNAPSHOT} and {fixture.METADATA}; re-mint with E2E-F1 for the next run')
        ctx.note('fixture torn down: grant revoked, identity deleted, snapshot and metadata removed')
