"""E2E-A3 — email sign-in completes the identity spine (§5, §7.2)."""
from __future__ import annotations

import json
import time

import harness
import posthog
from harness import Scenario, RunContext
from supabase import SupabaseAdmin


class A3EmailSignIn(Scenario):
    id = 'E2E-A3'
    title = 'Email sign-in completes the identity spine'
    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'
    requires = ()

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        since = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 30))
        email = f'e2e-a3-{ctx.run_id.lower()}@example.com'.replace('_', '-')
        ctx.note(f'disposable identity: {email}')
        admin = SupabaseAdmin()
        if not self.drive_signin(ctx, admin, email):
            return

        # -- identity spine -------------------------------------------------- #
        user = admin.find_user_by_email(email)
        if not user:
            verdict.check('spine.supabase_user', None,
                          'the signed-in user is not visible through the Supabase admin API yet',
                          blocked_until='supabase-admin', evidence=[email])
            return
        uid = str(user.get('id'))
        ctx.identity['supabaseUserId'] = uid
        verdict.check('spine.supabase_user', not user.get('is_anonymous', True),
                      f'Supabase user {uid} exists, is_anonymous={user.get("is_anonymous")}, '
                      f'email_confirmed={bool(user.get("email_confirmed_at"))}')
        session = admin.mint_session(email)
        token = str(session.get('access_token', ''))
        ctx.identity['apiSession'] = 'minted'
        status, payload = harness.api_request('PUT', '/v1/user', token=token)
        verdict.check('spine.api_put_user', status in {200, 204},
                      f'PUT /v1/user with a service-minted session for {uid} returned {status}: {payload}')

        device_id = ctx.posthog_device_id(timeout=45)
        verdict.check('analytics.device_id', bool(device_id), f'run-scoped $device_id: {device_id!r}')
        ctx.flush_analytics(4)
        rows, identified, waited = posthog.wait_for_query(
            'select event, timestamp, distinct_id, properties.$screen_name as screen_name '
            f"from events where timestamp > toDateTime('{since}') and distinct_id = '{uid}' "
            'order by timestamp asc limit 200',
            lambda rows: bool(rows), timeout=60)
        ctx.posthog_trace.append({'query': f'events for distinct_id {uid}', 'rows': len(rows),
                                  'waitedSeconds': round(waited, 1),
                                  'events': sorted({str(row.get('event')) for row in rows})})
        verdict.check('spine.posthog_identify', identified,
                      f'{len(rows)} PostHog rows carry the canonical distinct_id {uid} '
                      f'(events: {sorted({str(row.get("event")) for row in rows})}) after {waited:.0f}s')
        if device_id:
            device_rows = posthog.device_events(device_id, since)
            ctx.posthog_trace.append({'query': 'device rows after identify', 'rows': len(device_rows),
                                      'events': sorted({str(row.get('event')) for row in device_rows})})

        # -- teardown: the disposable identity must not survive the run ------ #
        status, payload = harness.api_request('DELETE', '/v1/user', token=token)
        verdict.check('teardown.delete_204', status in {200, 202, 204},
                      f'DELETE /v1/user returned {status}: {payload}')
        status, payload = harness.api_request('PUT', '/v1/user', token=token)
        verdict.check('teardown.reput_410', status == 410,
                      f're-PUT after deletion returned {status} (expected 410 tombstone): {payload}')
        status, payload = admin.user(uid)
        verdict.check('teardown.supabase_404', status == 404,
                      f'Supabase admin user lookup after deletion returned {status}')
        ctx.note('identity torn down through the app API deletion contract')

    # ------------------------------------------------------------------ #
    def drive_signin(self, ctx: RunContext, admin: SupabaseAdmin, email: str) -> bool:
        """Drive the real sign-in UI; returns False when a precondition blocked the run."""
        verdict = ctx.verdict
        try:
            ctx.terminate()
            ctx.launch()
            if not ctx.wait_for_app(['Get started'], 90):
                verdict.block('fresh install never reached O01; the sign-in sheet is unreachable')
                return False
            with ctx.recording('E2E-A3-email-signin'):
                if not ctx.tap('Sign in'):
                    verdict.block('welcome footer "Sign in" control not found on O01')
                    return False
                ctx.wait_for_any(['Continue with email', 'Save your progress'], 15)
                ctx.screenshot('sign-in-sheet')
                if not ctx.tap('Continue with email'):
                    verdict.block('sign-in sheet did not offer "Continue with email"')
                    return False
                ctx.wait_for('Email address', 15)
                ctx.tap_field('Email address')
                ctx.type_text(email)
                ctx.screenshot('email-entered')
                ctx.tap('Send code')
                if not ctx.wait_for('Check your email', 30):
                    ctx.screenshot('code-request-failed')
                    verdict.block('the app never reached the code entry phase; see screenshots')
                    return False
                ctx.screenshot('code-entry')
                otp = self.mint_otp(ctx, admin, email)
                if not otp:
                    verdict.block('could not mint the email OTP server-side: the admin generate_link call did '
                                  'not return email_otp for this pending flow (attempts in harness.log)')
                    return False
                ctx.tap_field('Verification code')
                ctx.type_text(otp)
                ctx.tap('Verify code')
                ctx.wait_for_any(['Save your progress', 'Continue'], 30)
                time.sleep(1.5)
                ctx.screenshot('signed-in')
                labels = [label for label in ctx.labels() if label]
                verdict.check('signin.signed_in_ui',
                              any('Save your progress' in label for label in labels)
                              or any(email.split('@')[0] in label for label in labels),
                              f'signed-in state rendered: {json.dumps(labels[:10])}')
                return True
        except Exception as error:  # noqa: BLE001 - a driver crash is a FAIL, never a silent skip
            ctx.log(f'sign-in drive failed: {type(error).__name__}: {error}')
            verdict.fail(f'sign-in drive crashed: {type(error).__name__}: {error}')
            return False

    @staticmethod
    def mint_otp(ctx: RunContext, admin: SupabaseAdmin, email: str) -> str:
        """Mint the code the app is waiting for, from the admin API.

        A fresh install signs in from an anonymous identity, so the app calls
        ``updateUser({email})`` (email_change flow). If Supabase reports an
        existing account, the app switches to the recovery flow (``magiclink``).
        Both are attempted and every response is logged as evidence.
        """
        attempts = (
            ('email_change_new', {'type': 'email_change_new', 'email': email, 'new_email': email}),
            ('email_change_current', {'type': 'email_change_current', 'email': email, 'new_email': email}),
            ('magiclink', {'type': 'magiclink', 'email': email}),
        )
        for kind, body in attempts:
            status, payload = admin.request('POST', '/auth/v1/admin/generate_link', body)
            code = str((payload or {}).get('email_otp') or '') if isinstance(payload, dict) else ''
            ctx.log(f'generate_link({kind}) -> {status} {"code" if code else json.dumps(payload)[:200]}')
            if code:
                return code
        return ''
