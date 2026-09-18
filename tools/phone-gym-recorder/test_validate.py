#!/usr/bin/env python3
"""Tests for the Gym Recorder verdict generator (`validate.py`).

The archives here are synthetic: every test builds the NDJSON streams a phone
would have written, so the scoring rules can be exercised without a device. Same
helper style as `tools/linked-recorder/test_join.py`.
"""

from __future__ import annotations

import json
import tempfile
import unittest
import zipfile
from pathlib import Path

import validate

T0_WALL_MS = 1_700_000_000_000
GYM_ID = "gym-primary"
CHANNELS = (
    "raw-location.ndjson",
    "raw-motion.ndjson",
    "labels.ndjson",
    "observations.ndjson",
    "decisions.ndjson",
    "system.ndjson",
)


def iso(wall_ms: int) -> str:
    import datetime

    return datetime.datetime.fromtimestamp(wall_ms / 1000, datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def window_coverage(sample_seconds: list[float], start: float, end: float, threshold: float = 15.0):
    """The same rule the phone's GymLabelTimeline applies: a gap is uncovered
    only when the location stream was silent longer than the threshold."""
    stamps = sorted(value for value in sample_seconds if start <= value <= end)
    uncovered: list[tuple[float, float]] = []
    if not stamps:
        uncovered.append((start, end))
    else:
        if stamps[0] - start > threshold:
            uncovered.append((start, stamps[0]))
        for previous, current in zip(stamps, stamps[1:]):
            if current - previous > threshold:
                uncovered.append((previous, current))
        if end - stamps[-1] > threshold:
            uncovered.append((stamps[-1], end))
    return stamps, uncovered


class ArchiveBuilder:
    """Builds one `.gymcapture` directory the way the phone would write it."""

    def __init__(self, scenario: str = "S02", start_place: str = "away", gym_radius: float = 100.0):
        self.scenario = scenario
        self.start_place = start_place
        self.gym_radius = gym_radius
        self.events: dict[str, list[dict]] = {channel: [] for channel in CHANNELS}
        self.sequence = 0
        self.labels: list[dict] = []
        self.sample_seconds: list[float] = []
        self.region_events: list[dict] = []
        self.decisions: list[dict] = []
        self.observations: list[dict] = []
        self.actions: list[dict] = []
        self.system_extra: list[dict] = []
        self.manifest_override: dict | None = None
        self.setup_declared = True
        self.start_seconds = 0.0
        self.end_seconds: float | None = None
        self.start_label_written = False

    # -- low level -------------------------------------------------------

    def emit(self, channel: str, event_type: str, payload: dict, seconds: float) -> dict:
        if not channel.endswith(".ndjson"):
            channel = f"{channel}.ndjson"
        self.sequence += 1
        wall = T0_WALL_MS + int(round(seconds * 1000))
        event = {
            "schemaVersion": 1,
            "sequence": self.sequence,
            "type": event_type,
            "receiptMonotonicNs": 1_000_000_000 + int(round(seconds * 1_000_000_000)),
            "receiptWallTimeMs": wall,
            "receiptWallTimeISO8601": iso(wall),
            "payload": payload,
        }
        self.events[channel].append(event)
        return event

    # -- session shape ---------------------------------------------------

    def start(self) -> "ArchiveBuilder":
        self.start_seconds = 0.0
        self.emit("system", "session_start", {"scenarioId": self.scenario, "scenarioIdIsDeclared": True}, 0.0)
        self.emit("labels", "scenario_declared", {"scenarioId": self.scenario, "scriptVersion": 1, "expectedOutcomeVersion": 1}, 0.0)
        if self.setup_declared:
            self.emit("observations", "excerlock_setup_declared", {
                "sameGymSaved": True,
                "radiusMeters": self.gym_radius,
                "autoDetectOn": True,
                "locationPermission": "always",
                "preciseLocation": "true",
                "buildKind": "production",
            }, 0.0)
        self.emit("system", "permission_state", {"location": "always", "locationAccuracy": "fullAccuracy"}, 0.0)
        self.label(0.0, self.start_place, reason="session_start")
        self.start_label_written = True
        return self

    def label(self, seconds: float, place: str | None, reason: str = "user_tap", basis: str = "live", offset: float | None = None) -> dict:
        previous = self.labels[-1]["toPlace"] if self.labels else None
        boundary = seconds - (offset or 0.0)
        event = self.emit("labels", "label_transition", {
            "fromPlace": previous,
            "toPlace": place,
            "boundaryMonotonicNs": 1_000_000_000 + int(round(boundary * 1_000_000_000)),
            "boundaryWallTimeMs": T0_WALL_MS + int(round(boundary * 1000)),
            "boundaryWallTimeISO8601": iso(T0_WALL_MS + int(round(boundary * 1000))),
            "reason": reason,
            "basis": basis,
            "declaredOffsetSeconds": offset,
        }, seconds)
        self.labels.append({"seconds": seconds, "boundary": boundary, "toPlace": place, "basis": basis, "offset": offset, "reason": reason})
        return event

    def ack(self, seconds: float, step_id: str, ack: str | None = None) -> None:
        self.emit("labels", "script_step_acknowledged", {"scenarioId": self.scenario, "stepId": step_id, "ack": ack}, seconds)

    def note(self, seconds: float, text: str) -> None:
        self.emit("labels", "label_note", {"text": text}, seconds)

    def sample(self, seconds: float, distance: float = 10.0, accuracy: float = 5.0, app_state: str = "foreground") -> None:
        self.sample_seconds.append(seconds)
        self.emit("raw-location", "location_sample", {
            "latitude": 40.741,
            "longitude": -73.989,
            "horizontalAccuracyM": accuracy,
            "invalid": False,
            "speedMps": 1.0,
            "appState": app_state,
            "deliveryBatchSize": 1,
            "perGym": [{
                "gymId": GYM_ID,
                "distanceM": distance,
                "insideByDistance": distance <= self.gym_radius,
                "accuracyBand": "inside_certain" if distance + accuracy <= self.gym_radius else "ambiguous",
            }],
        }, seconds)

    def samples_every(self, step: float, start: float, end: float, distance: float = 10.0, accuracy: float = 5.0) -> None:
        value = start
        while value <= end:
            self.sample(value, distance=distance, accuracy=accuracy)
            value += step

    def region(self, seconds: float, kind: str, app_state: str = "foreground") -> None:
        self.region_events.append({"seconds": seconds, "kind": kind, "gymId": GYM_ID})
        self.emit("raw-location", "region_event", {
            "gymId": GYM_ID,
            "kind": kind,
            "appState": app_state,
            "sourceTime": "unavailable_receipt_only",
        }, seconds)
        self.emit("decisions", "region_presence", {
            "gymId": GYM_ID,
            "inside": kind == "enter",
            "basis": "region_event",
            "sourceTime": "unavailable_receipt_only",
        }, seconds)

    def reducer(self, seconds: float, transition: str, *, entered_at: float | None = None, confirmed_at: float | None = None,
                exited_at: float | None = None, pending_at: float | None = None, confirmed_since: float | None = None) -> None:
        def wall(value: float | None) -> int | None:
            return None if value is None else T0_WALL_MS + int(round(value * 1000))

        interval_id = None if entered_at is None else f"{GYM_ID}:{wall(entered_at)}"
        self.emit("decisions", "production_gym_decision", {
            "gymId": GYM_ID,
            "transition": transition,
            "pendingEnterAtWallMs": wall(pending_at),
            "confirmedSinceWallMs": wall(confirmed_since),
            "intervalId": interval_id,
            "intervalEnteredAt": wall(entered_at),
            "intervalConfirmedAt": wall(confirmed_at),
            "intervalExitedAt": wall(exited_at),
            "latencyFromRegionEventMs": None,
            "trigger": transition,
        }, seconds)

    def confirm(self, seconds: float, entered_at: float = 0.0, confirmed_at: float | None = None) -> None:
        confirmed = entered_at + 30.0 if confirmed_at is None else confirmed_at
        self.reducer(seconds, "confirm_due", entered_at=entered_at, confirmed_at=confirmed, confirmed_since=confirmed)

    def exit(self, seconds: float, entered_at: float = 0.0, confirmed_at: float = 30.0, exited_at: float | None = None) -> None:
        self.reducer(seconds, "exit_received", entered_at=entered_at, confirmed_at=confirmed_at,
                     exited_at=seconds if exited_at is None else exited_at)

    def observe(self, seconds: float, card: str, lock: str = "cannot_tell") -> None:
        self.observations.append({"seconds": seconds, "card": card, "lock": lock})
        self.emit("observations", "excerlock_state_observed", {"card": card, "lock": lock}, seconds)

    def canary(self, seconds: float, outcome: str) -> None:
        self.observations.append({"seconds": seconds, "canary": outcome})
        self.emit("observations", "canary_outcome", {"outcome": outcome}, seconds)

    def action(self, seconds: float, action: str) -> None:
        self.actions.append({"seconds": seconds, "action": action})
        self.emit("observations", "excerlock_action", {"action": action}, seconds)

    def system(self, seconds: float, event_type: str, payload: dict) -> None:
        self.system_extra.append({"seconds": seconds, "type": event_type})
        self.emit("system", event_type, payload, seconds)

    def finish(self, seconds: float, status: str = "completed") -> None:
        self.end_seconds = seconds
        self.emit("system", "session_end", {"status": status}, seconds)

    # -- archive ---------------------------------------------------------

    def windows(self) -> list[dict]:
        end = self.end_seconds if self.end_seconds is not None else max(
            [event["receiptMonotonicNs"] for events in self.events.values() for event in events],
            default=0,
        ) / 1_000_000_000
        result = []
        for index, label in enumerate(self.labels):
            if not label["toPlace"]:
                continue
            next_boundary = None
            for later in self.labels[index + 1:]:
                next_boundary = later["boundary"]
                break
            to = next_boundary if next_boundary is not None else end
            if to is None:
                to = end
            stamps, uncovered = window_coverage(self.sample_seconds, label["boundary"], to)
            duration = max(0.0, to - label["boundary"])
            uncovered_seconds = min(duration, sum(high - low for low, high in uncovered))
            if not stamps:
                coverage = "none"
            elif uncovered_seconds <= 15.0:
                coverage = "covered"
            else:
                coverage = "partial"
            result.append({
                "place": label["toPlace"],
                "from": label["boundary"],
                "to": to,
                "durationSeconds": duration,
                "locationSampleCount": len(stamps),
                "regionEventsDuringWindow": sum(
                    1 for event in self.region_events if label["boundary"] <= event["seconds"] <= to
                ),
                "uncoveredSeconds": uncovered_seconds,
                "coverageRatio": 1.0 if duration == 0 else max(0.0, 1 - uncovered_seconds / duration),
                "coverage": coverage,
                "basis": label["basis"],
                "declaredOffsetSeconds": label["offset"],
            })
        return result

    def manifest(self) -> dict:
        windows = self.windows()
        return {
            "id": "synthetic",
            "startedAt": {"monotonicNs": 1_000_000_000, "wallTimeMs": T0_WALL_MS, "wallTimeISO8601": iso(T0_WALL_MS)},
            "endedAt": {"monotonicNs": 1_000_000_000 + int((self.end_seconds or 0) * 1e9),
                         "wallTimeMs": T0_WALL_MS + int((self.end_seconds or 0) * 1000),
                         "wallTimeISO8601": iso(T0_WALL_MS + int((self.end_seconds or 0) * 1000))},
            "status": "completed",
            "eventCount": self.sequence,
            "segmentCount": len([label for label in self.labels if label["toPlace"]]),
            "gapCount": 0,
            "byteCount": 1024,
            "placeCounts": {},
            "directoryName": "synthetic.gymcapture",
            "scenarioId": self.scenario,
            "gymIds": [GYM_ID],
            "labelWindows": [{
                "place": window["place"],
                "fromReceiptMonotonicNs": 1_000_000_000 + int(window["from"] * 1e9),
                "toReceiptMonotonicNs": 1_000_000_000 + int(window["to"] * 1e9),
                "fromReceiptWallTimeMs": T0_WALL_MS + int(window["from"] * 1000),
                "toReceiptWallTimeMs": T0_WALL_MS + int(window["to"] * 1000),
                "durationSeconds": window["durationSeconds"],
                "locationSampleCount": window["locationSampleCount"],
                "regionEventsDuringWindow": window["regionEventsDuringWindow"],
                "uncoveredSeconds": window["uncoveredSeconds"],
                "coverageRatio": window["coverageRatio"],
                "coverage": window["coverage"],
                "basis": window["basis"],
                "declaredOffsetSeconds": window["declaredOffsetSeconds"],
            } for window in windows],
            "reducerIntervals": [],
            "streams": {
                "schemaVersion": 1,
                "expectedStreams": ["location", "activity", "pedometer"],
                "suspensionThresholdsSeconds": {"location": 15.0, "activity": 120.0, "pedometer": 120.0},
                "sampleCountBasis": "exact",
                "sampleCounts": {"location": len(self.sample_seconds)},
                "observed": {},
                "suspendedSeconds": 0.0,
                "endedBeforeSessionEnd": False,
                "suspensionCount": 0,
                "suspensions": [],
                "labelWindows": [],
            },
        }

    def resequence(self) -> None:
        """The phone appends every event in receipt order, so a real archive's
        shared sequence is also monotonic in time. Tests build streams in
        whatever order reads best, so renumber here before writing."""
        flat = [
            (event["receiptMonotonicNs"], event["sequence"], channel, event)
            for channel, events in self.events.items()
            for event in events
        ]
        flat.sort(key=lambda item: (item[0], item[1]))
        for index, (_, _, _, event) in enumerate(flat, 1):
            event["sequence"] = index

    def write(self, root: Path, name: str = "synthetic") -> Path:
        self.resequence()
        directory = root / f"{name}.gymcapture"
        directory.mkdir(parents=True, exist_ok=True)
        for channel, events in self.events.items():
            text = "".join(json.dumps(event, sort_keys=True) + "\n" for event in events)
            (directory / channel).write_text(text, encoding="utf-8")
        (directory / "gym.json").write_text(json.dumps({"gyms": [{
            "id": GYM_ID, "name": "Home gym", "latitude": 40.741, "longitude": -73.989,
            "radiusMeters": self.gym_radius, "setBy": "typed",
        }]}), encoding="utf-8")
        (directory / "metadata.json").write_text(json.dumps({
            "app": "PhoneGymRecorder",
            "bundleId": "com.johansardar.excerlock.lab.gymrecorder",
            "schemaVersion": 1,
            "sourceCommit": "test",
            "deviceModel": "iPhone",
            "systemVersion": "26.0",
            "scenarioId": self.scenario,
            "permissionAtStart": "always",
            "accuracyAtStart": "fullAccuracy",
            "productionParity": {"gymConfirmMs": 10000, "radiusMinMeters": 50, "radiusMaxMeters": 200, "maxGyms": 5},
        }), encoding="utf-8")
        (directory / "schema.json").write_text(json.dumps({"schemaVersion": 1}), encoding="utf-8")
        (directory / "README.txt").write_text("Synthetic archive for the validator tests.\n", encoding="utf-8")
        manifest = self.manifest_override or self.manifest()
        (directory / "manifest.json").write_text(json.dumps(manifest, sort_keys=True), encoding="utf-8")
        return directory


def build_verdict(builder: ArchiveBuilder, root: Path, name: str = "synthetic"):
    capture = builder.write(root, name=name)
    archive = validate.load_archive(capture)
    return validate.build_verdict(archive, validate.load_expected()), archive


class ValidatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self._temporary = tempfile.TemporaryDirectory()
        self.root = Path(self._temporary.name)

    def tearDown(self) -> None:
        self._temporary.cleanup()

    # -- false positives and negatives -----------------------------------

    def test_confirmed_interval_under_away_is_false_positive_seconds(self) -> None:
        builder = ArchiveBuilder("S05").start()
        builder.samples_every(5, 0, 400)
        builder.region(61, "enter")
        builder.region(400, "exit")
        builder.label(60, "in_gym")
        builder.label(200, "away")
        builder.confirm(91, entered_at=61)
        builder.exit(400, entered_at=61, confirmed_at=91)
        builder.finish(420)

        verdict, _ = build_verdict(builder, self.root)
        # 400 - 200 = 200 s of confirmed presence under `away`, minus the 15 s
        # human tolerance after the boundary = 185 s.
        self.assertAlmostEqual(verdict["fpSeconds"], 185.0, delta=1.0)
        self.assertEqual(verdict["verdict"], "FAIL")
        self.assertEqual(verdict["verdicts"][-1]["label"], "away")
        self.assertEqual(verdict["verdicts"][-1]["verdict"], "FAIL")

    def test_presence_inside_the_tolerance_window_is_not_a_false_positive(self) -> None:
        builder = ArchiveBuilder("S05").start()
        builder.samples_every(5, 0, 260)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.label(200, "away")
        builder.confirm(91, entered_at=61)
        builder.exit(205, entered_at=61, confirmed_at=91)
        builder.finish(260)

        verdict, _ = build_verdict(builder, self.root)
        self.assertEqual(verdict["fpSeconds"], 0.0)
        self.assertEqual(verdict["verdict"], "PASS")
        self.assertGreaterEqual(verdict["verdicts"][-1]["uncertainSeconds"], 15.0)

    def test_in_gym_window_without_a_confirmed_interval_is_false_negative_seconds(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 400)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.finish(400)

        verdict, _ = build_verdict(builder, self.root)
        # The window is 340 s: the first 10 s of confirmation plus the 15 s
        # tolerance are not counted, so 315 s of missing presence are.
        self.assertAlmostEqual(verdict["fnSeconds"], 315.0, delta=1.0)
        self.assertEqual(verdict["verdict"], "FAIL")

    def test_short_in_gym_window_without_presence_is_reported_but_not_a_failure(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 200)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.finish(160)

        verdict, _ = build_verdict(builder, self.root)
        self.assertGreater(verdict["fnSeconds"], 0.0)
        self.assertEqual(verdict["verdict"], "PASS")
        self.assertLess(verdict["verdicts"][-1]["durationSeconds"], 300)

    def test_confirmation_lateness_inside_a_long_stay_is_reported_but_not_a_failure(self) -> None:
        """A fifteen-minute stay whose confirmation lands a few seconds past the
        45 s allowance reports those seconds but is not a false negative: the
        design's false negative is a long window with no confirmation at all."""
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 900)
        builder.region(40, "enter")
        builder.label(20, "in_gym")
        builder.confirm(70, entered_at=40)
        builder.finish(900)

        verdict, _ = build_verdict(builder, self.root)
        row = verdict["verdicts"][-1]
        self.assertGreater(row["fnSeconds"], 0.0)
        self.assertEqual(row["reducerConfirmedSeconds"], 830.0)
        self.assertEqual(row["verdict"], "PASS")
        self.assertEqual(verdict["verdict"], "PASS")

    def test_backdated_boundary_widens_the_uncertain_span(self) -> None:
        builder = ArchiveBuilder("S05").start()
        builder.samples_every(5, 0, 400)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        # The operator remembered the departure two minutes late.
        builder.label(300, "away", reason="backdated_correction", basis="backdated_estimate", offset=120)
        builder.confirm(91, entered_at=61)
        builder.exit(250, entered_at=61, confirmed_at=91)
        builder.finish(400)

        verdict, _ = build_verdict(builder, self.root)
        # 250 s is inside the backdated window's 120 s uncertainty, so the 50 s
        # after the boundary must not be scored as a false positive.
        self.assertEqual(verdict["fpSeconds"], 0.0)
        self.assertEqual(verdict["verdicts"][-1]["basis"], "backdated_estimate")
        self.assertGreaterEqual(verdict["verdicts"][-1]["uncertainSeconds"], 120.0)

    def test_pass_by_with_a_confirmation_is_a_false_positive_and_fails(self) -> None:
        builder = ArchiveBuilder("S09").start()
        builder.samples_every(5, 0, 200)
        builder.region(61, "enter")
        builder.region(90, "exit")
        builder.label(60, "passing_by")
        builder.label(120, "away")
        builder.confirm(91, entered_at=61)
        builder.exit(95, entered_at=61, confirmed_at=91)
        builder.finish(200)

        verdict, _ = build_verdict(builder, self.root)
        self.assertGreater(verdict["fpSeconds"], 0.0)
        self.assertEqual(verdict["verdict"], "FAIL")
        self.assertEqual(verdict["verdicts"][-2]["label"], "passing_by")
        self.assertEqual(verdict["verdicts"][-2]["verdict"], "FAIL")
        self.assertIn("confirmed_while_absent", [finding["kind"] for finding in verdict["findings"]])

    def test_drive_by_without_an_enter_passes_and_says_no_enter(self) -> None:
        builder = ArchiveBuilder("S10").start()
        builder.samples_every(5, 0, 200)
        builder.label(40, "passing_by")
        builder.label(70, "away")
        builder.finish(200)

        verdict, _ = build_verdict(builder, self.root)
        self.assertEqual(verdict["fpSeconds"], 0.0)
        row = next(candidate for candidate in verdict["verdicts"] if candidate["label"] == "passing_by")
        self.assertEqual(row["verdict"], "PASS")
        self.assertIsNone(row["detectionLatencyMs"])
        self.assertEqual(row["regionEnters"], 0)
        self.assertEqual(verdict["verdict"], "PASS")

    def test_oscillation_flap_count_pairs_enters_with_exits(self) -> None:
        builder = ArchiveBuilder("S07").start()
        builder.samples_every(2, 0, 1020)
        for index in range(6):
            builder.region(60 + index * 160, "enter")
            builder.region(100 + index * 160, "exit")
        builder.label(50, "in_circle_not_gym")
        builder.label(130, "away")
        builder.label(210, "in_circle_not_gym")
        builder.label(290, "away")
        builder.label(370, "in_circle_not_gym")
        builder.label(450, "away")
        builder.label(530, "in_circle_not_gym")
        builder.label(610, "away")
        builder.label(690, "in_circle_not_gym")
        builder.label(770, "away")
        builder.label(850, "in_circle_not_gym")
        builder.label(930, "away")
        builder.finish(1020)

        verdict, _ = build_verdict(builder, self.root)
        # Every crossing pair lands in its own in_circle_not_gym window, and
        # the count is reported per window rather than averaged away.
        self.assertEqual(max(row["flaps"] for row in verdict["verdicts"]), 1)
        self.assertEqual(sum(row["flaps"] for row in verdict["verdicts"]), 6)

    # -- cannot be judged -------------------------------------------------

    def test_missing_required_label_lands_in_cannot_be_judged(self) -> None:
        builder = ArchiveBuilder("S06").start()
        builder.samples_every(5, 0, 300)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.finish(300)

        verdict, _ = build_verdict(builder, self.root)
        reasons = [item["reason"] for item in verdict["cannotJudge"]]
        self.assertIn("missing_label:away", reasons)
        self.assertEqual(verdict["verdict"], "CANNOT_BE_JUDGED")

    def test_window_without_location_coverage_cannot_be_judged(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.sample(0, distance=400.0)
        builder.label(60, "in_gym")
        builder.finish(300)

        verdict, _ = build_verdict(builder, self.root)
        reasons = [item["reason"] for item in verdict["cannotJudge"]]
        self.assertIn("no_location_coverage", reasons)

    def test_mostly_uncovered_window_cannot_be_judged_with_its_ratio(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.sample(0, distance=400.0)
        builder.samples_every(5, 260, 400)
        builder.label(60, "in_gym")
        builder.finish(400)

        verdict, _ = build_verdict(builder, self.root)
        reasons = [item["reason"] for item in verdict["cannotJudge"]]
        self.assertTrue(any(reason.startswith("partial_coverage:") for reason in reasons), reasons)

    def test_missing_excerlock_declaration_cannot_be_judged(self) -> None:
        builder = ArchiveBuilder("S02")
        builder.setup_declared = False
        builder.start()
        builder.samples_every(5, 0, 300)
        builder.label(60, "in_gym")
        builder.finish(300)

        verdict, _ = build_verdict(builder, self.root)
        reasons = [item["reason"] for item in verdict["cannotJudge"]]
        self.assertIn("no_excerlock_declaration", reasons)

    def test_free_session_is_descriptive_only(self) -> None:
        builder = ArchiveBuilder("S25").start()
        builder.samples_every(5, 0, 120)
        builder.label(60, "in_gym")
        builder.finish(120)

        verdict, _ = build_verdict(builder, self.root)
        self.assertEqual(verdict["verdicts"][-1]["verdict"], "DESCRIPTIVE")
        reasons = [item["reason"] for item in verdict["cannotJudge"]]
        self.assertIn("descriptive_only", reasons)

    # -- latencies --------------------------------------------------------

    def test_detection_and_release_latencies_are_measured_from_the_label_boundary(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 400)
        builder.region(81, "enter")
        builder.label(60, "in_gym")
        builder.confirm(111, entered_at=81)
        builder.finish(400)

        verdict, _ = build_verdict(builder, self.root)
        row = verdict["verdicts"][-1]
        self.assertEqual(row["detectionLatencyMs"], 21_000)
        self.assertEqual(row["confirmLatencyMs"], 51_000)
        self.assertEqual(verdict["latenciesMs"]["enter"]["S02"], 21_000)

    def test_release_latency_is_unmeasured_for_a_window_closed_by_session_end(self) -> None:
        builder = ArchiveBuilder("S03").start()
        builder.samples_every(5, 0, 400)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.finish(400)

        verdict, _ = build_verdict(builder, self.root)
        row = verdict["verdicts"][-1]
        self.assertIsNone(row["releaseLatencyMs"])
        self.assertTrue(row["closedBySessionEnd"])
        self.assertEqual(row["releaseNote"], "unmeasured")

    def test_exit_never_delivered_is_a_finding_not_a_silent_pass(self) -> None:
        builder = ArchiveBuilder("S05").start()
        builder.samples_every(5, 0, 1400)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.label(200, "away")
        builder.confirm(91, entered_at=61)
        builder.finish(1400)

        verdict, _ = build_verdict(builder, self.root)
        kinds = [finding["kind"] for finding in verdict["findings"]]
        self.assertIn("exit_never_delivered", kinds)

    def test_confirmation_before_the_in_gym_label_is_reported(self) -> None:
        builder = ArchiveBuilder("S11").start()
        builder.samples_every(5, 0, 500)
        builder.region(20, "enter")
        builder.label(40, "in_circle_not_gym")
        builder.label(180, "in_gym")
        builder.confirm(50, entered_at=20)
        builder.finish(500)

        verdict, _ = build_verdict(builder, self.root)
        findings = {finding["kind"]: finding for finding in verdict["findings"]}
        self.assertIn("confirmed_before_in_gym", findings)
        self.assertGreater(findings["confirmed_before_in_gym"]["secondsBefore"], 60)

    # -- production layer --------------------------------------------------

    def test_production_layer_reports_agree_lag_lead_and_unknown(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 400)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.observe(100, "confirming", "cannot_tell")
        builder.observe(200, "at_gym", "unlocked")
        builder.observe(60, "at_gym", "unlocked")
        builder.canary(210, "uncertain")
        builder.finish(400)

        verdict, _ = build_verdict(builder, self.root)
        states = [row["comparison"] for row in verdict["productionLayer"]]
        self.assertIn("agree", states)
        self.assertIn("production_leads", states)
        self.assertIn("unknown", states)

    def test_production_lag_is_reported_when_the_card_trails_the_reference(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 400)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.observe(300, "not_at_gym", "locked")
        builder.finish(400)

        verdict, _ = build_verdict(builder, self.root)
        comparisons = [row["comparison"] for row in verdict["productionLayer"]]
        self.assertEqual(comparisons, ["production_lags"])
        self.assertGreaterEqual(verdict["productionLayer"][0]["confirmedForSeconds"], 60)

    # -- archive safety ----------------------------------------------------

    def test_malformed_archive_is_rejected_with_a_nonzero_exit(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.finish(100)
        capture = builder.write(self.root, name="broken")
        (capture / "labels.ndjson").unlink()
        with self.assertRaises(validate.ArchiveError):
            validate.load_archive(capture)

        output = self.root / "out-broken"
        self.assertEqual(validate.main(["--capture", str(capture), "--output", str(output)]), 2)

    def test_unsafe_zip_member_is_rejected(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.finish(100)
        capture = builder.write(self.root, name="unsafe")
        archive_path = self.root / "unsafe.zip"
        with zipfile.ZipFile(archive_path, "w") as archive:
            for channel in CHANNELS:
                archive.write(capture / channel, channel)
            archive.write(capture / "gym.json", "gym.json")
            archive.write(capture / "metadata.json", "metadata.json")
            archive.write(capture / "schema.json", "schema.json")
            archive.write(capture / "manifest.json", "manifest.json")
            archive.write(capture / "README.txt", "README.txt")
            archive.writestr("../escape.ndjson", "{}\n")
        with self.assertRaises(validate.ArchiveError):
            validate.load_archive(archive_path)

    def test_broken_sequence_is_rejected(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.finish(100)
        capture = builder.write(self.root, name="sequence")
        lines = (capture / "system.ndjson").read_text(encoding="utf-8").splitlines()
        lines[0] = lines[0].replace('"sequence": 1', '"sequence": 7')
        (capture / "system.ndjson").write_text("\n".join(lines) + "\n", encoding="utf-8")
        with self.assertRaises(validate.ArchiveError):
            validate.load_archive(capture)

    def test_zip_archive_is_accepted_like_a_directory(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 200)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.finish(200)
        capture = builder.write(self.root, name="zipme")
        archive_path = self.root / "zipme.zip"
        with zipfile.ZipFile(archive_path, "w") as archive:
            for name in [*CHANNELS, "gym.json", "metadata.json", "schema.json", "manifest.json", "README.txt"]:
                archive.write(capture / name, name)

        loaded = validate.load_archive(archive_path)
        verdict = validate.build_verdict(loaded, validate.load_expected())
        self.assertEqual(verdict["scenario"], "S02")
        self.assertTrue(verdict["valid"])

    # -- outputs ----------------------------------------------------------

    def test_outputs_write_verdict_json_and_both_csvs(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 300)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.finish(300)

        capture = builder.write(self.root, name="outputs")
        output = self.root / "out"
        exit_code = validate.main(["--capture", str(capture), "--output", str(output)])
        self.assertEqual(exit_code, 0)

        verdict_path = output / "verdict.json"
        self.assertTrue(verdict_path.exists())
        document = json.loads(verdict_path.read_text(encoding="utf-8"))
        for key in ["valid", "scenario", "verdicts", "cannotJudge", "findings", "latenciesMs", "fpSeconds", "fnSeconds"]:
            self.assertIn(key, document)
        self.assertTrue((output / "timeline.csv").exists())
        self.assertTrue((output / "distance.csv").exists())
        distance_rows = (output / "distance.csv").read_text(encoding="utf-8").strip().splitlines()
        self.assertGreater(distance_rows[0].count(","), 2)
        self.assertGreater(len(distance_rows), 2)

    def test_stdout_table_names_the_scenario_and_prints_the_verdict(self) -> None:
        builder = ArchiveBuilder("S09").start()
        builder.samples_every(5, 0, 200)
        builder.region(61, "enter")
        builder.label(60, "passing_by")
        builder.label(120, "away")
        builder.confirm(91, entered_at=61)
        builder.exit(95, entered_at=61, confirmed_at=91)
        builder.finish(200)

        capture = builder.write(self.root, name="stdout")
        archive = validate.load_archive(capture)
        verdict = validate.build_verdict(archive, validate.load_expected())
        text = validate.render_stdout(verdict)
        for heading in ["scenario", "ref-state", "FP s", "FN s", "flaps", "verdict", "Cannot be judged", "Findings"]:
            self.assertIn(heading, text)
        self.assertIn("S09", text)
        self.assertIn("FAIL", text)

    def test_missing_trace_prints_no_trace(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 200)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.finish(200)
        capture = builder.write(self.root, name="notrace")
        archive = validate.load_archive(capture)
        verdict = validate.build_verdict(archive, validate.load_expected())
        self.assertEqual(verdict["productionTrace"]["status"], "no_trace")
        self.assertIn("no_trace", validate.render_stdout(verdict))

    def test_unreadable_trace_without_gym_events_is_still_no_trace(self) -> None:
        trace = self.root / "tracelab.ndjson"
        trace.write_text(json.dumps({"eventType": "app_lifecycle", "payload": {}}) + "\n", encoding="utf-8")
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 200)
        builder.label(60, "in_gym")
        builder.finish(200)
        capture = builder.write(self.root, name="trace")
        archive = validate.load_archive(capture)
        verdict = validate.build_verdict(archive, validate.load_expected(), trace_path=trace)
        self.assertEqual(verdict["productionTrace"]["status"], "no_trace")
        self.assertIn("gym", verdict["productionTrace"]["reason"])

    # -- expectations file ------------------------------------------------

    def test_expected_table_is_read_not_hardcoded(self) -> None:
        expected = validate.load_expected()
        self.assertEqual(expected["scenarios"][0]["id"], "S01")
        self.assertEqual(expected["thresholds"]["confirmMs"], 10000)
        # The shipped copy next to the validator must equal the app's fixture.
        fixture = json.loads((Path(validate.__file__).parent / "Fixtures" / "EXPECTED.json").read_text(encoding="utf-8"))
        self.assertEqual(expected, fixture)

    def test_coverage_mismatch_between_manifest_and_streams_is_a_finding(self) -> None:
        builder = ArchiveBuilder("S02").start()
        builder.samples_every(5, 0, 300)
        builder.region(61, "enter")
        builder.label(60, "in_gym")
        builder.confirm(91, entered_at=61)
        builder.finish(300)
        manifest = builder.manifest()
        manifest["labelWindows"][-1]["coverage"] = "none"
        manifest["labelWindows"][-1]["locationSampleCount"] = 0
        builder.manifest_override = manifest

        verdict, _ = build_verdict(builder, self.root, name="mismatch")
        kinds = [finding["kind"] for finding in verdict["findings"]]
        self.assertIn("coverage_mismatch", kinds)


if __name__ == "__main__":
    unittest.main()
