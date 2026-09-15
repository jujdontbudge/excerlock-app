#!/usr/bin/env python3
"""Offline validator/joiner for Walking Recorder + ExcerLock Trace Lab exports."""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import tempfile
import uuid
import zipfile
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

PROTOCOL_VERSION = 1
MAX_ARCHIVE_BYTES = 350 * 1024 * 1024
REQUIRED_RECORDER_STREAMS = ("system.ndjson", "labels.ndjson", "decisions.ndjson", "raw-motion.ndjson")
PRODUCTION_PRODUCERS = {"host_native", "host_js", "monitor_extension"}
PRODUCTION_EVENT_TYPES = {
    "trace_start", "trace_stop", "trace_truncated", "trace_drop_summary", "process", "clock_anchor",
    "app_lifecycle", "execution_opportunity", "motion_callback_native", "motion_input_js", "motion_evidence",
    "detector_persist", "policy_publish", "watchdog_operation", "extension_callback", "shield_write",
}
# ExcerLock releases the shield while a verified walk is live, then restores it
# only after standing still past the configured stop grace.
CANARY_PHASES = {"walking": "app_opened", "stationary": "shield_visible"}
CANARY_OUTCOMES = {"shield_visible", "app_opened", "uncertain"}
CAUSAL_TYPES = {
    "motionCallbackNative": "motion_callback_native",
    "motionInputJS": "motion_input_js",
    "motionEvidence": "motion_evidence",
    "detectorPersist": "detector_persist",
    "policyPublish": "policy_publish",
    "watchdogOperation": "watchdog_operation",
    "extensionCallback": "extension_callback",
    "shieldWrite": "shield_write",
}


def parse_ndjson(lines: Iterable[str], source: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line_number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        if len(line.encode("utf-8")) > 1024 * 1024:
            raise ValueError(f"{source}:{line_number}: line exceeds 1 MiB")
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"{source}:{line_number}: invalid JSON: {error.msg}") from error
        if not isinstance(value, dict):
            raise ValueError(f"{source}:{line_number}: event must be an object")
        events.append(value)
    return events


def parse_json_object(contents: str, source: str) -> dict[str, Any]:
    try:
        value = json.loads(contents)
    except json.JSONDecodeError as error:
        raise ValueError(f"{source}: invalid JSON: {error.msg}") from error
    if not isinstance(value, dict):
        raise ValueError(f"{source}: value must be an object")
    return value


def recorder_export(path: Path) -> tuple[dict[str, list[dict[str, Any]]], dict[str, Any]]:
    if path.is_dir():
        matches = {name: list(path.rglob(name)) for name in (*REQUIRED_RECORDER_STREAMS, "metadata.json")}
        if any(len(items) != 1 for items in matches.values()):
            raise ValueError("recorder directory must contain exactly one metadata file and each required NDJSON stream")
        streams = {name: parse_ndjson(matches[name][0].read_text(encoding="utf-8").splitlines(), name) for name in REQUIRED_RECORDER_STREAMS}
        metadata = parse_json_object(matches["metadata.json"][0].read_text(encoding="utf-8"), "metadata.json")
        return streams, metadata
    if not zipfile.is_zipfile(path):
        raise ValueError("recorder input must be a Walking Recorder directory or ZIP archive")
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        if sum(item.file_size for item in members) > MAX_ARCHIVE_BYTES:
            raise ValueError("recorder archive exceeds the 350 MiB offline validation limit")
        for item in members:
            parts = Path(item.filename).parts
            if item.filename.startswith("/") or ".." in parts:
                raise ValueError("recorder archive contains an unsafe path")
        result: dict[str, list[dict[str, Any]]] = {}
        for required in REQUIRED_RECORDER_STREAMS:
            found = [item for item in members if Path(item.filename).name == required]
            if len(found) != 1:
                raise ValueError(f"recorder archive must contain exactly one {required}")
            with archive.open(found[0]) as handle:
                result[required] = parse_ndjson((line.decode("utf-8") for line in handle), required)
        metadata_files = [item for item in members if Path(item.filename).name == "metadata.json"]
        if len(metadata_files) != 1:
            raise ValueError("recorder archive must contain exactly one metadata.json")
        with archive.open(metadata_files[0]) as handle:
            metadata = parse_json_object(handle.read().decode("utf-8"), "metadata.json")
        return result, metadata


