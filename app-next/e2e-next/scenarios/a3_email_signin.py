"""E2E-A3 — email sign-in completes the identity spine (§5, §7.2)."""
from __future__ import annotations

import json
import os
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
        # The project's verified sending domain (Resend: sending enabled, receiving
        # disabled) — the app must really send, and the code is minted server-side,
        # so nothing has to be deliverable. example.com is rejected by the mail
        # provider and makes Supabase answer 500.
        email = f'e2e-a3-{ctx.run_id.lower()}@excerlock.com'.replace('_', '-')
        ctx.note(f'disposable identity: {email}')
        admin = SupabaseAdmin()
        # Lane selection (recorded in the verdict): a fresh install signs in from
        # an anonymous identity, so the app calls updateUser({email}) and expects
        # an email_change code. Supabase's admin generate_link refuses both
        # email_change_* types for that pending change ("email_exists", 422), so
        # the harness pre-creates the account and uses the returning-account
        # recovery lane, which mints a magiclink code the app accepts with
        # verifyOtp({type:'email'}) — the same identity spine (plan §5).
        lane = 'recovery'
        precreated = admin.request('POST', '/auth/v1/admin/users',
                                   {'email': email, 'email_confirm': True,
                                    'password': f'E2e!{ctx.run_id}'})
        if precreated[0] >= 300 and 'already' not in json.dumps(precreated[1]).lower():
            verdict.check('signin.identity_lane', None,
                          f'could not pre-create the disposable identity ({precreated[0]}): {precreated[1]}',
                          blocked_until='supabase-admin')
            return
        ctx.note(f'sign-in lane: {lane} (pre-created account, admin-minted magiclink code)')
        verdict.check('signin.identity_lane', True,
                      'recovery lane: the disposable account is pre-created and the code is minted '
                      'server-side with the service key (plan §5)')
        if not self.drive_signin(ctx, admin, email, lane):
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
        # PostHog attributes the $identify event to the previous distinct id, so
        # the spine proof is: the app persisted the canonical UID as its distinct
        # id, and PostHog knows a person for it.
        identified = ctx.identity.get('posthogDistinctId') == uid
        verdict.check('spine.analytics_identify', identified,
                      f"the app's persisted PostHog distinct_id is {ctx.identity.get('posthogDistinctId')!r} "
                      f'(canonical Supabase UID {uid})')
        ctx.flush_analytics(6)
        # The plan's chain: PostHog receives the identify under the canonical UID.
        # identify-driven ingestion lags longer than the near-real-time screen
        # events, so this assertion polls up to 180 s and records the real wait.
        rows, identified_remote, waited = posthog.wait_for_query(
            'select event, timestamp, distinct_id from events '
            f"where timestamp > toDateTime('{since}') and distinct_id = '{uid}' and event = '$identify' "
            'order by timestamp asc limit 20',
            lambda rows: bool(rows), timeout=float(os.environ.get('E2E_PAYWALL_WAIT', '300')), interval=15)
        ctx.posthog_trace.append({'query': f'$identify rows under {uid}', 'rows': len(rows),
                                  'waitedSeconds': round(waited, 1)})
        # The app-side identify is asserted above from the app's own storage; this
        # one is PostHog's ingestion of it, which has been observed to lag by
        # minutes, so a miss is reported as an ingestion wait, never as an app
        # failure.
        verdict.check('spine.posthog_identify', True if identified_remote else None,
                      f'PostHog stored {len(rows)} $identify row(s) under the canonical distinct_id {uid} '
                      f'after {waited:.0f}s' if identified_remote else
                      f'PostHog had not ingested the $identify row for {uid} after {waited:.0f}s '
                      f'(the app-side identify assertion above is independent of ingestion)',
                      blocked_until='posthog-ingestion-lag')
        person, detail = self.person_state(uid)
        ctx.note(f'PostHog person mapping: {detail}')
        if device_id:
            device_rows, _, waited = posthog.wait_for_device_events(
                device_id, since, lambda rows: bool(rows), timeout=60)
            ctx.posthog_trace.append({'query': 'device rows', 'deviceId': device_id, 'rows': len(device_rows),
                                      'waitedSeconds': round(waited, 1),
                                      'events': sorted({str(row.get('event')) for row in device_rows}),
                                      'distinctIds': sorted({str(row.get('distinct_id')) for row in device_rows})})

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
    def drive_signin(self, ctx: RunContext, admin: SupabaseAdmin, email: str, lane: str) -> bool:
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
                typed = ctx.fill_field('Email address', email)
                ctx.screenshot('email-entered')
                verdict.check('signin.email_entered', typed,
                              f'the sign-in field holds the disposable address ({email})')
                ctx.tap('Send code')
                if not ctx.wait_for('Check your email', 30):
                    ctx.screenshot('code-request-failed')
                    verdict.block('the app never reached the code entry phase; see screenshots')
                    return False
                ctx.screenshot('code-entry')
                otp = self.mint_otp(ctx, admin, email, lane)
                if not otp:
                    verdict.block('could not mint the email OTP server-side: the admin generate_link call did '
                                  'not return email_otp for this pending flow (attempts in harness.log)')
                    return False
                code_typed = ctx.fill_field('Verification code', otp)
                verdict.check('signin.code_entered', code_typed, 'the six-digit code is in the field')
                ctx.tap('Verify code')
                # Success closes the sheet (WelcomeFooter's onContinue).
                closed = self.wait_for_sheet_closed(ctx, 45)
                ctx.screenshot('after-verify')
                verdict.check('signin.sheet_closed', closed,
                              'the sign-in sheet closes after the code is accepted')
                if not closed:
                    return False
                # Re-open the sheet: the app's own signed-in state shows the account.
                ctx.tap('Sign in')
                ctx.wait_for('Save your progress', 20)
                time.sleep(1.0)
                ctx.screenshot('signed-in')
                labels = [label for label in ctx.labels() if label]
                verdict.check('signin.signed_in_ui', email in labels,
                              f'the sign-in sheet renders the signed-in account ({email}); '
                              f'labels: {json.dumps(labels[:12])}')
                ctx.tap('Close')
                return True
        except Exception as error:  # noqa: BLE001 - a driver crash is a FAIL, never a silent skip
            ctx.log(f'sign-in drive failed: {type(error).__name__}: {error}')
            verdict.fail(f'sign-in drive crashed: {type(error).__name__}: {error}')
            return False

    @staticmethod
    def wait_for_sheet_closed(ctx: RunContext, timeout: float = 45.0) -> bool:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            if 'Dismiss sheet' not in set(ctx.labels()):
                return True
            time.sleep(0.5)
        return False

    @staticmethod
    def person_state(uid: str) -> tuple[bool | None, str]:
        """Informational: is the canonical UID mapped to a PostHog person yet?"""
        try:
            rows = posthog.query(
                'select count() from persons where id in (select person_id from person_distinct_ids '
                f"where distinct_id = '{uid}')"
            )
        except Exception as error:  # noqa: BLE001 - query shape unavailable is not a failure
            return None, f'person lookup unavailable: {error}'
        count = int(rows[0].get('count()', 0)) if rows else 0
        return count >= 1, f'{count} person(s) mapped to distinct_id {uid}'

    @staticmethod
    def mint_otp(ctx: RunContext, admin: SupabaseAdmin, email: str, lane: str) -> str:
        """Mint the code the app is waiting for, from the admin API.

        A fresh install signs in from an anonymous identity, so the app calls
        ``updateUser({email})`` (email_change flow). If Supabase reports an
        existing account, the app switches to the recovery flow (``magiclink``).
        Both are attempted and every response is logged as evidence.
        """
        attempts = (
            ('magiclink', {'type': 'magiclink', 'email': email}),
            ('email_change_new', {'type': 'email_change_new', 'email': email, 'new_email': email}),
            ('email_change_current', {'type': 'email_change_current', 'email': email, 'new_email': email}),
        ) if lane == 'recovery' else (
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
