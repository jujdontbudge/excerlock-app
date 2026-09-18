#!/usr/bin/env python3
"""Offline verdict generator for Gym Recorder (`.gymcapture`) archives.

Reads one archive — the expanded directory the phone writes or the
`gym-capture-<id>.zip` it exports — and prints, in order: the session header, the
timeline, the per-window verdict table, the production-layer comparison, an
explicit cannot-be-judged list and the findings that are facts rather than
pass/fail. It also writes `verdict.json`, `timeline.csv` and `distance.csv`.

The rules come from `EXPECTED.json` (the same file the app ships) and from the
production reducer the harness ports; nothing about a scenario is hardcoded here.
Fail-closed, like `tools/linked-recorder/join.py`: exactly one of each required
file, safe paths, the 350 MiB cap, a continuous sequence and sane clocks. An
unjudgeable scenario is exit 0 with the list printed; only a malformed archive is
exit 2.
"""

from __future__ import annotations

import argparse
import csv
import datetime
import json
import os
import statistics
import sys
import tempfile
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterable

SCHEMA_VERSION = 1
MAX_ARCHIVE_BYTES = 350 * 1024 * 1024
MAX_LINE_BYTES = 1024 * 1024
REQUIRED_STREAMS = (
    "raw-location.ndjson",
    "raw-motion.ndjson",
    "labels.ndjson",
    "observations.ndjson",
    "decisions.ndjson",
    "system.ndjson",
)
REQUIRED_FILES = REQUIRED_STREAMS + ("gym.json", "metadata.json", "schema.json", "manifest.json", "README.txt")
# A `.gymcapture` is a directory; the exported zip carries the same members.
ARCHIVE_SUFFIX = ".gymcapture"

PLACE_LABELS = ("in_gym", "in_circle_not_gym", "on_boundary", "passing_by", "away")
# The production model has no building test, so a confirmed interval inside the
# circle but not inside the gym is not a false positive, and its absence is a
# false negative. `on_boundary` is excluded from both: S08 reports boundary
# behaviour instead of pretending either state is wrong.
FALSE_POSITIVE_LABELS = ("away", "passing_by")
FALSE_NEGATIVE_LABELS = ("in_gym", "in_circle_not_gym")
PRESENT_CARDS = ("at_gym",)
ABSENT_CARDS = ("not_at_gym",)
PRESENT_LOCKS = ("unlocked",)
ABSENT_LOCKS = ("locked",)
PRESENT_CANARY = ("app_opened",)
ABSENT_CANARY = ("shield_visible",)
SESSION_END_TYPES = ("session_end", "interruption_recovered_on_launch")
DEMOTING_REASONS = (
    "no_location_coverage",
    "no_excerlock_declaration",
    "region_monitoring_failed",
    "reduced_accuracy",
    "descriptive_only",
)

_DEFAULT_THRESHOLDS: dict[str, Any] = {
    "confidenceToleranceSeconds": 15.0,
    "confirmMs": 10_000,
    "confirmToleranceMs": 1_500,
    "slowDetectionSeconds": 180.0,
    "slowReleaseSeconds": 600.0,
    "falseNegativeMinimumInGymSeconds": 300.0,
    "exitNeverDeliveredMinutes": 15.0,
    "minimumOscillationBoundaries": 4,
    "coveragePartialFloorRatio": 0.8,
    "foregroundReturnAttributionSeconds": 5.0,
    "radiusMinMeters": 50.0,
    "radiusMaxMeters": 200.0,
    "radiusStepMeters": 10.0,
    "radiusDefaultMeters": 100.0,
    "maxGyms": 5,
}


class ArchiveError(ValueError):
    """A malformed archive. The only condition that exits non-zero."""


# --------------------------------------------------------------------------
# Parsing