def field(event: dict[str, Any], name: str) -> Any:
    return event.get(name)


def find_recorder_handshake(system: list[dict[str, Any]]) -> tuple[str, int]:
    starts = [event for event in system if event.get("type") == "session_start"]
    if len(starts) != 1:
        raise ValueError("recorder export must contain exactly one session_start")
    payload = starts[0].get("payload")
    if not isinstance(payload, dict) or payload.get("linkedTraceRequested") is not True:
        raise ValueError("recorder session was not created as a linked trace")
    session_id = payload.get("linkedSessionId")
    protocol = payload.get("linkedProtocolVersion")
    if not isinstance(session_id, str) or not session_id:
        raise ValueError("recorder session_start is missing linkedSessionId")
    try:
        parsed_session = uuid.UUID(session_id)
    except ValueError as error:
        raise ValueError("recorder linkedSessionId is not a UUID") from error
    if parsed_session.version != 4 or str(parsed_session) != session_id.lower():
        raise ValueError("recorder linkedSessionId must be a canonical UUIDv4")
    if protocol != PROTOCOL_VERSION:
        raise ValueError(f"unsupported recorder linked protocol: {protocol!r}")
    return session_id, protocol


def validate_recorder_metadata(metadata: dict[str, Any], session_id: str, protocol: int) -> None:
    linked = metadata.get("linkedTrace")
    if not isinstance(linked, dict) or linked.get("requested") is not True:
        raise ValueError("recorder metadata does not declare a linked trace")
    if linked.get("sessionId") != session_id or linked.get("protocolVersion") != protocol:
        raise ValueError("recorder metadata and session_start handshake do not match")
    if linked.get("clockDomain") != "mach_continuous_time" or linked.get("productionStartWasAssumed") is not False:
        raise ValueError("recorder metadata has an invalid linked clock or start claim")
    if linked.get("nonceExported") is not False:
        raise ValueError("recorder metadata does not confirm nonce exclusion")


