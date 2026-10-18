#!/usr/bin/env python3
import json
import os
from pathlib import Path
import shutil
import subprocess

root = Path.home() / 'device-test'
root.mkdir(mode=0o700, exist_ok=True)
os.umask(0o077)
workspace = Path(__file__).resolve().parents[2]
probe = workspace / '.excer/device-sign-probe'
shutil.copyfile('/usr/bin/true', probe)
probe.chmod(0o700)
signed = subprocess.run(['codesign', '--force', '--sign', 'ED2ADFC5F61CC2E39AC84D3F90C8C5C1E13189C0', '--timestamp=none', str(probe)], capture_output=True)
(root / 'gui-sign-probe.log').write_bytes(signed.stdout + signed.stderr)
account = subprocess.run(['security', 'find-generic-password', '-s', 'excer-sandbox-tester', '-w'], capture_output=True)
if account.returncode == 0:
    target = root / 'sandbox-account.json'
    target.touch(mode=0o600, exist_ok=True)
    target.chmod(0o600)
    target.write_text(json.dumps(dict(email='johansardar77+excersbx1@gmail.com', password=account.stdout.decode().strip())))
(root / 'gui-auth-status.json').write_text(json.dumps(dict(codesign_ready=signed.returncode == 0, sandbox_credentials_available=account.returncode == 0), indent=2))
