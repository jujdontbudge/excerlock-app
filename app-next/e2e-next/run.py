#!/usr/bin/env python3
"""e2e-next runner: headless simulator scenarios against the live preview services.

  python3 app-next/e2e-next/run.py --list
  python3 app-next/e2e-next/run.py E2E-N1 E2E-V1
  python3 app-next/e2e-next/run.py --all

Owns the pinned simulator (``EXCERLOCK_SIM_UDID``, default the ExcerLock-Next
device), the release-style preview build, and the per-run output tree
``app-next/e2e-next/out/<run>/<scenario>/`` containing screenshots, the
accessibility trees, the recording and exactly one ``verdict.json`` per scenario.

Exit code: 0 all scenarios PASS, 1 any FAIL, 2 any BLOCKED (never SKIP-as-pass).
"""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import build as build_module  # noqa: E402
import harness  # noqa: E402
from harness import BLOCKED, FAIL, PASS, OUT, RunContext, detect_capabilities, pinned_udid  # noqa: E402
from scenarios import SCENARIOS  # noqa: E402


def ensure_booted(udid: str) -> None:
    state = subprocess.run(['xcrun', 'simctl', 'list', 'devices', '--json'], capture_output=True, text=True).stdout
    try:
        devices = json.loads(state)['devices']
    except (json.JSONDecodeError, KeyError):
        devices = {}
    booted = any(device.get('state') == 'Booted' for group in devices.values() for device in group
                 if device.get('udid') == udid)
    if not booted:
        print(f'== booting simulator {udid}')
        subprocess.run(['xcrun', 'simctl', 'boot', udid], capture_output=True)
    subprocess.run(['xcrun', 'simctl', 'bootstatus', udid, '-b'], capture_output=True)
    # Headless pinning used by every capture script in this repo (e2e/README.md).
    subprocess.run(['xcrun', 'simctl', 'ui', udid, 'appearance', 'light'], capture_output=True)
    subprocess.run(['xcrun', 'simctl', 'status_bar', udid, 'override', '--time', '9:41', '--batteryState',
                    'charged', '--batteryLevel', '100', '--dataNetwork', 'wifi', '--wifiMode', 'active',
                    '--wifiBars', '3', '--cellularMode', 'active', '--cellularBars', '4'], capture_output=True)


def resolve_build(udid: str, *, rebuild: bool, no_build: bool) -> dict:
    manifest = harness.BUILD_DIR / 'build.json'
    if manifest.exists() and not rebuild:
        info = json.loads(manifest.read_text())
        if Path(info['app']).exists():
            installed = subprocess.run(['xcrun', 'simctl', 'get_app_container', udid, harness.BUNDLE_ID, 'app'],
                                       capture_output=True).returncode == 0
            if installed:
                return info
            if not no_build:
                print(f'== installing existing build {info["app"]}')
                subprocess.run(['xcrun', 'simctl', 'install', udid, info['app']], check=True)
                return info
        else:
            print(f'== build artifact missing at {info["app"]}; rebuilding')
    if no_build:
        raise SystemExit('run.py: --no-build given but no usable build manifest exists')
    print('== building release-style preview app (expo prebuild + pod install + xcodebuild Release)')
    info = build_module.build(udid, install=True)
    manifest.parent.mkdir(parents=True, exist_ok=True)
    manifest.write_text(json.dumps(info, indent=2) + '\n')
    return info


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('scenarios', nargs='*', help='scenario ids (E2E-N1 ...)')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--list', action='store_true')
    parser.add_argument('--udid', default='')
    parser.add_argument('--run-id', default='')
    parser.add_argument('--build', action='store_true', help='force a rebuild')
    parser.add_argument('--no-build', action='store_true', help='never build; fail if no artifact')
    parser.add_argument('--no-video', action='store_true')
    parser.add_argument('--capture-fixture', default='', help='snapshot the installed app container as this fixture name and exit')
    args = parser.parse_args()

    if args.list:
        for scenario in SCENARIOS.values():
            print(f'{scenario.id}\t{scenario.lane}\t{scenario.users}\t{scenario.fixture}\t{scenario.title}')
        return 0

    selected = list(SCENARIOS.values()) if args.all else [SCENARIOS[key] for key in args.scenarios]
    if not selected:
        parser.error('no scenario selected (use --all, --list, or scenario ids)')

    udid = args.udid or pinned_udid()
    os.environ['EXCERLOCK_SIM_UDID'] = udid
    ensure_booted(udid)

    if args.capture_fixture:
        context = RunContext(udid, 'fixture-capture', args.capture_fixture, {'app': ''}, {}, record_video=False)
        target = context.snapshot_container(args.capture_fixture)
        print(f'captured app container -> {target}')
        return 0

    build_info = resolve_build(udid, rebuild=args.build, no_build=args.no_build)
    capabilities = detect_capabilities()
    run_id = args.run_id or time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
    run_dir = OUT / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    print(f'== run {run_id} on {udid}')
    print(f'== build {build_info["app"]} (environment={build_info.get("environment")}, channel={build_info.get("channel")})')
    print('== sibling contracts: ' + ', '.join(
        f'{name}={"landed" if state["landed"] else "pending"}' for name, state in capabilities.items()))

    summary: list[dict] = []
    for scenario in selected:
        print(f'\n== {scenario.id} {scenario.title}')
        context = RunContext(udid, run_id, scenario.id, build_info, capabilities, record_video=not args.no_video)
        context.verdict.title = scenario.title
        context.verdict.lane = scenario.lane
        context.verdict.users = scenario.users
        context.verdict.blocked_reason = scenario.blocked_reason
        started = time.time()
        try:
            context.device.update(context.app_version())
            if scenario.prepare(context):
                scenario.run(context)
        except KeyboardInterrupt:
            context.verdict.fail('interrupted')
            context.write_verdict()
            raise
        except Exception as error:  # noqa: BLE001 - a crash is a FAIL, never a silent skip
            detail = f'{type(error).__name__}: {error}'
            context.log(f'CRASH {detail}')
            context.log(traceback.format_exc())
            context.verdict.fail(detail)
        verdict_path = context.write_verdict()
        verdict = context.verdict
        print(f'== {scenario.id}: {verdict.status()} ({time.time() - started:.0f}s) — {verdict.reason()}')
        print(f'== verdict {verdict_path}')
        summary.append({'scenario': scenario.id, 'status': verdict.status(), 'reason': verdict.reason(),
                        'verdict': str(verdict_path.relative_to(harness.REPO)),
                        'assertions': [a.as_dict() for a in verdict.assertions]})

    run_manifest = {
        'runId': run_id,
        'udid': udid,
        'build': build_info,
        'capabilities': capabilities,
        'startedAt': run_id,
        'finishedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'scenarios': summary,
    }
    (run_dir / 'run.json').write_text(json.dumps(run_manifest, indent=2) + '\n')

    print('\n== summary')
    for item in summary:
        print(f'  {item["status"]:<7} {item["scenario"]}  {item["reason"][:110]}')
    statuses = {item['status'] for item in summary}
    if FAIL in statuses:
        return 1
    if BLOCKED in statuses:
        return 2
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
