#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINARY="$(mktemp -t walking-recorder-linked-recovery.XXXXXX)"
trap 'rm -f "$BINARY"' EXIT
xcrun swiftc \
  -parse-as-library \
  "$ROOT/Sources/RecorderModels.swift" \
  "$ROOT/Sources/SessionArchive.swift" \
  "$ROOT/Harnesses/LinkedRecoveryHarness.swift" \
  -o "$BINARY"
"$BINARY"
