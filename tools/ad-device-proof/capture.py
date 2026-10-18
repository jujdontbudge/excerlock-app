#!/usr/bin/env python3
import datetime
import json
from pathlib import Path
import re
import sys

root = Path.home() / 'device-test'
root.mkdir(mode=0o700, exist_ok=True)
pattern = re.compile(r'\[ExcerLockAds\] (meta|tiktok) event=([A-Za-z0-9_]+) value=(none|[0-9.]+) currency=(none|[A-Z]{3})\s*$')
initialization = re.compile(r'\[ExcerLockAds\] (?:meta configured; app-event diagnostics enabled|meta privacy metadata=(?:true|false) productImprovement=(?:true|false) skan=(?:true|false)|tiktok started testMode=(?:true|false)|tiktok local-live-proof testMode=false appId=[0-9]+ tiktokAppId=[0-9]+)\s*$')
with (root / 'sdk-diagnostics.ndjson').open('a', buffering=1) as diagnostics, (root / 'events.ndjson').open('a', buffering=1) as events:
    for line in sys.stdin:
        utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
        match = pattern.search(line)
        if match:
            platform, name, value, currency = match.groups()
            row = dict(observed_utc=utc, platform=platform, event=name, value=None if value == 'none' else float(value), currency=None if currency == 'none' else currency, evidence='native SDK invocation; not delivery receipt')
            events.write(json.dumps(row) + '\n')
            diagnostics.write(json.dumps(row) + '\n')
        else:
            match = initialization.search(line)
            if match:
                diagnostics.write(json.dumps(dict(observed_utc=utc, message=match.group(0))) + '\n')
