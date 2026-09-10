#!/usr/bin/env bash
# Historical Maestro runner is deliberately retired under the machine-wide ban.
# Keep this entry point fail-closed so old automation cannot operate a simulator.
set -euo pipefail
printf '%s\n' 'run-suite: UNAVAILABLE — Maestro is banned. Use headless xcrun simctl + idb with an explicitly owned simulator; historical YAML is not current Ship acceptance.' >&2
exit 2
