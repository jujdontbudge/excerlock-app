#!/usr/bin/env python3
import argparse
import datetime
import json
from pathlib import Path
import subprocess
import time

DEVICE = 'F4E839C0-3F05-5BF8-BA31-12949B2B83AB'
ROOT = Path.home() / 'device-test'


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def status(message):
    (ROOT / 'STATUS.txt').write_text(utc() + ' ' + message + '\n')


def credentials():
    target = ROOT / 'sandbox-account.json'
    try:
        account = json.loads(target.read_text())
        return account.get('email') == 'johansardar77+excersbx1@gmail.com' and bool(account.get('password'))
    except (OSError, ValueError):
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hours', type=float, default=4)
    parser.add_argument('--until', help='Original UTC deadline when resuming, ISO 8601')
    args = parser.parse_args()
    if not 0 < args.hours <= 4:
        parser.error('Polling is limited to four hours')
    ROOT.mkdir(mode=0o700, exist_ok=True)
    remaining = args.hours * 3600
    if args.until:
        until = datetime.datetime.fromisoformat(args.until)
        if until.tzinfo is None:
            parser.error('--until must include a UTC offset')
        remaining = min(remaining, max(0, (until - datetime.datetime.now(datetime.timezone.utc)).total_seconds()))
    deadline = time.monotonic() + remaining
    status('Waiting on iPhone Il unlock; polling every 60 seconds; GUI-session signing/account prerequisites are recorded in NEED.txt.')
    while time.monotonic() < deadline:
        started = time.monotonic()
        answer = ROOT / 'answer.txt'
        if answer.exists():
            contents = answer.read_text()
            answer.unlink()
            target = ROOT / ('answer-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.txt')
            target.touch(mode=0o600)
            target.write_text(contents)
            print(utc(), 'Human answer received; saved privately for agent review.', flush=True)
        stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        target = ROOT / ('lock-' + stamp + '.json')
        try:
            result = subprocess.run(['xcrun', 'devicectl', 'device', 'info', 'lockState', '--device', DEVICE, '--timeout', '15', '--json-output', str(target)], capture_output=True, timeout=20)
            state = json.loads(target.read_text()).get('result', {})
            unlocked = result.returncode == 0 and state.get('passcodeRequired') is False
            credential_ready = credentials()
            row = dict(utc=utc(), unlocked=unlocked, sandbox_credentials_available=credential_ready, lock_evidence=str(target))
            with (ROOT / 'wait.ndjson').open('a') as log:
                log.write(json.dumps(row) + '\n')
            print(json.dumps(row), flush=True)
            if unlocked:
                status('iPhone Il unlocked; resuming device inspection. No app/container deletion permitted.')
                return 0
        except (OSError, ValueError, subprocess.TimeoutExpired) as error:
            print(utc(), 'Poll unavailable:', type(error).__name__, flush=True)
        status('Waiting on iPhone Il unlock; last poll locked/unavailable. Sandbox signing prerequisites are recorded in NEED.txt.')
        time.sleep(min(max(0, 60 - (time.monotonic() - started)), max(0, deadline - time.monotonic())))
    status('Blocked: four-hour phone-unlock wait expired. No device run started by this watcher.')
    return 3


if __name__ == '__main__':
    raise SystemExit(main())
