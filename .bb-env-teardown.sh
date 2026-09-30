#!/usr/bin/env bash
set -euo pipefail
S="$HOME/.local/share/excer/worker-simulators"
[ -d "$S" ] || exit 0
name=""
[ -f .excer/worker-sim ] && name=$(tr -d '[:space:]' < .excer/worker-sim)
[ -n "$name" ] || name="ExcerLock-$(basename "$PWD")"
[ "$name" = "ExcerLock-Next" ] && exit 0
udid=$(xcrun simctl --set "$S" list devices -j | python3 -c 'import json,sys;n=sys.argv[1];print(next((d["udid"] for r in json.load(sys.stdin)["devices"].values() for d in r if d["name"]==n),""))' "$name")
[ -n "$udid" ] || exit 0
xcrun simctl --set "$S" shutdown "$udid" 2>/dev/null || true
echo "Shut down $name; kept for the next worker"
