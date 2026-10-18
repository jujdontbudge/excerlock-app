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
pending_meta_epoch = None
tracking = re.compile(r'\[ExcerLockAds\] tracking status=([0-3]) idfa=(none|[A-Fa-f0-9-]{36})\s*$')
with (root / 'tracking.ndjson').open('a', buffering=1) as identifiers, (root / 'automatic-events.ndjson').open('a', buffering=1) as automatic, (root / 'sdk-diagnostics.ndjson').open('a', buffering=1) as diagnostics, (root / 'events.ndjson').open('a', buffering=1) as events:
    for line in sys.stdin:
        utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
        consent = tracking.search(line)
        if consent:
            status, identifier = consent.groups()
            identifiers.write(json.dumps(dict(observed_utc=utc, status=int(status), idfa=None if identifier == 'none' else identifier)) + '\n')
        recorded = re.search(r'FBSDKAppEvents: Recording event @ ([0-9.]+):', line)
        if recorded:
            pending_meta_epoch = float(recorded.group(1))
        meta_name = re.search(r"_eventName[\"']?\s*[:=]\s*[\"']?([A-Za-z0-9_]+)", line)
        if pending_meta_epoch is not None and meta_name:
            name = meta_name.group(1)
            if name in {'fb_mobile_activate_app', 'fb_mobile_purchase', 'fb_mobile_complete_registration', 'fb_mobile_content_view', 'StartTrial', 'Subscribe'}:
                automatic.write(json.dumps(dict(observed_utc=utc, event_utc=datetime.datetime.fromtimestamp(pending_meta_epoch, datetime.timezone.utc).isoformat(), platform='meta', event=name, evidence='SDK Recording event diagnostic; may overlap native invocation; not a delivery receipt')) + '\n')
            pending_meta_epoch = None
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
