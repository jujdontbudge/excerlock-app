#!/usr/bin/env python3
"""Validate the deliberately inactive universal-link association."""
import json
import sys
from pathlib import Path

expected = {
    "applinks": {
        "apps": [],
        "details": [{"appID": "AX3C2B78YD.com.johansardar.excerlock", "paths": []}],
    }
}
if json.loads(Path(sys.argv[1]).read_text()) != expected:
    raise SystemExit("AASA must associate ExcerLock without enabling URL paths")
