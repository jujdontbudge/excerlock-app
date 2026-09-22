"""E2E-M1 — the native sensor surface answers JS honestly (OTA-readiness smoke).

Drives the preview-only `/diagnostics/sensors` route, which starts and stops
every Core Motion stream the binary exposes (activity+cadence, device motion,
altimeter, magnetometer, pedometer events) and probes the sensor recorder, then
judges each answer against the availability flag the same binary reported.

The simulator ships no motion daemon (modules/excerlock-motion/README.md,
measured 2026-08-01), so the honest answer here is "unavailable, rejected with
ERR_MOTION_UNAVAILABLE, stopped" for every stream. What this proves is the
bridge: every new AsyncFunction exists, is callable from the release JS bundle,
rejects with the documented code instead of crashing or hanging, and stop() is
idempotent. Sensor *readings* stay a device-lane concern.

Motion & Fitness stays undetermined on purpose. The Swift guards check
availability before touching Core Motion, so an unavailable stream rejects
without ever prompting, and the smoke exercises all five streams plus the
recorder with no permission sheet. Granting motion up front is not an option on
this simulator: the runtime's boot reconcile then calls detection.start(), the
motion-less simulator rejects it and the boot gate fails (run 20260919T0448Z,
Sentry EXCERLOCK-MOBILE-H; simctl privacy changes also relaunch the app, run
20260919T0455Z). Every supported iPhone ships Core Motion, so that path is
simulator-only.
"""
from __future__ import annotations

import json
import re
import time

from harness import Scenario, RunContext

STREAM_TITLES = ('Activity + cadence', 'Device motion', 'Altimeter', 'Magnetometer', 'Pedometer events')
RECORDER_TITLE = 'Sensor recorder'
AVAILABILITY_FLAGS = ('activity', 'cadence', 'stepCounting', 'deviceMotion', 'magnetometer', 'relativeAltitude',
                      'floorCounting', 'distance', 'pace', 'pedometerEvents', 'sensorRecorder')
UNAVAILABLE = 'ERR_MOTION_UNAVAILABLE'
HONEST = re.compile(r'^Done — all (\d+) streams answered honestly$')
MISMATCH = re.compile(r'^Done — (\d+) mismatch')


