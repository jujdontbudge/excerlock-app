"""E2E-S1 — startup budget run: 10 cold launches, medians vs §6.2 budgets."""
from __future__ import annotations

import json
import statistics
import time

from harness import Scenario, RunContext

LAUNCHES = 10
#: §6.2 release-build budgets
BUDGET_FIRST_FRAME = 1.5
BUDGET_INTERACTIVE_HOME = 2.5
BUDGET_ONBOARDING_OFFLINE = 3.5


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
            start = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(time.time() - 1))
            command_seconds = ctx.launch()
            first_surface = ctx.wait_for_any(['Get started', 'Home', 'Hi,', 'Choose your plan'], 45)
            time.sleep(1.5)
            marks = ctx.startup_marks(start=start)
            record = {
                'launch': index,
                'simctlLaunchSeconds': round(command_seconds, 3),
                'firstSurface': first_surface or '',
                'marks': marks,
            }
            launches.append(record)
            ctx.log(f'launch {index}: command {command_seconds:.2f}s, surface {first_surface!r}, '
                    f'frame {marks.get("delegateToFirstFrame")}, home {marks.get("delegateToInteractiveHome")}')

        artifact = ctx.dir / 'startup-budget.json'
        artifact.write_text(json.dumps({'launches': launches, 'budgets': {
            'firstFrame': BUDGET_FIRST_FRAME, 'interactiveHome': BUDGET_INTERACTIVE_HOME,
            'interactiveOnboardingOffline': BUDGET_ONBOARDING_OFFLINE}}, indent=2) + '\n')
        verdict.artifacts.setdefault('files', []).append(artifact.name)

        frames = [item['marks']['delegateToFirstFrame'] for item in launches
                  if item['marks'].get('delegateToFirstFrame') is not None]
        homes = [item['marks']['delegateToInteractiveHome'] for item in launches
                 if item['marks'].get('delegateToInteractiveHome') is not None]
        ctx.note(f'first-frame samples: {[round(value, 3) for value in frames]}')
        ctx.note(f'interactive-home samples: {[round(value, 3) for value in homes]}')
        if frames:
            median_frame = statistics.median(frames)
            verdict.check('startup.first_frame_median', median_frame <= BUDGET_FIRST_FRAME,
                          f'median delegate → first React frame {median_frame:.2f}s over {len(frames)} launches '
                          f'(budget ≤{BUDGET_FIRST_FRAME}s, §6.2)', evidence=['startup-budget.json'])
        else:
            verdict.check('startup.first_frame_median', None,
                          'no AppDelegateEntry/FirstReactChildMount signposts in the simulator log; '
                          'B10 adds the remaining stage marks',
                          blocked_until='B10.startup_marks', evidence=['startup-budget.json'])
        if homes:
            median_home = statistics.median(homes)
            verdict.check('startup.interactive_home_median', median_home <= BUDGET_INTERACTIVE_HOME,
                          f'median delegate → interactive Home {median_home:.2f}s over {len(homes)} launches '
                          f'(budget ≤{BUDGET_INTERACTIVE_HOME}s, §6.2)', evidence=['startup-budget.json'])
        else:
            verdict.check('startup.interactive_home_median', None,
                          'no interactive-Home samples: this fixture is a fresh install (onboarding state); '
                          'the Home budget needs the existing-user fixture (see E2E-E1 blocker)',
                          blocked_until='existing-user-fixture', evidence=['startup-budget.json'])
        verdict.check('startup.launch_command', all(item['simctlLaunchSeconds'] < 10 for item in launches),
                      'simctl launch returned for all 10 cold launches (command latency is not app startup time)')
