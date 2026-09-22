"""E2E-F1 — mint the existing-user fixture with a real server-side grant (§7.3).

What the SIM lane could not do before: produce an *entitled, setup-complete*
profile. A purchase needs the StoreKit binding §8.1 leaves unresolved and a
sandbox purchase needs hardware, but Adapty's server-side API can grant a real
access level to a profile that already exists (``adapty.py``). The mint:

1. pre-creates the disposable Supabase identity (the A3 email lane) and grants
   ``premium`` to its customer_user_id **before** the app signs in, so the first
   profile fetch the app's own identity spine makes already carries the live
   access level — no production code is weakened and no refresh hook is faked;
2. drives the real sign-in UI (welcome footer → email → admin-minted OTP);
3. asserts the app *observed* the grant: the RootNavigator only exposes
   ``setup/*`` while ``entitled && !setupComplete``, so landing on setup X4 is
   proof the entitlement store holds trial/active;
4. walks setup X4 → X5 → Home (X1/X2 are gone; X3 is the gym branch);
5. captures the app container as ``fixtures/existing-user`` and records the
   identity/grant metadata (``fixture.py``).

The grant and the disposable identity stay live for the scenarios that consume
the fixture (E1, A4, V1); ``E2E-F2`` revokes the grant, deletes the identity and
removes the snapshot. The readable summary of this scenario is the README's
"existing-user fixture" section.
"""
from __future__ import annotations

import json
import time

import adapty
import fixture
from harness import Scenario, RunContext
from scenarios.a3_email_signin import A3EmailSignIn
from supabase import SupabaseAdmin

SETUP_WAIT = 90.0


