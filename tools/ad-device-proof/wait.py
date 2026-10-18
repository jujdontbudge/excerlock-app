#!/usr/bin/env python3
import argparse
import datetime
import json
from pathlib import Path
import subprocess
import time

DEVICE = 'F4E839C0-3F05-5BF8-BA31-12949B2B83AB'
ROOT = Path.home() / 'device-test'
IDENTITY = 'ED2ADFC5F61CC2E39AC84D3F90C8C5C1E13189C0'


def utc():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def status(message):
    (ROOT / 'STATUS.txt').write_text(utc() + ' ' + message + '\n')


def credentials():
    result = subprocess.run(['security', 'find-generic-password', '-s', 'excer-sandbox-tester', '-w'], capture_output=True, timeout=10)
    if result.returncode == 0:
        target = ROOT / 'sandbox-account.json'
        target.touch(mode=0o600, exist_ok=True)
        target.chmod(0o600)
        target.write_text(json.dumps(dict(email='johansardar77+excersbx1@gmail.com', password=result.stdout.decode().strip())))
        return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--hours', type=float, default=4)
    args = parser.parse_args()
    if not 0 < args.hours <= 4:
        parser.error('Polling is limited to four hours')
    ROOT.mkdir(mode=0o700, exist_ok=True)
    deadline = time.monotonic() + args.hours * 3600
    status('Waiting on iPhone Il unlock; polling every 60 seconds; Keychain access also required for signing.')
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
