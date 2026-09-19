"""E2E-H1 — Home: hold Walking, tap Report, tap Send.

Drives Home on the existing-user fixture the way a person would: hold the
Walking chip (the ground truth for right now), tap Report, and tap Send — two
taps after the hold. Asserts the visible result (the sheet names the held label,
then the thanks card) and the server effect: the newest incident_reports row for
the fixture user carries the words and ``diagnostics.activityTruth.activity``.
"""
from __future__ import annotations

import os
import shlex
import subprocess
import time
from typing import Any

import fixture
from harness import RunContext, Scenario, env_value

HOME = ['Home', 'Hi,']
CAPTION = 'Hold what you are doing now'
WALKING = 'Walking'
REPORT = 'Report a problem'
SEND = 'Send report'
THANKS = 'Thank you'
ERROR = 'Could not send right now.'
STILL_LOCKED = 'Still locked'
#: The API host's Postgres is only reachable over the deploy SSH path (deploy/README.md).
DEFAULT_HOST = 'johansardar@34.134.201.129'
DEFAULT_KEY = '~/.ssh/google_compute_engine'


class H1HomeReport(Scenario):
    id = 'E2E-H1'
    title = 'Home: hold Walking, tap Report, tap Send lands a report carrying the held label'
    lane = 'SIM'
    users = 'EXISTING'
    fixture = 'existing-user'

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        started = time.time()
        ctx.launch()
        if not ctx.wait_for_app(HOME, 60):
            verdict.block('the existing-user fixture did not boot to Home')
            return
        with ctx.recording('E2E-H1'):
            # The chips and Report sit on Home itself: nothing to open first.
            chip = self.scroll_to_node(ctx, WALKING)
            verdict.check('home.chips_visible', chip is not None and ctx.find(REPORT, 2) is not None,
                          'Walking chip and Report are on Home without opening anything',
                          evidence=[' | '.join(sorted({l for l in ctx.labels() if l})[:30])])
            ctx.screenshot('home', shrink=True)
            if chip is None:
                verdict.fail('no Walking chip on Home')
                return

            # 1. Hold Walking (a long press, not a tap).
            self.hold_node(ctx, chip)
            time.sleep(0.6)
            ctx.screenshot('home-held-walking', shrink=True)

            # 2. Tap Report → the sheet, whose one line names the held label.
            if not ctx.tap(REPORT):
                verdict.fail('Report did not answer a tap')
                return
            sheet = ctx.wait_for(SEND, 10)
            verdict.check('report.sheet_opened', sheet, 'Report opens the sheet with Send')
            summary = next((l for l in ctx.labels() if 'what the app saw' in l), '')
            verdict.check('report.summary_names_held_label', STILL_LOCKED in summary and WALKING in summary,
                          f'the sheet says what goes out: {summary!r}')
            ctx.screenshot('report-sheet', shrink=True)
            if not sheet:
                return

            # 3. Tap Send → thanks or a visible error, never silence.
            ctx.tap(SEND)
            outcome = None
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline and outcome is None:
                labels = ctx.labels()
                if any(THANKS == label for label in labels):
                    outcome = 'thanks'
                elif any(label.startswith(ERROR) for label in labels):
                    outcome = 'error'
                else:
                    time.sleep(0.5)
            ctx.screenshot('report-after-send', shrink=True)
            verdict.check('send.visible_outcome', outcome is not None, f'Send produced a visible outcome: {outcome!r}')
            verdict.check('send.success', outcome == 'thanks',
                          'the thanks card rendered' if outcome == 'thanks'
                          else f'outcome={outcome!r}; on screen: {[l for l in ctx.labels() if l.startswith(ERROR)]}')

        # 4. Server effect: the persisted row carries the words and the held label.
        meta = fixture.read() or {}
        uid = str(meta.get('supabaseUserId') or '')
        row = self.newest_report(ctx, uid) if uid else None
        if row is None:
            verdict.check('api.report_persisted', None, 'could not read incident_reports on the API host over SSH',
                          blocked_until='deploy-ssh', evidence=[f'uid={uid!r}'])
            return
        fresh = row.get('created_at', 0) >= started - 5
        verdict.check('api.report_persisted', fresh and row.get('what_went_wrong', '').startswith(STILL_LOCKED),
                      f'newest incident_reports row for the fixture user: {row}')
        verdict.check('api.report_carries_activity_truth', row.get('activity') == 'walking',
                      f'diagnostics.activityTruth.activity = {row.get("activity")!r}')

    # ------------------------------------------------------------------ #
    @staticmethod
    def scroll_to_node(ctx: RunContext, label: str) -> dict[str, Any] | None:
        for _ in range(6):
            node = ctx.find(label, 2)
            if node and node['frame']['y'] < 760:
                return node
            ctx.swipe_up()
        return ctx.find(label, 2)

    @staticmethod
    def hold_node(ctx: RunContext, node: dict[str, Any], seconds: float = 0.9) -> None:
        frame = node['frame']
        x, y = round(frame['x'] + frame['width'] / 2), round(frame['y'] + frame['height'] / 2)
        subprocess.run(['idb', 'ui', 'tap', '--udid', ctx.udid, str(x), str(y), '--duration', str(seconds)],
                       check=True, capture_output=True, text=True)
        ctx.log(f'held ({x}, {y}) for {seconds}s')

    @staticmethod
    def newest_report(ctx: RunContext, uid: str) -> dict[str, Any] | None:
        host = env_value('DEPLOY_HOST', DEFAULT_HOST) or DEFAULT_HOST
        key = os.path.expanduser(env_value('DEPLOY_SSH_KEY', DEFAULT_KEY) or DEFAULT_KEY)
        sql = ("select extract(epoch from created_at), what_went_wrong, "
               "coalesce(diagnostics->'activityTruth'->>'activity', '') "
               f"from incident_reports where user_id = '{uid}' order by created_at desc limit 1")
        remote = f'sudo -n -u postgres psql excerlock -Atc {shlex.quote(sql)}'
        try:
            result = subprocess.run(['ssh', '-i', key, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', host, remote],
                                    capture_output=True, text=True, timeout=40)
        except (OSError, subprocess.TimeoutExpired) as error:
            ctx.log(f'ssh read failed: {error}')
            return None
        if result.returncode != 0:
            ctx.log(f'ssh read failed: {result.stderr.strip()}')
            return None
        line = result.stdout.strip().splitlines()
        if not line:
            ctx.log('no incident_reports row for the fixture user')
            return {'created_at': 0, 'what_went_wrong': '', 'activity': ''}
        created, words, activity = line[-1].split('|', 2)
        return {'created_at': float(created), 'what_went_wrong': words, 'activity': activity}