class F1FixtureMint(Scenario):
    id = 'E2E-F1'
    title = 'Existing-user fixture mint: server-side premium grant, setup X4→X5, capture'
    lane = 'SIM'
    users = 'EXISTING'
    fixture = 'fresh-install'
    requires = ()

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        if not adapty.AdaptyServer.configured():
            verdict.check(
                'fixture.adapty_secret', None,
                'no Adapty secret server-side API key: set ADAPTY_SECRET_KEY in the environment, ~/.excerlock/env, '
                'or ~/.excerlock/ADAPTY_SECRET_KEY (Adapty > App settings > General > API keys)',
                blocked_until='adapty-secret')
            return
        admin = SupabaseAdmin()
        # A previous mint's identity may still exist (its Adapty grant survives an
        # app-driven deletion of the Supabase user); retire it before replacing
        # the fixture so access levels do not accumulate.
        previous = fixture.retire(fixture.read())
        if previous.get('retired'):
            ctx.note(f'retired the previous fixture identity: {json.dumps(previous)[:300]}')
        email = f'e2e-fixture-{ctx.run_id.lower()}@excerlock.com'.replace('_', '-')
        ctx.note(f'disposable fixture identity: {email}')
        precreated = admin.request('POST', '/auth/v1/admin/users',
                                   {'email': email, 'email_confirm': True, 'password': f'E2e!{ctx.run_id}'})
        if precreated[0] >= 300 and 'already' not in json.dumps(precreated[1]).lower():
            verdict.check('fixture.identity', None,
                          f'could not pre-create the disposable identity ({precreated[0]}): {precreated[1]}',
                          blocked_until='supabase-admin')
            return
        user = admin.find_user_by_email(email)
        if not user:
            verdict.check('fixture.identity', None, 'the pre-created identity is not visible through the admin API',
                          blocked_until='supabase-admin', evidence=[email])
            return
        uid = str(user['id'])
        ctx.identity['supabaseUserId'] = uid
        ctx.identity['email'] = email
        verdict.check('fixture.identity', not user.get('is_anonymous', True),
                      f'disposable Supabase identity {uid} is non-anonymous and email-confirmed '
                      f'({bool(user.get("email_confirmed_at"))})')

        # Grant before the app's Adapty identify: the entitlement is a real
        # access level on the same profile the SDK reads, so the app's first
        # profile load after sign-in already carries it. Granting after an
        # identify would need a production refresh hook that does not exist.
        server = adapty.AdaptyServer()
        grant = server.ensure_grant(uid, days=fixture.GRANT_DAYS)
        ctx.note(f'Adapty grant: {json.dumps(grant)[:400]}')
        verdict.check('fixture.adapty_grant', bool(grant.get('active')),
                      f"access level '{adapty.ACCESS_LEVEL_ID}' on customer_user_id {uid}: "
                      f"active={grant.get('active')}, expires {grant.get('expiresAt')} "
                      f"(app {adapty.APP_ID})", evidence=[json.dumps(grant)[:600]])
        if not grant.get('active'):
            verdict.fail('the Adapty grant did not become active; the app can never observe it')
            return

        captured = False
        with ctx.recording('E2E-F1-mint'):
            if not self.drive_signin(ctx, admin, email):
                return
            if not self.walk_setup(ctx, uid, email):
                return
            captured = True

        if captured:
            ctx.flush_analytics(2.0)
            time.sleep(2.0)
            snapshot = ctx.snapshot_container(fixture.NAME)
            items = sum(1 for _ in snapshot.rglob('*'))
            verdict.check('fixture.snapshot', items > 0,
                          f'app container captured at {snapshot} ({items} entries); '
                          f'manual equivalent: run.py --capture-fixture {fixture.NAME}',
                          evidence=[str(snapshot)])
            persisted, detail = fixture.persisted_setup_complete(snapshot)
            verdict.check('fixture.persisted_setup', persisted, detail)
            entitlement, entitlement_detail = fixture.persisted_entitlement(snapshot)
            verdict.check('fixture.persisted_entitlement', entitlement, entitlement_detail)
            metadata = {
                'kind': fixture.NAME,
                'capturedAt': fixture.iso_now(),
                'runId': ctx.run_id,
                'revision': ctx.build.get('revision'),
                'appSourceRevision': ctx.build.get('appSourceRevision'),
                'email': email,
                'supabaseUserId': uid,
                'adaptyAppId': adapty.APP_ID,
                'accessLevelId': adapty.ACCESS_LEVEL_ID,
                'grantExpiresAt': grant.get('expiresAt'),
                'grantEvidence': grant,
                'teardownScenario': 'E2E-F2',
            }
            meta_path = fixture.write(metadata)
            verdict.check('fixture.metadata', meta_path.exists(),
                          f'metadata written to {meta_path} (identity and grant stay live until E2E-F2)')
            ctx.note('fixture is live; run E2E-F2 after the consuming scenarios to revoke the grant and '
                     'delete the disposable identity')

    # ------------------------------------------------------------------ #
    def drive_signin(self, ctx: RunContext, admin: SupabaseAdmin, email: str) -> bool:
        """Drive the A3 email lane and stop when the app leaves for setup X4."""
        verdict = ctx.verdict
        try:
            ctx.terminate()
            ctx.launch()
            if not ctx.wait_for_app(['Get started'], 90):
                verdict.block('fresh install never reached O01; the fixture mint cannot start')
                return False
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
            verdict.check('fixture.email_entered', typed, f'the sign-in field holds {email}')
            if not typed:
                # 2026-09-17T19:34Z: a mangled first type was sent anyway and
                # the app signed up the corrupted address (`...com2e-fixtur`),
                # leaving a junk identity behind. Stop before "Send code".
                verdict.fail('the sign-in field never held the disposable address; not sending a code to a '
                             'mangled recipient')
                return False
            ctx.tap('Send code')
            if not ctx.wait_for('Check your email', 30):
                ctx.screenshot('code-request-failed')
                verdict.block('the app never reached the code entry phase; see screenshots')
                return False
            ctx.screenshot('code-entry')
            otp = A3EmailSignIn.mint_otp(ctx, admin, email, 'recovery')
            if not otp:
                verdict.block('could not mint the email OTP server-side (admin generate_link returned no email_otp)')
                return False
            code_typed = ctx.fill_field('Verification code', otp)
            verdict.check('fixture.code_entered', code_typed, 'the six-digit code is in the field')
            if not code_typed:
                verdict.fail('the verification code field never held the minted code; stopping the mint')
                return False
            ctx.tap('Verify code')
            closed = A3EmailSignIn.wait_for_sheet_closed(ctx, 45)
            verdict.check('fixture.signin', closed, 'the sign-in sheet closes after the code is accepted')
            if not closed:
                return False
            return True
        except Exception as error:  # noqa: BLE001 - a driver crash is a FAIL, never a silent skip
            ctx.log(f'fixture sign-in drive failed: {type(error).__name__}: {error}')
            verdict.fail(f'fixture sign-in drive crashed: {type(error).__name__}: {error}')
            return False

    def walk_setup(self, ctx: RunContext, uid: str, email: str) -> bool:
        """Assert the app observed the grant, then walk X4 → X5 → Home."""
        verdict = ctx.verdict
        deadline = time.monotonic() + SETUP_WAIT
        observed = False
        labels: list[str] = []
        while time.monotonic() < deadline:
            labels = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in ctx.tree()]
            in_sheet = any('Dismiss sheet' in label for label in labels)
            if not in_sheet and any('Save your progress' in label for label in labels):
                observed = True
                break
            if ctx.answer_system_prompt():
                continue
            time.sleep(0.5)
        ctx.screenshot('setup-x4')
        verdict.check('fixture.entitlement_observed', observed,
                      'the app left onboarding for setup X4, which RootNavigator only exposes while '
                      'entitled && !setupComplete — the entitlement store observed the server-side grant'
                      if observed else
                      f'the app did not reach setup X4 within {SETUP_WAIT:.0f}s after sign-in; the entitlement '
                      f'store never saw the grant (labels: {json.dumps(labels[:12])})',
                      evidence=[json.dumps(labels[:12])])
        if not observed:
            verdict.fail(f'the app did not observe the Adapty grant for {uid} within {SETUP_WAIT:.0f}s')
            return False
        verdict.check('fixture.setup_account', any(email in label for label in labels),
                      f'the setup X4 screen carries the signed-in account {email}')

        if not ctx.tap('Continue'):
            verdict.fail('setup X4 did not offer the Continue control')
            return False
        if not ctx.wait_for_any(["You're all set", 'Go to Home'], 30):
            ctx.screenshot('setup-x5-missing')
            verdict.fail('setup X5 did not render after X4')
            return False
        ctx.screenshot('setup-x5')
        if not ctx.tap('Go to Home'):
            verdict.fail('setup X5 did not offer "Go to Home"')
            return False
        home = ctx.wait_for_any(['Home', 'Hello,'], 60)
        ctx.screenshot('home')
        verdict.check('fixture.setup_complete', bool(home),
                      'setup X5 → Home completed, so setupComplete is persisted for the captured snapshot'
                      if home else 'the app never reached Home after setup X5')
        return bool(home)
