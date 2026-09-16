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
# The three raw inertial streams the recorder must write in every label mode,
# the suspension bases the manifest may declare, and how much ordinary delivery
# jitter is not a suspension. These mirror the recorder's RawStreamCoverage.swift.
RAW_INERTIAL_TYPES = {"accelerometer_sample", "gyroscope_sample", "device_motion_sample"}
RAW_SUSPENSION_BASES = {
    "app_lifecycle_raw_gap",
    "raw_delivery_gap",
    "session_ended_without_raw_resume",
    "no_raw_samples_observed",
    "process_termination_recovered_on_launch",
}
RAW_SAMPLE_COUNT_BASES = {"exact", "as_of_last_checkpoint", "unavailable"}
RAW_GAP_TOLERANCE_NS = 50_000_000
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


def recorder_export(path: Path) -> tuple[dict[str, list[dict[str, Any]]], dict[str, Any], dict[str, Any] | None]:
    if path.is_dir():
        matches = {name: list(path.rglob(name)) for name in (*REQUIRED_RECORDER_STREAMS, "metadata.json")}
        if any(len(items) != 1 for items in matches.values()):
            raise ValueError("recorder directory must contain exactly one metadata file and each required NDJSON stream")
        streams = {name: parse_ndjson(matches[name][0].read_text(encoding="utf-8").splitlines(), name) for name in REQUIRED_RECORDER_STREAMS}
        metadata = parse_json_object(matches["metadata.json"][0].read_text(encoding="utf-8"), "metadata.json")
        manifest_files = list(path.rglob("manifest.json"))
        if len(manifest_files) > 1:
            raise ValueError("recorder directory must not contain more than one manifest.json")
        manifest = parse_json_object(manifest_files[0].read_text(encoding="utf-8"), "manifest.json") if manifest_files else None
        return streams, metadata, manifest
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
        manifest_files = [item for item in members if Path(item.filename).name == "manifest.json"]
        if len(manifest_files) > 1:
            raise ValueError("recorder archive must not contain more than one manifest.json")
        manifest = None
        if manifest_files:
            with archive.open(manifest_files[0]) as handle:
                manifest = parse_json_object(handle.read().decode("utf-8"), "manifest.json")
        return result, metadata, manifest


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


def interval_union_length(intervals: list[tuple[int, int]]) -> int:
    items = sorted((low, high) for low, high in intervals if high > low)
    if not items:
        return 0
    total = 0
    start, end = items[0]
    for low, high in items[1:]:
        if low > end:
            total += end - start
            start, end = low, high
        else:
            end = max(end, high)
    return total + (end - start)


def recorder_raw_receipts(streams: dict[str, list[dict[str, Any]]]) -> list[int]:
    return sorted(
        event["receiptMonotonicNs"]
        for event in streams["raw-motion.ndjson"]
        if event.get("type") in RAW_INERTIAL_TYPES and valid_int(event.get("receiptMonotonicNs"))
    )


def recorder_session_bounds(streams: dict[str, list[dict[str, Any]]]) -> tuple[int | None, int | None]:
    system = streams["system.ndjson"]
    start = next(
        (event["receiptMonotonicNs"] for event in system if event.get("type") == "session_start" and valid_int(event.get("receiptMonotonicNs"))),
        None,
    )
    end = next(
        (event["receiptMonotonicNs"] for event in reversed(system) if event.get("type") == "session_end" and valid_int(event.get("receiptMonotonicNs"))),
        None,
    )
    if end is None:
        end = next(
            (event["receiptMonotonicNs"] for event in reversed(system) if event.get("type") == "interruption_recovered_on_launch" and valid_int(event.get("receiptMonotonicNs"))),
            None,
        )
    return start, end