class M1SensorSmoke(Scenario):
    id = 'E2E-M1'
    title = 'Native sensor surface: every stream starts/stops from JS and answers its availability flag honestly'
    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        ctx.launch()
        if not ctx.wait_for_app(['Get started', 'Home', 'Hello,'], 90):
            verdict.block('the release build did not reach a first surface within 60 s')
            return
        ctx.sim.open_url('excerlock://diagnostics/sensors')
        if not ctx.wait_for('Sensor smoke', 20):
            labels = sorted({label for label in ctx.labels() if label})[:16]
            verdict.check('route.opens', False, 'excerlock://diagnostics/sensors did not render the smoke screen '
                          f'(observed {json.dumps(labels)})')
            ctx.screenshot('no-route')
            return
        verdict.check('route.opens', True, 'the preview build routes /diagnostics/sensors')

        summary = self.wait_for_summary(ctx, 45)
        ctx.screenshot('sensor-smoke-top', shrink=True)
        labels = [label.strip() for label in ctx.labels() if label and label.strip()]
        ctx.note('labels: ' + json.dumps(labels))
        if summary is None:
            verdict.check('smoke.completes', False, 'no "Done — …" verdict line within 45 s (still "Running…"?)')
            return
        honest = HONEST.match(summary)
        mismatched = MISMATCH.match(summary)
        verdict.check('smoke.completes', True, summary)
        verdict.check('smoke.honest', bool(honest),
                      f'{summary}' if honest else f'the app judged its own native answers inconsistent: {summary}')
        if honest:
            verdict.check('smoke.stream_count', int(honest.group(1)) == len(STREAM_TITLES),
                          f'{honest.group(1)} streams judged (catalogue has {len(STREAM_TITLES)})')
        elif mismatched:
            ctx.note(f'{mismatched.group(1)} mismatching stream(s); see labels above')

        # One row per stream, each with a start verdict and a stop verdict.
        rows = self.stream_rows(labels)
        missing = [title for title in STREAM_TITLES if title not in rows]
        verdict.check('streams.all_present', not missing, f'rows: {json.dumps(rows)}' if not missing else f'missing rows for {missing}')
        for title in STREAM_TITLES:
            detail = rows.get(title)
            if detail is None:
                continue
            stopped = detail.endswith('stopped')
            skipped = 'skipped' in detail
            started = '· started ·' in detail
            rejected_unavailable = f'unavailable · rejected {UNAVAILABLE}' in detail
            verdict.check(f'stream.{self.slug(title)}.stop', stopped, f'{title}: {detail}')
            # Nothing is available here, so nothing may be skipped: an unavailable
            # stream rejects before it could prompt and the smoke must exercise it.
            verdict.check(f'stream.{self.slug(title)}.start', not skipped and (started or rejected_unavailable),
                          f'{title}: {detail}')
        recorder = rows.get(RECORDER_TITLE)
        verdict.check('recorder.honest', recorder is not None and (
            f'unavailable · rejected {UNAVAILABLE}' in recorder or 'available · recorded' in recorder),
            f'{RECORDER_TITLE}: {recorder}')

        # The availability flags the binary reported, verbatim, as evidence.
        flags = self.flag_rows(labels)
        ctx.note('availability: ' + json.dumps(flags))
        verdict.check('availability.all_flags', all(flag in flags for flag in AVAILABILITY_FLAGS),
                      f'{len(flags)}/{len(AVAILABILITY_FLAGS)} flags rendered: {json.dumps(flags)}')
        # The simulator has no motion daemon: Apple's own answers must be "no".
        for flag in ('activity', 'cadence', 'stepCounting'):
            verdict.check(f'availability.simulator.{flag}', flags.get(flag) == 'no',
                          f'{flag} = {flags.get(flag)!r} (simulator ships no Core Motion backend)')
        # Fresh install, no prompt raised: the smoke must leave Motion & Fitness undetermined.
        access = self.value_after(labels, 'Motion & Fitness')
        verdict.check('availability.motion_access', access == 'notDetermined',
                      f'Motion & Fitness = {access!r} (the smoke must not prompt)')
        ctx.scroll_to('sensorRecorder')
        ctx.screenshot('sensor-smoke-availability', shrink=True)

        # Run again must reach the same honest verdict: start/stop are idempotent.
        # The verdict text is identical, so the screen's run counter is what
        # distinguishes the second run (all streams reject in milliseconds here).
        verdict.check('smoke.run_counter', self.value_after(labels, 'Runs') == '1', f'Runs = {self.value_after(labels, "Runs")!r}')
        if ctx.tap_scrolled('Run again'):
            second = self.wait_for_summary(ctx, 45, run='2')
            verdict.check('smoke.repeatable', second is not None and bool(HONEST.match(second)),
                          f'second run: {second!r}')
            ctx.screenshot('sensor-smoke-rerun', shrink=True)
        else:
            verdict.check('smoke.repeatable', False, 'Run again button not found')

    # -- helpers ---------------------------------------------------------- #
    @staticmethod
    def slug(title: str) -> str:
        return re.sub(r'[^a-z0-9]+', '_', title.lower()).strip('_')

    @classmethod
    def wait_for_summary(cls, ctx: RunContext, timeout: float, *, run: str = '1') -> str | None:
        """The "Done — …" line once the screen's run counter reads `run`."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            labels = [label.strip() for label in ctx.labels() if label]
            if cls.value_after(labels, 'Runs') == run:
                for label in labels:
                    if label.startswith('Done — '):
                        return label
            time.sleep(0.8)
        return None

    @staticmethod
    def stream_rows(labels: list[str]) -> dict[str, str]:
        """Title → the row's verdict line (the label that follows the title)."""
        rows: dict[str, str] = {}
        titles = set(STREAM_TITLES) | {RECORDER_TITLE}
        for index, label in enumerate(labels):
            if label in titles and index + 1 < len(labels):
                rows[label] = labels[index + 1]
        return rows

    @staticmethod
    def flag_rows(labels: list[str]) -> dict[str, str]:
        flags: dict[str, str] = {}
        for index, label in enumerate(labels):
            if label in AVAILABILITY_FLAGS and index + 1 < len(labels) and labels[index + 1] in ('yes', 'no'):
                flags[label] = labels[index + 1]
        return flags

    @staticmethod
    def value_after(labels: list[str], title: str) -> str | None:
        for index, label in enumerate(labels):
            if label == title and index + 1 < len(labels):
                return labels[index + 1]
        return None