def _iso8601(wall_ms: int | float) -> str:
    return datetime.datetime.fromtimestamp(float(wall_ms) / 1000, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ndjson(lines: Iterable[str], source: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line_number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        if len(line.encode("utf-8")) > MAX_LINE_BYTES:
            raise ArchiveError(f"{source}:{line_number}: line exceeds 1 MiB")
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ArchiveError(f"{source}:{line_number}: invalid JSON: {error.msg}") from error
        if not isinstance(value, dict):
            raise ArchiveError(f"{source}:{line_number}: event must be an object")
        events.append(value)
    return events


def parse_json_object(contents: str, source: str) -> dict[str, Any]:
    try:
        value = json.loads(contents)
    except json.JSONDecodeError as error:
        raise ArchiveError(f"{source}: invalid JSON: {error.msg}") from error
    if not isinstance(value, dict):
        raise ArchiveError(f"{source}: value must be an object")
    return value


@dataclass
class GymArchive:
    path: Path
    streams: dict[str, list[dict[str, Any]]]
    gym: dict[str, Any]
    metadata: dict[str, Any]
    manifest: dict[str, Any] | None
    schema: dict[str, Any]
    readme: str = ""

    @property
    def session_id(self) -> str:
        return str(self.manifest.get("id") if self.manifest else "") or self.path.stem


def _check_safe_members(members: list[str]) -> None:
    for name in members:
        parts = Path(name).parts
        if name.startswith("/") or ".." in parts:
            raise ArchiveError("archive contains an unsafe path")


def load_archive(path: Path) -> GymArchive:
    path = Path(path)
    if path.is_dir():
        matches: dict[str, list[Path]] = {name: list(path.rglob(name)) for name in REQUIRED_FILES}
        for name, found in matches.items():
            if len(found) != 1:
                raise ArchiveError(f"archive directory must contain exactly one {name} (found {len(found)})")
        streams = {
            name: parse_ndjson(matches[name][0].read_text(encoding="utf-8").splitlines(), name)
            for name in REQUIRED_STREAMS
        }
        gym = parse_json_object(matches["gym.json"][0].read_text(encoding="utf-8"), "gym.json")
        metadata = parse_json_object(matches["metadata.json"][0].read_text(encoding="utf-8"), "metadata.json")
        schema = parse_json_object(matches["schema.json"][0].read_text(encoding="utf-8"), "schema.json")
        manifest = parse_json_object(matches["manifest.json"][0].read_text(encoding="utf-8"), "manifest.json")
        readme = matches["README.txt"][0].read_text(encoding="utf-8")
    elif zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as archive:
            members = archive.infolist()
            _check_safe_members([item.filename for item in members])
            if sum(item.file_size for item in members) > MAX_ARCHIVE_BYTES:
                raise ArchiveError("archive exceeds the 350 MiB offline validation limit")
            streams = {}
            for name in REQUIRED_FILES:
                found = [item for item in members if Path(item.filename).name == name]
                if len(found) != 1:
                    raise ArchiveError(f"archive must contain exactly one {name}")
                with archive.open(found[0]) as handle:
                    contents = handle.read().decode("utf-8")
                if name in REQUIRED_STREAMS:
                    streams[name] = parse_ndjson(contents.splitlines(), name)
            def member(name: str) -> str:
                item = [entry for entry in members if Path(entry.filename).name == name][0]
                with archive.open(item) as handle:
                    return handle.read().decode("utf-8")

            gym = parse_json_object(member("gym.json"), "gym.json")
            metadata = parse_json_object(member("metadata.json"), "metadata.json")
            schema = parse_json_object(member("schema.json"), "schema.json")
            manifest = parse_json_object(member("manifest.json"), "manifest.json")
            readme = member("README.txt")
    else:
        raise ArchiveError("capture must be a .gymcapture directory or a gym-capture .zip archive")

    validate_streams(streams)
    return GymArchive(path=path, streams=streams, gym=gym, metadata=metadata, manifest=manifest, schema=schema, readme=readme)


def validate_streams(streams: dict[str, list[dict[str, Any]]]) -> None:
    """One shared sequence in every channel, no duplicate, no gap, and clocks
    whose wall and monotonic readings stay anchored to each other."""
    events: list[dict[str, Any]] = []
    for name, values in streams.items():
        for index, event in enumerate(values, 1):
            sequence = event.get("sequence")
            if not isinstance(sequence, int) or isinstance(sequence, bool) or sequence < 1:
                raise ArchiveError(f"{name}:{index}: missing or invalid sequence")
            monotonic = event.get("receiptMonotonicNs")
            wall = event.get("receiptWallTimeMs")
            if not isinstance(monotonic, int) or isinstance(monotonic, bool) or monotonic < 0:
                raise ArchiveError(f"{name}:{index}: missing or invalid receiptMonotonicNs")
            if not isinstance(wall, int) or isinstance(wall, bool) or wall <= 0:
                raise ArchiveError(f"{name}:{index}: missing or invalid receiptWallTimeMs")
            events.append(event)
    numbers = sorted(event["sequence"] for event in events)
    if numbers and numbers != list(range(1, numbers[-1] + 1)):
        raise ArchiveError("sequence is not continuous from 1 across the archive")
    offsets = [event["receiptWallTimeMs"] - event["receiptMonotonicNs"] / 1_000_000 for event in events]
    if offsets and (max(offsets) - min(offsets)) > 2_000:
        raise ArchiveError("wall and monotonic clocks drift by more than 2000 ms; the archive is not self-consistent")
    ordered = sorted(events, key=lambda event: event["sequence"])
    last_monotonic = None
    for event in ordered:
        monotonic = event["receiptMonotonicNs"]
        if last_monotonic is not None and monotonic + 2_000_000_000 < last_monotonic:
            raise ArchiveError("receipt monotonic clock regresses beyond concurrency tolerance")
        last_monotonic = monotonic


def load_expected(path: Path | None = None) -> dict[str, Any]:
    table = Path(path) if path else Path(__file__).resolve().parent / "EXPECTED.json"
    return parse_json_object(table.read_text(encoding="utf-8"), str(table))


# --------------------------------------------------------------------------
# Small interval helpers (milliseconds)


def _length(intervals: list[tuple[float, float]]) -> float:
    total = 0.0
    for low, high in intervals:
        if high > low:
            total += high - low
    return total


def _intersect(base: list[tuple[float, float]], other: list[tuple[float, float]]) -> list[tuple[float, float]]:
    result: list[tuple[float, float]] = []
    for low, high in base:
        for other_low, other_high in other:
            start = max(low, other_low)
            end = min(high, other_high)
            if end > start:
                result.append((start, end))
    return result


def _subtract(base: list[tuple[float, float]], cuts: list[tuple[float, float]]) -> list[tuple[float, float]]:
    result = list(base)
    for cut_low, cut_high in cuts:
        updated: list[tuple[float, float]] = []
        for low, high in result:
            if cut_high <= low or cut_low >= high:
                updated.append((low, high))
                continue
            if cut_low > low:
                updated.append((low, cut_low))
            if cut_high < high:
                updated.append((cut_high, high))
        result = updated
    return result


def _union(intervals: list[tuple[float, float]]) -> list[tuple[float, float]]:
    items = sorted((low, high) for low, high in intervals if high > low)
    if not items:
        return []
    merged = [items[0]]
    for low, high in items[1:]:
        last_low, last_high = merged[-1]
        if low <= last_high:
            merged[-1] = (last_low, max(last_high, high))
        else:
            merged.append((low, high))
    return merged


# --------------------------------------------------------------------------
# Reading the archive into the shapes the verdict needs


def _payload(event: dict[str, Any]) -> dict[str, Any]:
    payload = event.get("payload")
    return payload if isinstance(payload, dict) else {}


def _receipt_ms(event: dict[str, Any]) -> float:
    return float(event["receiptWallTimeMs"])


@dataclass
class Window:
    place: str
    start_ms: float
    end_ms: float
    start_basis: str
    start_offset_seconds: float
    end_basis: str
    end_offset_seconds: float
    closed_by_session_end: bool
    end_reason: str
    start_reason: str
    coverage: str = "none"
    coverage_ratio: float = 0.0
    uncovered_seconds: float = 0.0
    uncovered_spans: list[tuple[float, float]] = field(default_factory=list)
    sample_count: int = 0
    region_events: int = 0
    declared_coverage: str | None = None

    @property
    def duration_seconds(self) -> float:
        return max(0.0, (self.end_ms - self.start_ms) / 1000)


def build_windows(archive: GymArchive) -> list[Window]:
    transitions = [event for event in archive.streams["labels.ndjson"] if event.get("type") == "label_transition"]
    transitions.sort(key=lambda event: event["sequence"])
    end_ms = session_end_ms(archive)
    boundaries: list[dict[str, Any]] = []
    for event in transitions:
        payload = _payload(event)
        boundary = payload.get("boundaryWallTimeMs")
        if not isinstance(boundary, (int, float)):
            boundary = _receipt_ms(event)
        boundaries.append({
            "ms": float(boundary),
            "to": payload.get("toPlace") if isinstance(payload.get("toPlace"), str) else None,
            "basis": str(payload.get("basis") or "live"),
            "offset": float(payload.get("declaredOffsetSeconds") or 0.0),
            "reason": str(payload.get("reason") or "user_tap"),
        })
    windows: list[Window] = []
    for index, boundary in enumerate(boundaries):
        if boundary["to"] is None:
            continue
        upcoming = boundaries[index + 1] if index + 1 < len(boundaries) else None
        closed_by_session_end = upcoming is None
        to_ms = max(float(upcoming["ms"]), boundary["ms"]) if upcoming else max(end_ms, boundary["ms"])
        windows.append(Window(
            place=boundary["to"],
            start_ms=boundary["ms"],
            end_ms=to_ms,
            start_basis=boundary["basis"],
            start_offset_seconds=boundary["offset"],
            end_basis=upcoming["basis"] if upcoming else "session_end",
            end_offset_seconds=upcoming["offset"] if upcoming else 0.0,
            closed_by_session_end=closed_by_session_end or (upcoming is not None and upcoming["to"] is None),
            end_reason=upcoming["reason"] if upcoming else "session_end",
            start_reason=boundary["reason"],
        ))
    return windows


def session_end_ms(archive: GymArchive) -> float:
    system = archive.streams["system.ndjson"]
    for event in sorted(system, key=lambda item: item["sequence"], reverse=True):
        if event.get("type") in SESSION_END_TYPES:
            return _receipt_ms(event)
    latest = 0.0
    for events in archive.streams.values():
        for event in events:
            latest = max(latest, _receipt_ms(event))
    return latest


def gym_under_test(archive: GymArchive) -> str | None:
    manifest = archive.manifest or {}
    ids = manifest.get("gymIds")
    if isinstance(ids, list) and ids:
        return str(ids[0])
    gyms = archive.gym.get("gyms")
    if isinstance(gyms, list) and gyms:
        return str(gyms[0].get("id"))
    for event in archive.streams["raw-location.ndjson"]:
        if event.get("type") == "location_sample":
            per_gym = _payload(event).get("perGym")
            if isinstance(per_gym, list) and per_gym:
                return str(per_gym[0].get("gymId"))
    return None


def location_samples(archive: GymArchive, gym_id: str | None) -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    for event in archive.streams["raw-location.ndjson"]:
        if event.get("type") != "location_sample":
            continue
        payload = _payload(event)
        distance = None
        accuracy = payload.get("horizontalAccuracyM")
        per_gym = payload.get("perGym")
        if isinstance(per_gym, list):
            for entry in per_gym:
                if gym_id is None or entry.get("gymId") == gym_id:
                    distance = entry.get("distanceM")
                    break
        samples.append({
            "ms": _receipt_ms(event),
            "monotonic_ns": event["receiptMonotonicNs"],
            "iso": event.get("receiptWallTimeISO8601") or _iso8601(_receipt_ms(event)),
            "distance_m": distance if isinstance(distance, (int, float)) else None,
            "accuracy_m": accuracy if isinstance(accuracy, (int, float)) else None,
            "app_state": payload.get("appState"),
            "speed_mps": payload.get("speedMps") if isinstance(payload.get("speedMps"), (int, float)) else None,
            "latitude": payload.get("latitude"),
            "longitude": payload.get("longitude"),
        })
    samples.sort(key=lambda sample: sample["ms"])
    return samples


def region_events(archive: GymArchive, gym_id: str | None) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for event in archive.streams["raw-location.ndjson"]:
        if event.get("type") not in ("region_event", "region_state_determined", "region_monitoring_started", "region_monitoring_failed"):
            continue
        payload = _payload(event)
        if gym_id is not None and event.get("type") != "region_monitoring_failed" and payload.get("gymId") not in (None, gym_id):
            continue
        events.append({
            "type": event["type"],
            "kind": payload.get("kind"),
            "state": payload.get("state"),
            "gym_id": payload.get("gymId"),
            "ms": _receipt_ms(event),
            "monotonic_ns": event["receiptMonotonicNs"],
            "iso": event.get("receiptWallTimeISO8601") or _iso8601(_receipt_ms(event)),
            "app_state": payload.get("appState"),
            "error": payload.get("description"),
        })
    events.sort(key=lambda item: item["ms"])
    return events


def reducer_intervals(archive: GymArchive) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """The intervals the port reported, and its transitions in order."""
    intervals: dict[str, dict[str, Any]] = {}
    transitions: list[dict[str, Any]] = []
    for event in archive.streams["decisions.ndjson"]:
        if event.get("type") != "production_gym_decision":
            continue
        payload = _payload(event)
        at = _receipt_ms(event)
        transitions.append({
            "ms": at,
            "monotonic_ns": event["receiptMonotonicNs"],
            "iso": event.get("receiptWallTimeISO8601") or _iso8601(at),
            "transition": payload.get("transition"),
            "gym_id": payload.get("gymId"),
            "pending_enter_at": payload.get("pendingEnterAtWallMs"),
            "confirmed_since": payload.get("confirmedSinceWallMs"),
            "interval_id": payload.get("intervalId"),
            "latency_from_region_event_ms": payload.get("latencyFromRegionEventMs"),
            "trigger": payload.get("trigger"),
        })
        interval_id = payload.get("intervalId")
        if not isinstance(interval_id, str) or not interval_id:
            continue
        record = intervals.setdefault(interval_id, {
            "id": interval_id,
            "gym_id": payload.get("gymId"),
            "entered_at": None,
            "confirmed_at": None,
            "exited_at": None,
        })
        for key, source in (("entered_at", "intervalEnteredAt"), ("confirmed_at", "intervalConfirmedAt")):
            value = payload.get(source)
            if isinstance(value, (int, float)):
                record[key] = float(value)
        value = payload.get("intervalExitedAt")
        if isinstance(value, (int, float)):
            record["exited_at"] = float(value)
    transitions.sort(key=lambda item: item["ms"])
    ordered = [intervals[key] for key in sorted(intervals, key=lambda key: (intervals[key]["confirmed_at"] or 0, key))]
    return ordered, transitions


def confirmed_spans(intervals: list[dict[str, Any]], closed_at_ms: float, gym_id: str | None) -> list[tuple[float, float]]:
    spans = []
    for interval in intervals:
        if gym_id is not None and interval.get("gym_id") not in (None, gym_id):
            continue
        confirmed = interval.get("confirmed_at")
        if not isinstance(confirmed, (int, float)):
            continue
        exited = interval.get("exited_at")
        spans.append((float(confirmed), float(exited) if isinstance(exited, (int, float)) else closed_at_ms))
    return _union(spans)


def observations(archive: GymArchive) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for event in archive.streams["observations.ndjson"]:
        kind = event.get("type")
        if kind not in ("excerlock_state_observed", "canary_outcome", "excerlock_action"):
            continue
        payload = _payload(event)
        items.append({
            "type": kind,
            "ms": _receipt_ms(event),
            "iso": event.get("receiptWallTimeISO8601") or _iso8601(_receipt_ms(event)),
            "card": payload.get("card"),
            "lock": payload.get("lock"),
            "outcome": payload.get("outcome"),
            "action": payload.get("action"),
            "reference_confirmed_claim": payload.get("referenceConfirmed"),
        })
    items.sort(key=lambda item: item["ms"])
    return items


def setup_declaration(archive: GymArchive) -> dict[str, Any] | None:
    declaration = None
    for event in archive.streams["observations.ndjson"]:
        if event.get("type") == "excerlock_setup_declared":
            declaration = _payload(event)
    return declaration


# --------------------------------------------------------------------------
# Coverage, scored the way the phone scores it


def compute_coverage(samples: list[float], start_ms: float, end_ms: float, threshold_seconds: float) -> dict[str, Any]:
    stamps = sorted(value for value in samples if start_ms <= value <= end_ms)
    uncovered: list[tuple[float, float]] = []
    if not stamps:
        uncovered.append((start_ms, end_ms))
    else:
        if (stamps[0] - start_ms) / 1000 > threshold_seconds:
            uncovered.append((start_ms, stamps[0]))
        for previous, current in zip(stamps, stamps[1:]):
            if (current - previous) / 1000 > threshold_seconds:
                uncovered.append((previous, current))
        if (end_ms - stamps[-1]) / 1000 > threshold_seconds:
            uncovered.append((stamps[-1], end_ms))
    duration = max(0.0, (end_ms - start_ms) / 1000)
    uncovered_spans = _union(uncovered)
    uncovered_seconds = min(duration, _length(uncovered_spans) / 1000)
    if not stamps:
        coverage = "none"
    elif uncovered_seconds <= threshold_seconds:
        coverage = "covered"
    else:
        coverage = "partial"
    ratio = 1.0 if duration <= 0 else max(0.0, min(1.0, 1 - uncovered_seconds / duration))
    return {
        "sample_count": len(stamps),
        "uncovered_seconds": uncovered_seconds,
        "uncovered_spans": uncovered_spans,
        "coverage": coverage,
        "coverage_ratio": ratio,
    }


def apply_coverage(windows: list[Window], archive: GymArchive, samples: list[dict[str, Any]], thresholds: dict[str, Any]) -> list[dict[str, Any]]:
    """Fill each window with its measured coverage and cross-check the manifest."""
    threshold = float(thresholds.get("locationSuspensionThresholdSeconds", 15.0))
    manifest = archive.manifest or {}
    declared = manifest.get("labelWindows")
    declared_windows = declared if isinstance(declared, list) else []
    findings: list[dict[str, Any]] = []
    stamp_list = [sample["ms"] for sample in samples]
    for index, window in enumerate(windows):
        measured = compute_coverage(stamp_list, window.start_ms, window.end_ms, threshold)
        window.coverage = measured["coverage"]
        window.coverage_ratio = measured["coverage_ratio"]
        window.uncovered_seconds = measured["uncovered_seconds"]
        window.uncovered_spans = measured["uncovered_spans"]
        window.sample_count = measured["sample_count"]
        if index < len(declared_windows) and isinstance(declared_windows[index], dict):
            entry = declared_windows[index]
            window.declared_coverage = entry.get("coverage") if isinstance(entry.get("coverage"), str) else None
            declared_count = entry.get("locationSampleCount")
            mismatch = window.declared_coverage not in (None, window.coverage)
            if isinstance(declared_count, int) and abs(declared_count - window.sample_count) > 1:
                mismatch = True
            if mismatch:
                findings.append({
                    "kind": "coverage_mismatch",
                    "detail": (
                        f"window {index + 1} ({window.place}) declares coverage "
                        f"{window.declared_coverage}/{entry.get('locationSampleCount')} but the location stream holds "
                        f"{window.coverage}/{window.sample_count}"
                    ),
                    "windowIndex": index + 1,
                })
    return findings


# --------------------------------------------------------------------------
# The verdict


def _judged_domain(window: Window, thresholds: dict[str, Any]) -> tuple[list[tuple[float, float]], list[tuple[float, float]]]:
    """Returns (scoring domain, uncertainty spans) for one window in ms."""
    tolerance = float(thresholds.get("confidenceToleranceSeconds", 15.0))
    start_uncertainty = (window.start_offset_seconds if window.start_basis == "backdated_estimate" else tolerance) * 1000
    end_uncertainty = 0.0
    if not window.closed_by_session_end:
        end_uncertainty = (window.end_offset_seconds if window.end_basis == "backdated_estimate" else tolerance) * 1000
    uncertainty = _union([
        (window.start_ms, window.start_ms + start_uncertainty),
        (window.end_ms - end_uncertainty, window.end_ms),
    ])
    domain = _subtract([(window.start_ms, window.end_ms)], uncertainty + window.uncovered_spans)
    return domain, uncertainty


def _scenario_spec(expected: dict[str, Any], scenario_id: str | None) -> dict[str, Any] | None:
    for scenario in expected.get("scenarios") or []:
        if scenario.get("id") == scenario_id:
            return scenario
    return None


def scenario_id_of(archive: GymArchive) -> str | None:
    for event in archive.streams["labels.ndjson"]:
        if event.get("type") == "scenario_declared":
            value = _payload(event).get("scenarioId")
            if isinstance(value, str) and value and value != "free":
                return value
    manifest = archive.manifest or {}
    value = manifest.get("scenarioId")
    if isinstance(value, str) and value and value != "free":
        return value
    value = archive.metadata.get("scenarioId")
    if isinstance(value, str) and value and value != "free":
        return value
    return None


def build_verdict(archive: GymArchive, expected: dict[str, Any], trace_path: Path | None = None) -> dict[str, Any]:
    thresholds = {**_DEFAULT_THRESHOLDS, **(expected.get("thresholds") or {})}
    scenario_id = scenario_id_of(archive)
    spec = _scenario_spec(expected, scenario_id)
    mode = str(spec.get("mode")) if spec else "scored"
    required_labels = [label for label in (spec.get("requiredLabels") if spec else []) or []]
    required_acks = [ack for ack in (spec.get("requiredAcks") if spec else []) or []]
    declared_triggers = [trigger for trigger in (spec.get("cannotBeJudged") if spec else []) or []]

    gym_id = gym_under_test(archive)
    samples = location_samples(archive, gym_id)
    regions = region_events(archive, gym_id)
    intervals, transitions = reducer_intervals(archive)
    windows = build_windows(archive)
    findings: list[dict[str, Any]] = []
    findings.extend(apply_coverage(windows, archive, samples, thresholds))

    end_ms = session_end_ms(archive)
    spans = confirmed_spans(intervals, end_ms, gym_id)
    enters = [event for event in regions if event["type"] == "region_event" and event["kind"] == "enter"]
    exits = [event for event in regions if event["type"] == "region_event" and event["kind"] == "exit"]

    confirm_grace_ms = float(thresholds["confirmMs"]) + float(thresholds["confidenceToleranceSeconds"]) * 1000
    fn_floor = float(thresholds["falseNegativeMinimumInGymSeconds"])
    floor_ratio = float(thresholds["coveragePartialFloorRatio"])

    rows: list[dict[str, Any]] = []
    cannot_judge: list[dict[str, Any]] = []
    latencies: dict[str, dict[str, float | None]] = {"enter": {}, "confirm": {}, "exit": {}, "intervalEnd": {}}
    judged_windows = 0

    for index, window in enumerate(windows):
        domain, uncertainty = _judged_domain(window, thresholds)
        row_enters = [event for event in enters if window.start_ms <= event["ms"] <= window.end_ms]
        row_exits = [event for event in exits if window.start_ms <= event["ms"] <= window.end_ms]
        row_flaps = min(len(row_enters), len(row_exits))
        window.region_events = len(row_enters) + len(row_exits)

        inside = window.place in FALSE_NEGATIVE_LABELS
        confirmed_seconds = _length(_intersect([(window.start_ms, window.end_ms)], spans)) / 1000
        fp_seconds = 0.0
        fn_seconds = 0.0
        if window.place in FALSE_POSITIVE_LABELS:
            fp_seconds = _length(_intersect(domain, spans)) / 1000
        if inside:
            grace = [(window.start_ms, window.start_ms + confirm_grace_ms)]
            fn_domain = _subtract(domain, grace)
            fn_seconds = (_length(fn_domain) - _length(_intersect(fn_domain, spans))) / 1000

        detection = None
        if inside and row_enters:
            detection = row_enters[0]["ms"] - window.start_ms
        confirm_latency = None
        confirmations = [t for t in transitions if t["transition"] == "confirm_due" and window.start_ms <= t["ms"] <= window.end_ms]
        if inside and confirmations:
            confirm_latency = confirmations[0]["ms"] - window.start_ms
        release = None
        release_note = "unmeasured"
        if window.closed_by_session_end:
            release_note = "unmeasured"
        elif inside:
            later_exits = [event for event in exits if event["ms"] >= window.end_ms]
            if later_exits:
                release = later_exits[0]["ms"] - window.end_ms
                release_note = "measured"
            else:
                release_note = "exit never delivered"
        # One summary number per scenario; the per-window detail is in the rows.
        if detection is not None:
            latencies["enter"].setdefault(scenario_id or "free", detection)
        if confirm_latency is not None:
            latencies["confirm"].setdefault(scenario_id or "free", confirm_latency)
        if release is not None:
            latencies["exit"].setdefault(scenario_id or "free", release)
        if release is not None:
            latencies["intervalEnd"].setdefault(scenario_id or "free", release)

        row_verdict = "PASS"
        flags: list[str] = []
        if mode == "descriptive":
            row_verdict = "DESCRIPTIVE"
        elif mode == "finding":
            row_verdict = "FINDING"
        else:
            if fp_seconds > 0:
                row_verdict = "FAIL"
            # The design's false negative is a window of at least five minutes
            # with no confirmed interval at all; a few seconds of confirmation
            # lateness past the 45 s allowance is reported as FN seconds, not as
            # a failure of a fifteen-minute stay.
            if window.duration_seconds >= fn_floor and confirmed_seconds == 0:
                row_verdict = "FAIL"
            if detection is not None and detection / 1000 > float(thresholds["slowDetectionSeconds"]):
                flags.append("slow_detection")
            if release is not None and release / 1000 > float(thresholds["slowReleaseSeconds"]):
                flags.append("slow_release")
        if window.coverage == "partial" and window.coverage_ratio >= floor_ratio:
            flags.append(f"coverage:{window.coverage_ratio:.2f}")
        if window.start_basis == "backdated_estimate" or window.end_basis == "backdated_estimate":
            flags.append("approximate")

        if window.coverage == "none":
            cannot_judge.append({"scope": f"{scenario_id or 'free'}:{window.place}", "windowIndex": index + 1, "reason": "no_location_coverage"})
        elif window.coverage_ratio < floor_ratio:
            cannot_judge.append({
                "scope": f"{scenario_id or 'free'}:{window.place}",
                "windowIndex": index + 1,
                "reason": f"partial_coverage:{window.coverage_ratio:.2f}",
            })
        else:
            judged_windows += 1
        if window.closed_by_session_end:
            cannot_judge.append({
                "scope": f"{scenario_id or 'free'}:{window.place}",
                "windowIndex": index + 1,
                "reason": "session_ended_open_window",
            })
        if fp_seconds > 0:
            findings.append({
                "kind": "confirmed_while_absent",
                "detail": f"{fp_seconds:.0f} s of confirmed presence while labeled {window.place}",
                "windowIndex": index + 1,
            })
        waited_after_leave = (session_end_ms(archive) - window.end_ms) / 1000
        if release_note == "exit never delivered" and waited_after_leave >= float(thresholds["exitNeverDeliveredMinutes"]) * 60:
            findings.append({
                "kind": "exit_never_delivered",
                "detail": f"no exit event within {float(thresholds['exitNeverDeliveredMinutes']):.0f} min of leaving the {window.place} label",
                "windowIndex": index + 1,
            })

        rows.append({
            "windowIndex": index + 1,
            "label": window.place,
            "fromMs": window.start_ms,
            "toMs": window.end_ms,
            "fromISO8601": _iso8601(window.start_ms),
            "toISO8601": _iso8601(window.end_ms),
            "durationSeconds": window.duration_seconds,
            "basis": window.start_basis if window.start_basis == "backdated_estimate" else "live",
            "declaredOffsetSeconds": window.start_offset_seconds or None,
            "coverage": window.coverage,
            "coverageRatio": window.coverage_ratio,
            "sampleCount": window.sample_count,
            "regionEnters": len(row_enters),
            "regionExits": len(row_exits),
            "flaps": row_flaps,
            "fpSeconds": fp_seconds,
            "fnSeconds": fn_seconds,
            "uncertainSeconds": _length(uncertainty) / 1000,
            "detectionLatencyMs": detection,
            "confirmLatencyMs": confirm_latency,
            "releaseLatencyMs": release,
            "releaseNote": release_note,
            "closedBySessionEnd": window.closed_by_session_end,
            "reducerConfirmedSeconds": confirmed_seconds,
            "verdict": row_verdict,
            "refState": _reference_state(window, spans, intervals),
            "flags": flags,
        })

    # required labels in order
    seen_places = [window.place for window in windows]
    cursor = 0
    missing_label = None
    for required in required_labels:
        while cursor < len(seen_places) and seen_places[cursor] != required:
            cursor += 1
        if cursor >= len(seen_places):
            missing_label = required
            break
        cursor += 1
    if missing_label is not None:
        cannot_judge.append({"scope": scenario_id or "free", "reason": f"missing_label:{missing_label}"})

    seen_acks = {
        _payload(event).get("ack")
        for event in archive.streams["labels.ndjson"]
        if event.get("type") == "script_step_acknowledged"
    }
    for ack in required_acks:
        if ack not in seen_acks:
            cannot_judge.append({"scope": scenario_id or "free", "reason": f"missing_ack:{ack}"})

    if spec and spec.get("requireExcerLockDeclaration") and setup_declaration(archive) is None:
        cannot_judge.append({"scope": scenario_id or "free", "reason": "no_excerlock_declaration"})

    monitoring_failed = any(event["type"] == "region_monitoring_failed" for event in regions)
    if monitoring_failed:
        cannot_judge.append({"scope": scenario_id or "free", "reason": "region_monitoring_failed"})
    reduced_accuracy = any(
        (event.get("type") == "authorization_changed" and _payload(event).get("accuracyAuthorization") == "reducedAccuracy")
        for event in archive.streams["raw-location.ndjson"]
    ) or str(archive.metadata.get("accuracyAtStart")) == "reducedAccuracy"
    if reduced_accuracy:
        cannot_judge.append({"scope": scenario_id or "free", "reason": "reduced_accuracy"})
    if all(window.start_basis == "backdated_estimate" for window in windows) and windows:
        cannot_judge.append({"scope": scenario_id or "free", "reason": "backdated_only"})
    if "note missing" in declared_triggers and not any(event.get("type") == "label_note" for event in archive.streams["labels.ndjson"]):
        cannot_judge.append({"scope": scenario_id or "free", "reason": "note missing"})
    if mode == "descriptive":
        cannot_judge.append({"scope": scenario_id or "free", "reason": "descriptive_only"})
    if not any(item["type"] == "excerlock_state_observed" for item in observations(archive)):
        cannot_judge.append({"scope": scenario_id or "free", "reason": "no_observation_in_window"})

    fp_seconds = sum(row["fpSeconds"] for row in rows)
    fn_seconds = sum(row["fnSeconds"] for row in rows)
    findings.extend(_latency_findings(rows, thresholds))
    findings.extend(_confirmation_before_label_findings(rows, transitions, spans))
    findings.extend(_low_power_findings(archive))
    findings.extend(_spurious_exit_findings(archive, rows, samples))

    demoted = any(
        str(item["reason"]).startswith(("missing_label:", "partial_coverage:")) or item["reason"] in DEMOTING_REASONS
        for item in cannot_judge
    )
    if mode == "descriptive":
        verdict = "DESCRIPTIVE"
    elif mode == "setup":
        verdict = "PASS" if (not monitoring_failed and any(event["type"] == "region_monitoring_started" for event in regions)) else "FAIL"
    elif mode == "finding":
        verdict = "FINDING"
    elif demoted or judged_windows == 0:
        verdict = "CANNOT_BE_JUDGED"
    elif any(row["verdict"] == "FAIL" for row in rows):
        verdict = "FAIL"
    else:
        verdict = "PASS"

    production_rows = production_layer(archive, spans)
    findings.extend(_reference_claim_findings(production_rows))

    coverage = _coverage_summary(archive)
    document = {
        "valid": True,
        "capture": str(archive.path),
        "schemaVersion": SCHEMA_VERSION,
        "sessionId": archive.session_id,
        "scenario": scenario_id,
        "scenarioTitle": (spec or {}).get("title"),
        "mode": mode,
        "scriptVersion": (expected.get("scriptVersion")),
        "expectedOutcomeVersion": (expected.get("expectedOutcomeVersion")),
        "gymId": gym_id,
        "gyms": archive.gym.get("gyms"),
        "device": {
            "model": archive.metadata.get("deviceModel"),
            "system": archive.metadata.get("systemVersion"),
            "sourceCommit": archive.metadata.get("sourceCommit"),
            "permissionAtStart": archive.metadata.get("permissionAtStart"),
            "accuracyAtStart": archive.metadata.get("accuracyAtStart"),
        },
        "excerlockSetup": setup_declaration(archive),
        "thresholds": thresholds,
        "coverage": coverage,
        "verdicts": rows,
        "productionLayer": production_rows,
        "cannotJudge": cannot_judge,
        "findings": findings,
        "latenciesMs": latencies,
        "fpSeconds": fp_seconds,
        "fnSeconds": fn_seconds,
        "verdict": verdict,
        "counts": {
            "windows": len(rows),
            "regionEnters": len(enters),
            "regionExits": len(exits),
            "intervals": len(intervals),
            "samples": len(samples),
            "observations": len(archive.streams["observations.ndjson"]),
        },
        "productionTrace": compare_trace(archive, trace_path),
    }
    return document


def _reference_state(window: Window, spans: list[tuple[float, float]], intervals: list[dict[str, Any]]) -> str:
    inside = _length(_intersect([(window.start_ms, window.end_ms)], spans)) > 0
    if inside:
        # The confirmation that actually covers this window, not the first one
        # of the session.
        covering = [
            interval for interval in intervals
            if isinstance(interval.get("confirmed_at"), (int, float))
            and (interval.get("exited_at") or session_span_end(interval, window)) >= window.start_ms
        ]
        stamp = covering[0]["confirmed_at"] if covering else window.start_ms
        return f"confirmed @{_iso8601(stamp)}"
    return "outside/no interval"


def session_span_end(interval: dict[str, Any], window: Window) -> float:
    return max(float(window.end_ms), float(window.start_ms))


def _latency_findings(rows: list[dict[str, Any]], thresholds: dict[str, Any]) -> list[dict[str, Any]]:
    findings = []
    slow_detection = float(thresholds["slowDetectionSeconds"]) * 1000
    slow_release = float(thresholds["slowReleaseSeconds"]) * 1000
    for row in rows:
        if row["detectionLatencyMs"] is not None and row["detectionLatencyMs"] > slow_detection:
            findings.append({
                "kind": "slow_detection",
                "detail": f"{row['label']} window: the enter event arrived {row['detectionLatencyMs'] / 1000:.0f} s after the label",
                "windowIndex": row["windowIndex"],
            })
        if row["releaseLatencyMs"] is not None and row["releaseLatencyMs"] > slow_release:
            findings.append({
                "kind": "slow_release",
                "detail": f"{row['label']} window: the exit event arrived {row['releaseLatencyMs'] / 1000:.0f} s after the label",
                "windowIndex": row["windowIndex"],
            })
    return findings


def _confirmation_before_label_findings(rows: list[dict[str, Any]], transitions: list[dict[str, Any]], spans: list[tuple[float, float]]) -> list[dict[str, Any]]:
    findings = []
    for row in rows:
        if row["label"] != "in_gym" or not spans:
            continue
        confirmed_before = 0.0
        for start, _ in spans:
            if start < row["fromMs"]:
                confirmed_before = max(confirmed_before, (row["fromMs"] - start) / 1000)
        if confirmed_before >= 30:
            findings.append({
                "kind": "confirmed_before_in_gym",
                "detail": (
                    f"the reducer confirmed presence {confirmed_before:.0f} s before the in_gym label "
                    f"(window {row['windowIndex']}); the production model has no building test"
                ),
                "secondsBefore": confirmed_before,
                "windowIndex": row["windowIndex"],
            })
    return findings


def _low_power_findings(archive: GymArchive) -> list[dict[str, Any]]:
    enabled = [
        _payload(event).get("enabled")
        for event in archive.streams["system.ndjson"]
        if event.get("type") == "low_power_mode_changed"
    ]
    if any(value is True for value in enabled):
        return [{"kind": "low_power_mode", "detail": "Low Power Mode was on during this session; latencies cost the OS's power policy"}]
    return []


def _spurious_exit_findings(archive: GymArchive, rows: list[dict[str, Any]], samples: list[dict[str, Any]]) -> list[dict[str, Any]]:
    findings = []
    inside_windows = [(row["fromMs"], row["toMs"]) for row in rows if row["label"] in FALSE_NEGATIVE_LABELS]
    for event in region_events(archive, gym_under_test(archive)):
        if event["type"] != "region_event" or event["kind"] != "exit":
            continue
        if not any(low <= event["ms"] <= high for low, high in inside_windows):
            continue
        nearest = min(samples, key=lambda sample: abs(sample["ms"] - event["ms"])) if samples else None
        findings.append({
            "kind": "spurious_exit",
            "detail": (
                f"an exit event arrived {event['iso']} while the label was inside the gym"
                + (f" (nearest fix accuracy {nearest['accuracy_m']} m)" if nearest and isinstance(nearest["accuracy_m"], (int, float)) else "")
            ),
            "accuracyM": nearest["accuracy_m"] if nearest else None,
        })
    return findings


def production_layer(archive: GymArchive, spans: list[tuple[float, float]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for item in observations(archive):
        if item["type"] == "excerlock_action":
            continue
        present = item["card"] in PRESENT_CARDS or item["lock"] in PRESENT_LOCKS or item["outcome"] in PRESENT_CANARY
        absent = item["card"] in ABSENT_CARDS or item["lock"] in ABSENT_LOCKS or item["outcome"] in ABSENT_CANARY
        reference = any(low <= item["ms"] <= high for low, high in spans)
        confirmed_for = 0.0
        if reference:
            confirmed_for = max((item["ms"] - low) / 1000 for low, high in spans if low <= item["ms"] <= high)
        if reference and present:
            comparison = "agree"
        elif reference and absent:
            comparison = "production_lags" if confirmed_for >= 60 else "agree"
        elif not reference and present:
            comparison = "production_leads"
        elif not reference and absent:
            comparison = "agree"
        else:
            comparison = "unknown"
        rows.append({
            "atISO8601": item["iso"],
            "atMs": item["ms"],
            "kind": item["type"],
            "card": item["card"],
            "lock": item["lock"],
            "outcome": item["outcome"],
            "referenceConfirmed": reference,
            "confirmedForSeconds": confirmed_for,
            "comparison": comparison,
        })
    return rows


def _reference_claim_findings(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return []


def _coverage_summary(archive: GymArchive) -> dict[str, Any]:
    streams = {
        "location": "raw-location.ndjson",
        "activity": "raw-motion.ndjson",
        "pedometer": "raw-motion.ndjson",
    }
    counts: dict[str, int] = {}
    for event in archive.streams["raw-location.ndjson"]:
        if event.get("type") == "location_sample":
            counts["location"] = counts.get("location", 0) + 1
    for event in archive.streams["raw-motion.ndjson"]:
        if event.get("type") == "activity_sample":
            counts["activity"] = counts.get("activity", 0) + 1
        if event.get("type") == "pedometer_sample":
            counts["pedometer"] = counts.get("pedometer", 0) + 1
    manifest = archive.manifest or {}
    manifest_streams = manifest.get("streams") if isinstance(manifest.get("streams"), dict) else {}
    return {
        "samples": counts,
        "streamFiles": streams,
        "suspensions": manifest_streams.get("suspensions") or [],
        "suspensionCount": manifest_streams.get("suspensionCount"),
        "suspendedSeconds": manifest_streams.get("suspendedSeconds"),
        "sampleCountBasis": manifest_streams.get("sampleCountBasis"),
    }


# --------------------------------------------------------------------------
# Trace Lab (optional, absent today)


def compare_trace(archive: GymArchive, trace_path: Path | None) -> dict[str, Any]:
    if trace_path is None:
        return {"status": "no_trace", "reason": "no Trace Lab export was supplied"}
    try:
        events = parse_ndjson(Path(trace_path).read_text(encoding="utf-8").splitlines(), Path(trace_path).name)
    except (OSError, ArchiveError) as error:
        return {"status": "no_trace", "reason": f"{error}"}
    gym_events = [
        event for event in events
        if event.get("eventType") in ("geofence_event", "detector_persist")
        and isinstance(event.get("payload"), dict)
        and any(key in event["payload"] for key in ("regionId", "gymId", "pendingEnterAt", "confirmedSince"))
    ]
    if not gym_events:
        return {"status": "no_trace", "reason": "the supplied trace has no gym events yet"}
    offsets = [
        float(event["receiptWallTimeMs"]) - float(event["receiptMonotonicNs"]) / 1_000_000
        for event in events
        if isinstance(event.get("receiptWallTimeMs"), (int, float)) and isinstance(event.get("receiptMonotonicNs"), (int, float))
    ]
    archive_offsets = [
        float(event["receiptWallTimeMs"]) - float(event["receiptMonotonicNs"]) / 1_000_000
        for event in archive.streams["system.ndjson"]
    ]
    offset_delta = None
    if offsets and archive_offsets:
        offset_delta = abs(statistics.median(offsets) - statistics.median(archive_offsets))
    entries = []
    for event in gym_events:
        payload = event["payload"]
        entries.append({
            "eventType": event.get("eventType"),
            "regionId": payload.get("regionId") or payload.get("gymId"),
            "type": payload.get("type"),
            "confirmedSince": payload.get("confirmedSince"),
            "confirmSettledBy": payload.get("confirmSettledBy"),
        })
    return {"status": "compared", "clockOffsetDeltaMs": offset_delta, "events": entries}


# --------------------------------------------------------------------------
# Rendering and outputs


def _timeline(archive: GymArchive) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for event in archive.streams["labels.ndjson"]:
        if event.get("type") == "label_transition":
            payload = _payload(event)
            entries.append({
                "ms": _receipt_ms(event),
                "monotonic_ns": event["receiptMonotonicNs"],
                "stream": "labels",
                "type": "label",
                "detail": f"{payload.get('fromPlace') or '-'} → {payload.get('toPlace') or 'closed'} ({payload.get('reason')})",
            })
    for event in archive.streams["raw-location.ndjson"]:
        if event.get("type") == "region_event":
            payload = _payload(event)
            entries.append({
                "ms": _receipt_ms(event),
                "monotonic_ns": event["receiptMonotonicNs"],
                "stream": "location",
                "type": "region",
                "detail": f"{payload.get('kind')} {payload.get('gymId')} (app {payload.get('appState')})",
            })
    for event in archive.streams["decisions.ndjson"]:
        if event.get("type") == "production_gym_decision":
            payload = _payload(event)
            entries.append({
                "ms": _receipt_ms(event),
                "monotonic_ns": event["receiptMonotonicNs"],
                "stream": "decisions",
                "type": "reducer",
                "detail": str(payload.get("transition")),
            })
    for item in observations(archive):
        if item["type"] == "excerlock_action":
            detail = f"action {item['action']}"
        else:
            detail = f"card {item['card'] or '-'} lock {item['lock'] or '-'}" + (f" canary {item['outcome']}" if item["outcome"] else "")
        entries.append({
            "ms": item["ms"],
            "monotonic_ns": None,
            "stream": "observations",
            "type": "observation",
            "detail": detail,
        })
    for event in archive.streams["system.ndjson"]:
        payload = _payload(event)
        if event.get("type") in ("app_lifecycle", "recording_gap", "location_stream_suspended", "low_power_mode_changed", "interruption_recovered_on_launch", "session_start", "session_end"):
            detail = payload.get("state") or payload.get("durationSeconds") or payload.get("enabled") or ""
            entries.append({
                "ms": _receipt_ms(event),
                "monotonic_ns": event["receiptMonotonicNs"],
                "stream": "system",
                "type": str(event.get("type")),
                "detail": str(detail),
            })
    entries.sort(key=lambda item: (item["ms"], item["stream"]))
    return entries


def render_stdout(verdict: dict[str, Any]) -> str:
    lines: list[str] = []
    device = verdict["device"]
    lines.append(f"Gym Recorder verdict — session {verdict['sessionId']}")
    lines.append(
        f"scenario {verdict['scenario'] or 'free'} ({verdict.get('scenarioTitle') or 'no script'}) · mode {verdict['mode']} · "
        f"script v{verdict.get('scriptVersion')} expected v{verdict.get('expectedOutcomeVersion')}"
    )
    lines.append(
        f"device {device.get('model')} {device.get('system')} · build {device.get('sourceCommit')} · "
        f"permission {device.get('permissionAtStart')}/{device.get('accuracyAtStart')}"
    )
    gyms = verdict.get("gyms") or []
    for gym in gyms:
        lines.append(f"gym {gym.get('id')} r={gym.get('radiusMeters')} m set by {gym.get('setBy')}")
    setup = verdict.get("excerlockSetup")
    if setup:
        lines.append(
            "ExcerLock declared: same gym "
            f"{setup.get('sameGymSaved')} · auto-detect {setup.get('autoDetectOn')} · permission {setup.get('locationPermission')} · "
            f"precise {setup.get('preciseLocation')} · build {setup.get('buildKind')}"
        )
    else:
        lines.append("ExcerLock declared: no declaration recorded")
    coverage = verdict["coverage"]
    samples = coverage.get("samples", {})
    lines.append(
        "coverage: "
        + " · ".join(f"{name} {count}" for name, count in sorted(samples.items()))
        + f" · suspensions {coverage.get('suspensionCount')} ({coverage.get('suspendedSeconds')} s)"
    )
    lines.append("")
    lines.append("Timeline")
    for entry in verdict.get("timeline", []):
        lines.append(f"  {_iso8601(entry['ms'])}  {entry['stream']:<12} {entry['type']:<12} {entry['detail']}")
    lines.append("")
    lines.append(
        f"{'scenario':<9} {'window':<26} {'label':<18} {'ref-state':<26} {'FP s':>6} {'FN s':>6} {'uncertain s':>11} "
        f"{'flaps':>5}  verdict"
    )
    for row in verdict["verdicts"]:
        window = f"{row['fromISO8601'][11:19]}→{row['toISO8601'][11:19]}"
        detection = "-" if row["detectionLatencyMs"] is None else f"enter +{row['detectionLatencyMs'] / 1000:.0f} s"
        if row["confirmLatencyMs"] is not None:
            detection += f", confirm +{row['confirmLatencyMs'] / 1000:.0f} s"
        release = row["releaseNote"] if row["releaseLatencyMs"] is None else f"exit +{row['releaseLatencyMs'] / 1000:.0f} s"
        flags = f" [{', '.join(row['flags'])}]" if row["flags"] else ""
        lines.append(
            f"{verdict['scenario'] or 'free':<9} {window:<26} {row['label']:<18} {row['refState']:<26} "
            f"{row['fpSeconds']:>6.0f} {row['fnSeconds']:>6.0f} {row['uncertainSeconds']:>11.0f} {row['flaps']:>5}  "
            f"{row['verdict']}{flags} · detect {detection} · release {release}"
        )
    lines.append(f"scenario verdict: {verdict['verdict']}  (FP {verdict['fpSeconds']:.0f} s, FN {verdict['fnSeconds']:.0f} s)")
    lines.append("")
    lines.append("Production layer (observation against the reference at that instant)")
    if verdict["productionLayer"]:
        for row in verdict["productionLayer"]:
            lines.append(
                f"  {row['atISO8601']}  card {str(row['card'] or row['outcome'] or '-'):<14} reference "
                f"{'confirmed' if row['referenceConfirmed'] else 'not confirmed':<14} → {row['comparison']}"
            )
    else:
        lines.append("  no observations were recorded")
    lines.append("")
    lines.append("Cannot be judged")
    if verdict["cannotJudge"]:
        for item in verdict["cannotJudge"]:
            scope = item.get("scope", "")
            window = f" (window {item['windowIndex']})" if item.get("windowIndex") else ""
            lines.append(f"  {scope}{window}: {item['reason']}")
    else:
        lines.append("  nothing: every required label and window could be judged")
    lines.append("")
    lines.append("Findings (facts, not pass/fail)")
    if verdict["findings"]:
        for finding in verdict["findings"]:
            lines.append(f"  {finding['kind']}: {finding['detail']}")
    else:
        lines.append("  none")
    lines.append("")
    trace = verdict["productionTrace"]
    lines.append(
        "Trace Lab comparison: " + (str(trace.get("status")) if trace.get("status") == "no_trace" else f"compared ({len(trace.get('events') or [])} gym event(s), clock delta {trace.get('clockOffsetDeltaMs')} ms)")
    )
    if trace.get("status") == "no_trace":
        lines.append(f"  reason: {trace.get('reason')}")
    return "\n".join(lines)


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temp_name = tempfile.mkstemp(prefix=path.name, dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def write_outputs(verdict: dict[str, Any], output: Path, archive: GymArchive | None = None) -> None:
    output.mkdir(parents=True, exist_ok=True)
    document = {key: value for key, value in verdict.items() if key != "timeline"}
    _atomic_write(output / "verdict.json", json.dumps(document, indent=2, sort_keys=True) + "\n")
    timeline_lines = ["wall_time_iso8601,monotonic_ns,stream,type,detail"]
    for entry in verdict.get("timeline", []):
        detail = str(entry["detail"]).replace(",", ";")
        timeline_lines.append(f"{_iso8601(entry['ms'])},{entry['monotonic_ns'] or ''},{entry['stream']},{entry['type']},{detail}")
    _atomic_write(output / "timeline.csv", "\n".join(timeline_lines) + "\n")

    distance_lines = ["wall_time_iso8601,distance_m,accuracy_m,label,reducer_state,region_presence"]
    if archive is not None:
        gym_id = gym_under_test(archive)
        samples = location_samples(archive, gym_id)
        windows = build_windows(archive)
        regions = region_events(archive, gym_id)
        for sample in samples:
            label = "-"
            for window in windows:
                if window.start_ms <= sample["ms"] <= window.end_ms:
                    label = window.place
                    break
            presence = "-"
            for event in regions:
                if event["type"] == "region_event" and event["ms"] <= sample["ms"]:
                    presence = "inside" if event["kind"] == "enter" else "outside"
                elif event["type"] == "region_state_determined" and event["ms"] <= sample["ms"] and event["state"]:
                    presence = event["state"]
            spans = confirmed_spans(reducer_intervals(archive)[0], session_end_ms(archive), gym_id)
            reducer_state = "confirmed" if any(low <= sample["ms"] <= high for low, high in spans) else "idle"
            distance = "" if sample["distance_m"] is None else f"{sample['distance_m']:.1f}"
            accuracy = "" if sample["accuracy_m"] is None else f"{sample['accuracy_m']:.1f}"
            distance_lines.append(
                f"{sample['iso']},{distance},{accuracy},{label},{reducer_state},{presence}"
            )
    _atomic_write(output / "distance.csv", "\n".join(distance_lines) + "\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Offline verdict generator for Gym Recorder archives.")
    parser.add_argument("--capture", required=True, type=Path, help="a .gymcapture directory or gym-capture-<id>.zip")
    parser.add_argument("--output", required=True, type=Path, help="new or empty local output directory")
    parser.add_argument("--expected", type=Path, help="override EXPECTED.json (defaults to the file next to this script)")
    parser.add_argument("--trace", type=Path, help="optional Trace Lab NDJSON export")
    args = parser.parse_args(argv)

    output: Path = args.output
    if output.exists() and any(output.iterdir()):
        print("gym-recorder validate failed: --output must be new or empty", file=sys.stderr)
        return 2
    try:
        archive = load_archive(args.capture)
        expected = load_expected(args.expected)
    except (OSError, ArchiveError) as error:
        print(f"gym-recorder validate failed: {error}", file=sys.stderr)
        return 2

    verdict = build_verdict(archive, expected, trace_path=args.trace)
    verdict["timeline"] = _timeline(archive)
    write_outputs(verdict, output, archive=archive)
    print(render_stdout(verdict))
    print(f"\nWrote {output}/verdict.json, timeline.csv and distance.csv")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