def normalized_recorder(streams: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for stream, events in streams.items():
        for event in events:
            normalized.append({
                "source": "walking_recorder",
                "stream": stream,
                "eventType": event.get("type"),
                "sequence": event.get("sequence"),
                "receiptMonotonicNs": event.get("receiptMonotonicNs"),
                "receiptWallTimeMs": event.get("receiptWallTimeMs"),
                "receiptWallTimeISO8601": event.get("receiptWallTimeISO8601"),
                "payload": event.get("payload", {}),
            })
    return normalized


def normalized_production(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{
        "source": "excerlock_trace_lab",
        "producer": event.get("producer"),
        "processInstanceId": event.get("processInstanceId"),
        "eventType": event.get("eventType"),
        "operationId": event.get("operationId"),
        "sequence": event.get("sequence"),
        "receiptMonotonicNs": event.get("receiptMonotonicNs"),
        "receiptWallTimeMs": event.get("receiptWallTimeMs"),
        "receiptWallTimeISO8601": event.get("receiptWallTimeISO8601"),
        "payload": event.get("payload", {}),
    } for event in events]


def valid_int(value: Any) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def clock_offsets(events: list[dict[str, Any]]) -> list[float]:
    offsets = []
    for event in events:
        monotonic = event.get("receiptMonotonicNs")
        wall = event.get("receiptWallTimeMs")
        if valid_int(monotonic) and valid_int(wall):
            offsets.append(float(wall) - float(monotonic) / 1_000_000)
    return offsets


def sequence_issues(events: list[dict[str, Any]]) -> list[str]:
    values = [event.get("sequence") for event in events]
    if any(not valid_int(value) for value in values):
        return ["one or more sequence values are missing or invalid"]
    numbers = [int(value) for value in values]
    if len(numbers) != len(set(numbers)):
        return ["duplicate sequence values"]
    ordered = sorted(numbers)
    if ordered and ordered[0] != 1:
        return ["sequence does not begin at 1"]
    if ordered and ordered != list(range(ordered[0], ordered[-1] + 1)):
        return ["sequence gap detected"]
    return []


def clock_issues(events: list[dict[str, Any]], label: str, group_field: str | None = None) -> list[str]:
    issues: list[str] = []
    groups: dict[str, list[dict[str, Any]]] = {}
    for event in events:
        key = str(event.get(group_field)) if group_field else label
        groups.setdefault(key, []).append(event)
    for key, group in groups.items():
        if any(not valid_int(event.get("sequence")) for event in group):
            continue
        ordered = sorted(group, key=lambda event: event["sequence"])
        monotonic = [event.get("receiptMonotonicNs") for event in ordered]
        if any(valid_int(previous) and valid_int(current) and current + 2_000_000_000 < previous
               for previous, current in zip(monotonic, monotonic[1:])):
            issues.append(f"{label} process {key}: monotonic clock regressed beyond concurrency tolerance")
    offsets = clock_offsets(events)
    if offsets and max(offsets) - min(offsets) > 2_000:
        issues.append(f"{label}: wall/monotonic anchors drift by more than 2000 ms")
    return issues


def canary_issues(outcomes: list[dict[str, Any]]) -> list[str]:
    issues: list[str] = []
    for index, event in enumerate(outcomes, 1):
        payload = event.get("payload")
        if not isinstance(payload, dict):
            issues.append(f"canary outcome {index} has no object payload")
            continue
        phase = payload.get("phase")
        outcome = payload.get("outcome")
        expected = payload.get("expected")
        if phase not in CANARY_PHASES or outcome not in CANARY_OUTCOMES:
            issues.append(f"canary outcome {index} has an invalid phase or outcome")
        if expected != CANARY_PHASES.get(phase):
            issues.append(f"canary outcome {index} has an invalid expected result")
    return issues


def causal_snapshot(joined: list[dict[str, Any]], outcome: dict[str, Any]) -> dict[str, Any]:
    at = outcome["receiptMonotonicNs"]
    preceding = [event for event in joined if valid_int(event.get("receiptMonotonicNs")) and event["receiptMonotonicNs"] <= at]
    latest: dict[str, Any] = {}
    for label, event_type in CAUSAL_TYPES.items():
        matches = [event for event in preceding if event.get("source") == "excerlock_trace_lab" and event.get("eventType") == event_type]
        latest[label] = matches[-1] if matches else None
    return {
        "observation": outcome,
        "latestExcerLockEventsAtOrBeforeObservation": latest,
        "interpretationLimit": "Temporal precedence is not proof of visible causation. The canary outcome is operator-observed evidence.",
    }


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_name = tempfile.mkstemp(prefix=path.name, dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(value, handle, indent=2, sort_keys=True)
            handle.write("\n")
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--recorder", required=True, type=Path, help="Walking Recorder export ZIP or expanded directory")
    parser.add_argument("--production", required=True, type=Path, help="ExcerLock Trace Lab NDJSON export")
    parser.add_argument("--output", required=True, type=Path, help="new or empty local output directory")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    try:
        streams, metadata = recorder_export(args.recorder)
        session_id, protocol = find_recorder_handshake(streams["system.ndjson"])
        validate_recorder_metadata(metadata, session_id, protocol)
        production = parse_ndjson(args.production.read_text(encoding="utf-8").splitlines(), args.production.name)
    except (OSError, ValueError) as error:
        print(f"linked-recorder join failed: {error}", file=sys.stderr)
        return 2

    if not production:
        errors.append("production trace is empty")
    production_ids = {event.get("sessionId") for event in production}
    if production_ids != {session_id}:
        errors.append(f"session mismatch: recorder={session_id}, production={sorted(map(str, production_ids))}")
    if any(event.get("schemaVersion") != protocol for event in production):
        errors.append("production trace has an unsupported or mixed schemaVersion")
    if any(event.get("producer") not in PRODUCTION_PRODUCERS for event in production):
        errors.append("production trace has an invalid producer")
    if any(event.get("eventType") not in PRODUCTION_EVENT_TYPES for event in production):
        errors.append("production trace has an unknown event type")
    process_ids = {event.get("processInstanceId") for event in production}
    if any(not isinstance(value, str) or not value for value in process_ids):
        errors.append("production trace has a missing process instance")
    else:
        try:
            if any(str(uuid.UUID(value)) != value.lower() for value in process_ids):
                raise ValueError
        except ValueError:
            errors.append("production trace has an invalid process instance UUID")
    if any(not isinstance(event.get("payload"), dict) for event in production):
        errors.append("production trace has a non-object payload")
    production_types = Counter(str(event.get("eventType")) for event in production)
    if production_types["trace_start"] != 1:
        errors.append("production trace must contain exactly one trace_start")
    if production_types["trace_stop"] != 1:
        errors.append("production trace must contain exactly one trace_stop")
    if production_types["trace_truncated"] or production_types["trace_drop_summary"]:
        warnings.append("production trace reports truncation or buffered-event loss")
    errors.extend(f"production: {issue}" for issue in sequence_issues(production))

    recorder = normalized_recorder(streams)
    errors.extend(f"recorder: {issue}" for issue in sequence_issues(recorder))
    errors.extend(clock_issues(recorder, "recorder"))
    excerlock = normalized_production(production)
    errors.extend(clock_issues(excerlock, "production", "processInstanceId"))
    joined = recorder + excerlock
    invalid_clock = [event for event in joined if not valid_int(event.get("receiptMonotonicNs")) or not valid_int(event.get("receiptWallTimeMs"))]
    if invalid_clock:
        errors.append(f"{len(invalid_clock)} event(s) have invalid receipt clocks")
    joined.sort(key=lambda event: (event.get("receiptMonotonicNs") if valid_int(event.get("receiptMonotonicNs")) else sys.maxsize, event["source"], event.get("sequence") or 0))

    recorder_offsets = clock_offsets(recorder)
    production_offsets = clock_offsets(excerlock)
    median_difference = None
    if recorder_offsets and production_offsets:
        median_difference = abs(statistics.median(recorder_offsets) - statistics.median(production_offsets))
        if median_difference > 2_000:
            errors.append(f"clock anchors differ by {median_difference:.1f} ms; exports may be from different boots/devices")
    else:
        errors.append("both exports need wall and mach-continuous receipt clocks")

    outcomes = [event for event in joined if event.get("eventType") == "canary_outcome"]
    if not outcomes:
        warnings.append("no explicit canary outcome was recorded")
    errors.extend(canary_issues(outcomes))
    causal = [causal_snapshot(joined, event) for event in outcomes]
    count_by_source = Counter(event["source"] for event in joined)
    count_by_production_type = Counter(event.get("eventType") for event in excerlock)
    coverage = {label: count_by_production_type[event_type] for label, event_type in CAUSAL_TYPES.items()}

    output = args.output
    if output.exists() and any(output.iterdir()):
        print("linked-recorder join failed: --output must be new or empty", file=sys.stderr)
        return 2
    output.mkdir(parents=True, exist_ok=True)
    with (output / "joined.ndjson").open("w", encoding="utf-8") as handle:
        for event in joined:
            handle.write(json.dumps(event, sort_keys=True, separators=(",", ":")) + "\n")
    validation = {
        "valid": not errors,
        "protocolVersion": protocol,
        "sessionId": session_id,
        "errors": errors,
        "warnings": warnings,
        "eventCounts": dict(sorted(count_by_source.items())),
        "productionCoverage": coverage,
        "clock": {
            "domain": "mach_continuous_time",
            "recorderAnchorCount": len(recorder_offsets),
            "productionAnchorCount": len(production_offsets),
            "medianWallMinusMonotonicDifferenceMs": median_difference,
        },
        "canaryObservations": causal,
        "claims": {
            "managedSettingsReturnedMeansVisibleShield": False,
            "canaryOutcomeIsOperatorObserved": True,
            "joinProvesCausation": False,
        },
    }
    atomic_json(output / "validation.json", validation)
    (output / "README.txt").write_text(
        "Local linked-recorder join\n\n"
        "joined.ndjson is ordered by mach_continuous_time receipt timestamps.\n"
        "validation.json checks session/protocol identity, clock anchors, sequence continuity, loss markers, causal-path coverage, and explicit canary observations.\n"
        "A returned ManagedSettings write is not proof that iOS visibly presented a shield. No file is uploaded by this tool.\n",
        encoding="utf-8",
    )
    print(json.dumps({"valid": not errors, "output": str(output), "errors": errors, "warnings": warnings}, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
