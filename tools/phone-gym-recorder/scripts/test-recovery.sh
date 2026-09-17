#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINARY="$(mktemp -t gym-recorder-recovery.XXXXXX)"
trap 'rm -f "$BINARY"' EXIT
xcrun swiftc \
  -parse-as-library \
  "$ROOT/Sources/RawStreamCoverage.swift" \
  "$ROOT/Sources/RecorderModels.swift" \
  "$ROOT/Sources/GymPlaceLabel.swift" \
  "$ROOT/Sources/SessionArchive.swift" \
  "$ROOT/Harnesses/RecoveryHarness.swift" \
  -o "$BINARY"
"$BINARY"
