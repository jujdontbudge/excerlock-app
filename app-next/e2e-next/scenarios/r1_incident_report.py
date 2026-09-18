"""E2E-R1 — "Something not working?": Send always answers a tap.

Drives the real Report screen on the existing-user fixture the way a person
would: a Send tap with both answers empty must show a message (never a dead
control), one answer must name the missing one, and both answers plus Send
must land either on the thanks screen or on a visible error — never nothing.
"""
from __future__ import annotations

import time
from typing import Any

from harness import Scenario, RunContext

TITLE = 'Something not working?'
WRONG = 'What went wrong?'
EXPECTED = 'What should have happened?'
SEND = 'Send report'
SENDING = 'Sending…'
THANKS = 'Thank you'
MISSING_BOTH = 'Answer both questions, then tap Send.'
MISSING_EXPECTED = 'Tell us what should have happened, then tap Send.'
ERROR = 'Could not send right now.'


class R1IncidentReport(Scenario):
    id = 'E2E-R1'
    title = 'Something not working?: Send answers every tap (message, error or thanks)'
    lane = 'SIM'
    users = 'EXISTING'
    fixture = 'existing-user'

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        ctx.launch()
        if not ctx.wait_for_app(['Home', 'Hi,'], 60):
            verdict.block('the existing-user fixture did not boot to Home; the guarded settings stack is closed')
            return
        with ctx.recording('E2E-R1'):
            ctx.sim.open_url('excerlock://settings/report')
            if not ctx.wait_for(TITLE, 15):
                verdict.block('deep link excerlock://settings/report did not open the Report screen')
                return
            ctx.screenshot('report-empty', shrink=True)

            # 1. Empty press: a message, not a dead control.
            enabled = ctx.button_enabled(SEND)
            verdict.check('send.pressable_when_empty', enabled is True,
                          f'Send button enabled with both answers empty: {enabled!r}')
            ctx.tap(SEND)
            time.sleep(0.8)
            ctx.screenshot('report-empty-press', shrink=True)
            verdict.check('send.empty_press_message', self.visible(ctx, MISSING_BOTH),
                          f'empty Send press shows {MISSING_BOTH!r}', evidence=self.alerts(ctx))

            # 2. One answer: the message names the other.
            typed_wrong = self.fill(ctx, WRONG, 'E2E sim probe: apps stayed locked after my walk.')
            verdict.check('fields.first_typed', typed_wrong, 'first answer typed and read back')
            ctx.tap(SEND)
            time.sleep(0.8)
            ctx.screenshot('report-one-answer-press', shrink=True)
            verdict.check('send.one_answer_message', self.visible(ctx, MISSING_EXPECTED),
                          f'Send with one answer shows {MISSING_EXPECTED!r}', evidence=self.alerts(ctx))

            # 3. Both answers: thanks screen or a visible error, never silence.
            typed_expected = self.fill(ctx, EXPECTED, 'E2E sim probe: they should have opened at my steps.')
            verdict.check('fields.second_typed', typed_expected, 'second answer typed and read back')
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
            labels = sorted({label for label in ctx.labels() if label})[:20]
            verdict.check('send.visible_outcome', outcome is not None,
                          f'Send with both answers produced a visible outcome: {outcome!r}',
                          evidence=[' | '.join(labels)])
            verdict.check('send.success', outcome == 'thanks',
                          'the report reached the API and the thanks screen rendered' if outcome == 'thanks'
                          else f'no thanks screen; outcome={outcome!r} (error shown on screen: {self.alerts(ctx)})')

    # ------------------------------------------------------------------ #
    @staticmethod
    def visible(ctx: RunContext, text: str) -> bool:
        return any(text == (node.get('AXLabel') or '').replace(' ', ' ').strip() for node in ctx.tree())

    @staticmethod
    def alerts(ctx: RunContext) -> list[str]:
        labels = [str(node.get('AXLabel') or '') for node in ctx.tree()]
        return [label for label in labels if 'tap Send' in label or label.startswith(ERROR)]

    @staticmethod
    def field(ctx: RunContext, label: str) -> dict[str, Any] | None:
        return ctx.text_field(label)

    def fill(self, ctx: RunContext, label: str, text: str) -> bool:
        """Type into the labelled multiline field and read the value back from that field."""
        node = self.field(ctx, label)
        if node is None:
            ctx.log(f'no text field labelled {label!r}')
            return False
        ctx.tap_node(node)
        time.sleep(0.5)
        for chunk_start in range(0, len(text), 8):
            ctx.type_text(text[chunk_start:chunk_start + 8])
            time.sleep(0.15)
        for _ in range(10):
            current = self.field(ctx, label) or {}
            if str(current.get('AXValue') or '') == text:
                return True
            time.sleep(0.3)
        ctx.log(f'field {label!r} holds {str((self.field(ctx, label) or {}).get("AXValue"))!r}; wanted {text!r}')
        return False
