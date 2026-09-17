"""E2E-S1 — startup budget run: 10 cold launches, medians vs §6.2 budgets.

What the SIM lane can measure today: the `simctl launch` call latency and the
wall-clock time from launch to the first *interactive* app surface, observed
through the accessibility tree (idb polling, so ~0.3-1 s resolution).

What it cannot: the §6.2 sub-second budgets (first frame ≤1.5 s, interactive Home
≤2.5 s). Those come from the app's own os_signpost marks, and the simulator's
unified log carries no signpost records at all on this host (`log show
--signposts` returns zero lines for the whole device, not just this app), so the
precise numbers need the xctrace path that plan §6.3 / B10 finishes. The scenario
records every measurement and reports those budgets BLOCKED-until B10 instead of
pretending a coarse number proves them.
"""
from __future__ import annotations

import json
import statistics
import time

from harness import Scenario, RunContext

LAUNCHES = 10
#: §6.2 release-build budgets
BUDGET_FIRST_FRAME = 1.5
BUDGET_INTERACTIVE_HOME = 2.5
#: Coarse sanity bound for "the app came up at all" through idb polling.
COARSE_SURFACE_BOUND = 10.0
SURFACES = ('Get started', 'Home', 'Hi,', 'Choose your plan', 'Setup progress')


class S1StartupBudget(Scenario):
    id = 'E2E-S1'
    title = 'Startup budget: 10 cold launches, medians vs §6.2'
    lane = 'SIM'
    users = 'BOTH'
    fixture = 'fresh-install'
    requires = ('B10.startup_marks',)

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        launches: list[dict] = []
        for index in range(1, LAUNCHES + 1):
            ctx.terminate()
            time.sleep(1.2)
            started = time.monotonic()
            command_seconds = ctx.launch()
            surface, surface_seconds = self.first_surface(ctx, started)
            time.sleep(1.0)
            record = {
                'launch': index,
                'simctlLaunchSeconds': round(command_seconds, 3),
                'firstSurface': surface,
                'firstSurfaceSeconds': None if surface_seconds is None else round(surface_seconds, 3),
            }
            launches.append(record)
            ctx.log(f'launch {index}: command {command_seconds:.2f}s, first surface {surface!r} '
                    f'after {record["firstSurfaceSeconds"]}s')

        artifact = ctx.dir / 'startup-budget.json'
        artifact.write_text(json.dumps({
            'launches': launches,
            'budgets': {'firstFrame': BUDGET_FIRST_FRAME, 'interactiveHome': BUDGET_INTERACTIVE_HOME,
                        'coarseSurfaceBound': COARSE_SURFACE_BOUND},
            'signposts': ctx.startup_marks(),
        }, indent=2) + '\n')
        verdict.artifacts.setdefault('files', []).append(artifact.name)

        samples = [item['firstSurfaceSeconds'] for item in launches if item['firstSurfaceSeconds'] is not None]
        ctx.note(f'launch → first surface samples: {samples}')
        ctx.note('these coarse numbers include idb accessibility-polling latency (each describe-all is '
                 '~0.3-0.5 s) and are not comparable to the §6.2 signpost budgets')
        verdict.check('startup.surfaces_observed', len(samples) == LAUNCHES,
                      f'{len(samples)}/{LAUNCHES} cold launches reached an interactive surface '
                      f'({sorted({item["firstSurface"] for item in launches})})')
        if samples:
            median = statistics.median(samples)
            verdict.check('startup.coarse_surface_median', median <= COARSE_SURFACE_BOUND,
                          f'median launch → first interactive surface {median:.2f}s over {len(samples)} launches '
                          f'(coarse idb-observed bound ≤{COARSE_SURFACE_BOUND}s; not the §6.2 budget)',
                          evidence=['startup-budget.json'])

        marks = ctx.startup_marks()
        verdict.check('startup.first_frame_median', None if not marks else None,
                      'the §6.2 first-frame budget needs the app\'s os_signpost marks, and the simulator '
                      'unified log carries no signpost records on this host (log show --signposts returns 0 '
                      'lines device-wide); plan §6.3/B10 owns the xctrace numeric parse',
                      blocked_until='B10.startup_marks', evidence=['startup-budget.json'])
        verdict.check('startup.interactive_home_median', None,
                      'the §6.2 interactive-Home budget additionally needs the existing-user fixture: this '
                      'run is a fresh install, which boots into onboarding (see E2E-E1 blocker)',
                      blocked_until='existing-user-fixture', evidence=['startup-budget.json'])

    @staticmethod
    def first_surface(ctx: RunContext, started: float, timeout: float = 60.0) -> tuple[str, float | None]:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            labels = set(ctx.labels())
            for surface in SURFACES:
                if surface in labels:
                    return surface, time.monotonic() - started
            ctx.answer_system_prompt()
            time.sleep(0.2)
        return '', None
