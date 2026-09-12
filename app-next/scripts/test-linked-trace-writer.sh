#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINARY="$(mktemp -t linked-trace-writer.XXXXXX)"
trap 'rm -f "$BINARY"' EXIT
xcrun swiftc \
  -D EXCERLOCK_LINKED_RECORDER_TRACE \
  "$ROOT/modules/excerlock-enforcement/ios/ExcerlockAppGroup.swift" \
  "$ROOT/modules/excerlock-enforcement/ios/LinkedTraceWriter.swift" \
  "$ROOT/modules/excerlock-enforcement/Tests/LinkedTraceWriterHarness.swift" \
  -o "$BINARY"
"$BINARY"
