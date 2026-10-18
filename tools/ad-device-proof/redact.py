#!/usr/bin/env python3
"""Filter credential typing activities before xcodebuild output reaches a log."""
import json
from pathlib import Path
import sys

account = json.loads((Path.home() / 'device-test/sandbox-account.json').read_text())
secret = account['password']
forms = {secret, json.dumps(secret)[1:-1], secret.replace("'", "\\'")}
for line in sys.stdin:
    if 'Type ' in line:
        line = '[device proof: text-entry activity redacted]\n'
    else:
        for value in forms:
            if value:
                line = line.replace(value, '<redacted>')
    sys.stdout.write(line)
    sys.stdout.flush()
