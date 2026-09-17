"""E2E-S1 — startup budget run: 10 cold launches, medians vs §6.2 budgets.

What the SIM lane measures today, in two independent ways:

* the `simctl launch` call latency and the wall-clock time from launch to the
  first *interactive* app surface, observed through the accessibility tree (idb
  polling, so ~0.3-1 s resolution);
* the app's own B10 os_signpost stage boundaries, read out of the simulator's
  unified log (`log show --signpost`, parsed by `measure-startup.sh --sim-log`
  through the same `startup-stage-medians.cjs` the xctrace path uses). These are
  delegate-relative step and cumulative times — `FirstReactRender`,
  `HydrationDone`, `RuntimeReady`, `BootGateRedirect` on a fresh install — with
  one sample per launch.

What it cannot measure: the §6.2 sub-second budgets (first frame ≤1.5 s,
interactive Home ≤2.5 s). ADR 0021/0033 make those a signed Release build
measured on the target device, so the budget assertions stay BLOCKED-until
`device-lane`; the stage medians are simulator numbers and are labelled as such
everywhere they appear. The interactive-Home stage additionally needs the
existing-user fixture, because a fresh install boots into onboarding and never
reaches Home (see E2E-E1).

The xctrace route to the same numbers is not attempted per run on the simulator:
`xcrun xctrace record` against a simulator target fails to set its tap and then
never exits (README finding 3). Against the paired iPhone it does work, and the
device stage medians were recorded that way once
(`app-next/evidence/T15/device-startup-stage-medians/`).
"""
from __future__ import annotations

import json
import statistics
import time

from harness import Scenario, RunContext, log_timestamp

LAUNCHES = 10
#: §6.2 release-build budgets
BUDGET_FIRST_FRAME = 1.5
BUDGET_INTERACTIVE_HOME = 2.5
#: Coarse sanity bound for "the app came up at all" through idb polling.
COARSE_SURFACE_BOUND = 10.0
#: Stages a fresh install must mark on every cold start (Home needs the fixture).
REQUIRED_STAGES = ('FirstReactRender', 'HydrationDone', 'RuntimeReady', 'BootGateRedirect')
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
        since = log_timestamp()
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

        stages = ctx.record_simulator_stage_medians(since, ctx.dir)
        ctx.log(f'simulator stage medians: {json.dumps(stages.get("medians", {}).get("stages", {}))}')
        artifact = ctx.dir / 'startup-budget.json'
        artifact.write_text(json.dumps({
            'launches': launches,
            'budgets': {'firstFrame': BUDGET_FIRST_FRAME, 'interactiveHome': BUDGET_INTERACTIVE_HOME,
                        'coarseSurfaceBound': COARSE_SURFACE_BOUND},
            'signposts': ctx.startup_marks(),
            'stageMediansSource': stages.get('capture'),
            'stageMediansCommand': stages.get('command'),
            'stageMedians': stages.get('medians', {}).get('stages', {}),
            'stageMediansLaunches': stages.get('medians', {}).get('launches'),
            'stageMediansErrors': stages.get('error'),
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

        self.stage_medians(ctx, stages)
        verdict.check('startup.first_frame_median', None,
                      'the §6.2 budgets are device measurements: ADR 0021/0033 keep the os_signpost numbers '
                      'delegate-relative diagnostics, and E2E-S1 measures them on a simulator, so the T15 budget '
                      'gate stays on a signed TestFlight build (plan §6.3 "device numbers recorded once per binary '
                      'on TestFlight hardware")',
                      blocked_until='device-lane', evidence=['startup-budget.json'])
        verdict.check('startup.interactive_home_median', None,
                      'the §6.2 interactive-Home budget additionally needs the existing-user fixture: this '
                      'run is a fresh install, which boots into onboarding (see E2E-E1 blocker)',
                      blocked_until='existing-user-fixture', evidence=['startup-budget.json'])

    @staticmethod
    def stage_medians(ctx: RunContext, capture: dict) -> None:
        """Report the simulator's own B10 stage medians, or block on the capture."""
        evidence = ['startup-budget.json', 'startup-sim-log/stage-medians.json']
        if not capture.get('ok'):
            ctx.verdict.check('startup.stage_medians_simulator', None,
                              'the simulator unified-log stage capture did not complete: '
                              + json.dumps(capture)[:300],
                              blocked_until='sim-log-signposts', evidence=evidence)
            return
        medians = capture.get('medians') or {}
        stages = medians.get('stages') or {}
        missing = [stage for stage in REQUIRED_STAGES if stage not in stages]
        detail = (f'simulator numbers (delegate-relative stage medians from the simulator unified log, '
                  f'{medians.get("launches")} launch(es)): ' + json.dumps(stages))
        if missing:
            ctx.verdict.check('startup.stage_medians_simulator', False,
                              f'the app marked only {sorted(stages)} on a cold start; missing {missing} — '
                              'the B10 stage contract regressed', evidence=evidence)
            return
        if medians.get('launches') != LAUNCHES:
            ctx.verdict.check('startup.stage_medians_simulator', False,
                              f'only {medians.get("launches")}/{LAUNCHES} cold launches reported startup stages; '
                              + detail, evidence=evidence)
            return
        ctx.verdict.check('startup.stage_medians_simulator', True, detail, evidence=evidence)
        ctx.note('the stage medians above are simulator, delegate-relative diagnostics; they are not the §6.2 '
                 'budgets and must not be reported as device startup numbers (ADR 0021/0033)')

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