def recorder_label_windows(streams: dict[str, list[dict[str, Any]]], session_end_ns: int | None) -> list[dict[str, Any]]:
    windows: list[dict[str, Any]] = []
    open_window: dict[str, Any] | None = None
    for event in streams["labels.ndjson"]:
        if event.get("type") != "label_transition" or not valid_int(event.get("receiptMonotonicNs")):
            continue
        at = event["receiptMonotonicNs"]
        if open_window is not None:
            windows.append({**open_window, "to": at})
        payload = event.get("payload")
        to_label = payload.get("toLabel") if isinstance(payload, dict) else None
        open_window = {"scenario": to_label, "from": at} if isinstance(to_label, str) and to_label else None
    if open_window is not None:
        end = session_end_ns if session_end_ns is not None and session_end_ns > open_window["from"] else open_window["from"]
        windows.append({**open_window, "to": end})
    return windows


def validate_recorder_manifest(
    manifest: dict[str, Any] | None,
    streams: dict[str, list[dict[str, Any]]],
    errors: list[str],
    warnings: list[str],
) -> dict[str, Any]:
    """Cross-checks the recorder manifest's raw-stream coverage evidence.

    The point is the silent-gap rule: every span with no delivered raw inertial
    sample must be declared as a suspension, and a labeled window that is not
    fully covered must say so. A legacy manifest without the block is accepted
    with a warning so archives recorded before the evidence format existed still
    join; a manifest that declares coverage the streams contradict fails closed.
    """
    if manifest is None:
        warnings.append("recorder archive has no manifest.json; raw-stream suspension evidence cannot be checked")
        return {"declared": False, "reason": "manifest.json missing"}
    raw = manifest.get("rawStream")
    if not isinstance(raw, dict):
        warnings.append("recorder manifest declares no rawStream block (legacy archive); raw coverage cannot be checked")
        return {"declared": False, "reason": "legacy manifest without rawStream"}

    report: dict[str, Any] = {"declared": True}
    if raw.get("schemaVersion") != 1:
        errors.append(f"rawStream schemaVersion {raw.get('schemaVersion')!r} is not supported")
    basis = raw.get("sampleCountBasis")
    if basis not in RAW_SAMPLE_COUNT_BASES:
        errors.append(f"rawStream sampleCountBasis {basis!r} is invalid")
    threshold_seconds = raw.get("suspensionThresholdSeconds")
    if not isinstance(threshold_seconds, (int, float)) or isinstance(threshold_seconds, bool) or threshold_seconds <= 0:
        errors.append("rawStream suspensionThresholdSeconds must be a positive number")
        threshold_seconds = 2.0
    threshold_ns = int(float(threshold_seconds) * 1_000_000_000)

    declarations: list[dict[str, int]] = []
    suspensions_raw = raw.get("suspensions")
    if not isinstance(suspensions_raw, list):
        errors.append("rawStream suspensions must be a list")
        suspensions_raw = []
    for index, item in enumerate(suspensions_raw, 1):
        if not isinstance(item, dict):
            errors.append(f"rawStream suspension {index} must be an object")
            continue
        low = item.get("fromReceiptMonotonicNs")
        high = item.get("toReceiptMonotonicNs")
        if not valid_int(low) or not valid_int(high) or high <= low:
            errors.append(f"rawStream suspension {index} has an invalid monotonic range")
            continue
        if item.get("basis") not in RAW_SUSPENSION_BASES:
            errors.append(f"rawStream suspension {index} has an invalid basis")
        if item.get("exactSuspensionTimeKnown") is not False:
            errors.append(f"rawStream suspension {index} must not claim an exact suspension time")
        if not valid_int(item.get("fromReceiptWallTimeMs")) or not valid_int(item.get("toReceiptWallTimeMs")):
            errors.append(f"rawStream suspension {index} has invalid wall-clock bounds")
        if not isinstance(item.get("fromWallTimeISO8601"), str) or not isinstance(item.get("toWallTimeISO8601"), str):
            errors.append(f"rawStream suspension {index} is missing its wall-clock range")
        declarations.append({"from": low, "to": high, "basis": item.get("basis")})
    declared_ranges = [(declaration["from"], declaration["to"]) for declaration in declarations]

    receipts = recorder_raw_receipts(streams)
    session_start, session_end = recorder_session_bounds(streams)

    declared_first = raw.get("firstSampleMonotonicNs")
    declared_last = raw.get("lastSampleMonotonicNs")
    if receipts:
        if declared_first != receipts[0]:
            errors.append("rawStream firstSampleMonotonicNs does not match the first delivered raw inertial sample")
        if declared_last != receipts[-1]:
            errors.append("rawStream lastSampleMonotonicNs does not match the last delivered raw inertial sample")
    elif declared_first is not None or declared_last is not None:
        errors.append("rawStream declares raw samples that raw-motion.ndjson does not contain")

    for index, interval in enumerate(declarations, 1):
        inside = [value for value in receipts if interval["from"] < value < interval["to"]]
        if inside:
            errors.append(f"rawStream suspension {index} overlaps {len(inside)} delivered raw sample(s)")

    def declared_gap(low: int, high: int) -> bool:
        return any(
            start - RAW_GAP_TOLERANCE_NS <= low and end + RAW_GAP_TOLERANCE_NS >= high
            for start, end in declared_ranges
        )

    for previous, current in zip(receipts, receipts[1:]):
        if current - previous > threshold_ns + RAW_GAP_TOLERANCE_NS and not declared_gap(previous, current):
            errors.append(
                f"raw stream gap of {(current - previous) / 1e9:.2f}s after {previous} is not declared as a suspension"
            )

    ended_before = raw.get("endedBeforeSessionEnd")
    if not receipts:
        if not declarations:
            errors.append("raw-motion.ndjson has no raw inertial samples and the manifest declares no suspension")
        elif session_start is not None and session_end is not None and not declared_gap(session_start, session_end):
            errors.append("a session without any raw inertial sample is not covered by a declared suspension")
    elif session_end is not None and session_end - receipts[-1] > threshold_ns + RAW_GAP_TOLERANCE_NS:
        if ended_before is not True:
            errors.append("rawStream does not declare that the raw stream stopped before the session ended")
        if not declared_gap(receipts[-1], session_end):
            errors.append("the raw-stream tail after the last sample is not covered by a declared suspension")
    elif ended_before is True:
        warnings.append("rawStream declares endedBeforeSessionEnd although the last raw sample is within the suspension threshold of the session end")

    declared_windows = raw.get("labelWindows")
    if not isinstance(declared_windows, list):
        errors.append("rawStream labelWindows must be a list")
        declared_windows = []
    actual_windows = recorder_label_windows(streams, session_end)
    if len(declared_windows) != len(actual_windows):
        errors.append(
            f"rawStream declares {len(declared_windows)} label window(s) but labels.ndjson opens {len(actual_windows)}"
        )
    report_windows: list[dict[str, Any]] = []
    uncovered_windows: list[dict[str, Any]] = []
    for index, (declared_window, actual) in enumerate(zip(declared_windows, actual_windows), 1):
        if not isinstance(declared_window, dict):
            errors.append(f"rawStream label window {index} must be an object")
            continue
        if declared_window.get("scenario") != actual["scenario"]:
            errors.append(f"rawStream label window {index} does not match the labels.ndjson scenario")
        declared_from = declared_window.get("fromReceiptMonotonicNs")
        declared_to = declared_window.get("toReceiptMonotonicNs")
        if not valid_int(declared_from) or not valid_int(declared_to) or declared_to < declared_from:
            errors.append(f"rawStream label window {index} has an invalid range")
            continue
        if declared_from != actual["from"]:
            errors.append(f"rawStream label window {index} does not start at the labels.ndjson boundary")
        if index < len(actual_windows) and declared_to != actual["to"]:
            errors.append(f"rawStream label window {index} does not end at the next labels.ndjson boundary")
        if index == len(actual_windows) and declared_to < actual["to"]:
            errors.append(f"rawStream label window {index} ends before the last labels.ndjson boundary")
        coverage = declared_window.get("coverage")
        if coverage not in ("covered", "partial", "none"):
            errors.append(f"rawStream label window {index} has an invalid coverage state")
            continue
        declared_count = declared_window.get("rawSampleCount")
        if not isinstance(declared_count, int) or isinstance(declared_count, bool) or declared_count < 0:
            errors.append(f"rawStream label window {index} has an invalid rawSampleCount")
            continue
        window_samples = [value for value in receipts if declared_from <= value < declared_to]
        actual_count = len(window_samples)
        if abs(declared_count - actual_count) > 1:
            errors.append(
                f"rawStream label window {index} declares {declared_count} raw sample(s) but the streams hold {actual_count}"
            )
        overlap = interval_union_length([
            (max(low, declared_from), min(high, declared_to)) for low, high in declared_ranges
        ])
        head = (window_samples[0] - declared_from) if window_samples else (declared_to - declared_from)
        tail = (declared_to - window_samples[-1]) if window_samples else (declared_to - declared_from)
        if coverage == "none" and actual_count != 0:
            errors.append(f"rawStream label window {index} claims no raw coverage but raw samples exist inside it")
        if coverage != "none" and actual_count == 0:
            errors.append(f"rawStream label window {index} claims raw coverage but contains no raw inertial sample")
        if coverage == "covered" and (
            overlap > threshold_ns + RAW_GAP_TOLERANCE_NS
            or head > threshold_ns + RAW_GAP_TOLERANCE_NS
            or tail > threshold_ns + RAW_GAP_TOLERANCE_NS
        ):
            errors.append(f"rawStream label window {index} claims covered coverage but has an undeclared uncovered span")
        if coverage == "partial" and window_samples and overlap <= threshold_ns and head <= threshold_ns and tail <= threshold_ns:
            errors.append(f"rawStream label window {index} claims partial coverage but every span is covered")
        summary = {
            "scenario": actual["scenario"],
            "coverage": coverage,
            "rawSampleCount": declared_count,
            "actualRawSampleCount": actual_count,
            "uncoveredSeconds": declared_window.get("uncoveredSeconds"),
        }
        report_windows.append(summary)
        if coverage != "covered":
            uncovered_windows.append(summary)

    report.update({
        "schemaVersion": raw.get("schemaVersion"),
        "sampleCountBasis": basis,
        "sampleCounts": raw.get("sampleCounts") if isinstance(raw.get("sampleCounts"), dict) else {},
        "rawInertialSampleCount": len(receipts),
        "suspensionCount": len(declarations),
        "suspendedSeconds": round(sum(end - start for start, end in declared_ranges) / 1e9, 3),
        "endedBeforeSessionEnd": ended_before is True,
        "suspensions": declarations,
        "labelWindows": report_windows,
        "uncoveredLabelWindows": uncovered_windows,
    })
    if uncovered_windows:
        warnings.append(
            f"{len(uncovered_windows)} labeled window(s) have incomplete raw coverage; the manifest declares the uncovered time"
        )
    return report


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
        streams, metadata, manifest = recorder_export(args.recorder)
        session_id, protocol = find_recorder_handshake(streams["system.ndjson"])
        validate_recorder_metadata(metadata, session_id, protocol)
        production = parse_ndjson(args.production.read_text(encoding="utf-8").splitlines(), args.production.name)
    except (OSError, ValueError) as error:
        print(f"linked-recorder join failed: {error}", file=sys.stderr)
        return 2

    raw_stream_report = validate_recorder_manifest(manifest, streams, errors, warnings)

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
        "rawStream": raw_stream_report,
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
        "It also checks the recorder manifest's rawStream block: every label window must have raw coverage or an explicitly declared suspension with its observed wall-clock range, so missing raw motion is never read as a still phone.\n"
        "A returned ManagedSettings write is not proof that iOS visibly presented a shield. No file is uploaded by this tool.\n",
        encoding="utf-8",
    )
    print(json.dumps({"valid": not errors, "output": str(output), "errors": errors, "warnings": warnings}, indent=2))
    return 0 if not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
