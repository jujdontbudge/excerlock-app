#!/usr/bin/env python3
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).with_name("join.py")
SESSION = "123e4567-e89b-42d3-a456-426614174000"
BASE_MONOTONIC = 10_000_000_000
BASE_WALL = 1_700_000_000_000


def event(sequence, event_type, payload=None):
    return {
        "schemaVersion": 1,
        "sequence": sequence,
        "type": event_type,
        "receiptMonotonicNs": BASE_MONOTONIC + sequence * 1_000_000,
        "receiptWallTimeMs": BASE_WALL + sequence,
        "receiptWallTimeISO8601": "2023-11-14T22:13:20Z",
        "payload": payload or {},
    }


def production_event(sequence, event_type, payload=None, session=SESSION):
    value = event(sequence, event_type, payload)
    value.pop("type")
    value.update({
        "sessionId": session,
        "producer": "host_native",
        "processInstanceId": "123e4567-e89b-42d3-a456-426614174111",
        "eventType": event_type,
        "operationId": None,
    })
    return value


class JoinTests(unittest.TestCase):
    def fixture(self, root: Path, production_session=SESSION):
        recorder = root / "recorder"
        recorder.mkdir()
        system = [
            event(1, "session_start", {
                "linkedTraceRequested": True,
                "linkedSessionId": SESSION,
                "linkedProtocolVersion": 1,
            }),
            event(2, "canary_outcome", {"phase": "walking", "outcome": "app_opened", "expected": "app_opened"}),
            event(3, "canary_outcome", {"phase": "stationary", "outcome": "shield_visible", "expected": "shield_visible"}),
            event(4, "session_end", {"status": "completed"}),
        ]
        for index, name in enumerate(("system.ndjson", "labels.ndjson", "decisions.ndjson", "raw-motion.ndjson")):
            rows = system if name == "system.ndjson" else [event(index + 4, "fixture")]
            (recorder / name).write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        (recorder / "metadata.json").write_text(json.dumps({
            "linkedTrace": {
                "requested": True,
                "protocolVersion": 1,
                "sessionId": SESSION,
                "clockDomain": "mach_continuous_time",
                "productionStartWasAssumed": False,
                "nonceExported": False,
            }
        }), encoding="utf-8")
        production = root / "production.ndjson"
        rows = [
            production_event(1, "trace_start", {"protocolVersion": 1}, production_session),
            production_event(2, "motion_callback_native", {"stream": "activity"}, production_session),
            production_event(3, "detector_persist", {"status": "returned"}, production_session),
            production_event(4, "policy_publish", {"status": "returned"}, production_session),
            production_event(5, "shield_write", {"status": "returned"}, production_session),
            production_event(6, "trace_stop", {"status": "completed"}, production_session),
        ]
        production.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        return recorder, production

    def test_valid_join_is_local_and_reports_causal_coverage(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.fixture(root)
            output = root / "joined"
            result = subprocess.run(
                ["python3", str(SCRIPT), "--recorder", str(recorder), "--production", str(production), "--output", str(output)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            validation = json.loads((output / "validation.json").read_text(encoding="utf-8"))
            self.assertTrue(validation["valid"])
            self.assertEqual(validation["sessionId"], SESSION)
            self.assertEqual(validation["productionCoverage"]["shieldWrite"], 1)
            self.assertEqual(len(validation["canaryObservations"]), 2)
            self.assertFalse(validation["claims"]["managedSettingsReturnedMeansVisibleShield"])

    def test_inverted_canary_expectation_fails_closed(self):
        # The old, wrong protocol expected the shield while walking and release
        # after standing still. The joiner must reject that inverted evidence.
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.fixture(root)
            system = [
                event(1, "session_start", {
                    "linkedTraceRequested": True,
                    "linkedSessionId": SESSION,
                    "linkedProtocolVersion": 1,
                }),
                event(2, "canary_outcome", {"phase": "walking", "outcome": "shield_visible", "expected": "shield_visible"}),
                event(3, "session_end", {"status": "completed"}),
            ]
            (recorder / "system.ndjson").write_text(
                "".join(json.dumps(row) + "\n" for row in system), encoding="utf-8"
            )
            output = root / "joined"
            result = subprocess.run(
                ["python3", str(SCRIPT), "--recorder", str(recorder), "--production", str(production), "--output", str(output)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 2)
            validation = json.loads((output / "validation.json").read_text(encoding="utf-8"))
            self.assertFalse(validation["valid"])
            self.assertTrue(any("invalid expected result" in error for error in validation["errors"]))

    def test_production_trace_rejects_human_canary_labels(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.fixture(root)
            rows = [json.loads(line) for line in production.read_text(encoding="utf-8").splitlines()]
            rows[-1]["sequence"] = 7
            rows.insert(-1, production_event(6, "canary_outcome", {
                "phase": "walking", "outcome": "app_opened", "expected": "app_opened",
            }))
            production.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
            output = root / "joined"
            result = subprocess.run(
                ["python3", str(SCRIPT), "--recorder", str(recorder), "--production", str(production), "--output", str(output)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 2)
            validation = json.loads((output / "validation.json").read_text(encoding="utf-8"))
            self.assertIn("production trace has an unknown event type", validation["errors"])

    def test_session_mismatch_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.fixture(root, "123e4567-e89b-42d3-a456-426614174999")
            output = root / "joined"
            result = subprocess.run(
                ["python3", str(SCRIPT), "--recorder", str(recorder), "--production", str(production), "--output", str(output)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 2)
            validation = json.loads((output / "validation.json").read_text(encoding="utf-8"))
            self.assertFalse(validation["valid"])
            self.assertTrue(any("session mismatch" in error for error in validation["errors"]))

    def test_monotonic_regression_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.fixture(root)
            rows = [json.loads(line) for line in production.read_text(encoding="utf-8").splitlines()]
            rows[2]["receiptMonotonicNs"] = rows[1]["receiptMonotonicNs"] - 3_000_000_000
            production.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
            output = root / "joined"
            result = subprocess.run(
                ["python3", str(SCRIPT), "--recorder", str(recorder), "--production", str(production), "--output", str(output)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 2)
            validation = json.loads((output / "validation.json").read_text(encoding="utf-8"))
            self.assertTrue(any("monotonic clock regressed" in error for error in validation["errors"]))


class ManifestJoinTests(unittest.TestCase):
    """The manifest rawStream contract: declared suspensions and label-window
    coverage must match the archived streams, and a silent gap must fail."""

    def legacy_fixture(self, root: Path):
        return JoinTests.fixture(self, root)

    def manifest_fixture(
        self,
        root: Path,
        *,
        suspensions=None,
        window_coverage="partial",
        window_sample_count=42,
        ended_before=False,
        raw_buckets=(0.2, 0.45, 0.7, 0.95, 1.2, 1.45, 1.7, 1.95, 4.5, 4.75, 5.0, 5.25, 5.5, 5.75, 6.0),
        extra_suspension=None,
    ):
        recorder = root / "recorder"
        recorder.mkdir()

        def at(seconds):
            return BASE_MONOTONIC + int(round(seconds * 1_000_000_000))

        def wall(seconds):
            return BASE_WALL + int(round(seconds * 1_000))

        def row(sequence, event_type, seconds, payload=None):
            return {
                "schemaVersion": 1,
                "sequence": sequence,
                "type": event_type,
                "receiptMonotonicNs": at(seconds),
                "receiptWallTimeMs": wall(seconds),
                "receiptWallTimeISO8601": "2023-11-14T22:13:20Z",
                "payload": payload or {},
            }

        system_start = (0.0, "system", "session_start", {
            "linkedTraceRequested": True,
            "linkedSessionId": SESSION,
            "linkedProtocolVersion": 1,
        })
        entries = [
            system_start,
            (0.5, "labels", "label_transition", {"fromLabel": None, "toLabel": "normal_walking"}),
            (1.0, "system", "canary_outcome", {"phase": "walking", "outcome": "app_opened", "expected": "app_opened"}),
            (1.2, "decisions", "production_walking_decision", {"phase": "inactive"}),
        ]
        stream_counts = {"accelerometer": 0, "gyroscope": 0, "device_motion": 0}
        stream_offsets = {"accelerometer": 0.0, "gyroscope": 0.08, "device_motion": 0.16}
        for bucket in raw_buckets:
            for stream, offset in stream_offsets.items():
                entries.append((bucket + offset, "raw", f"{stream}_sample", {"stream": stream, "valid": True}))
                stream_counts[stream] += 1
        entries.extend([
            (6.5, "system", "canary_outcome", {"phase": "stationary", "outcome": "shield_visible", "expected": "shield_visible"}),
            (7.0, "labels", "label_transition", {"fromLabel": "normal_walking", "toLabel": None}),
            (8.0, "system", "session_end", {"status": "completed"}),
        ])
        # Sequence order is time order across every stream, exactly as the
        # recorder writes it.
        entries.sort(key=lambda entry: entry[0])
        files: dict[str, list[dict[str, Any]]] = {"system.ndjson": [], "labels.ndjson": [], "decisions.ndjson": [], "raw-motion.ndjson": []}
        for sequence, (seconds, channel, event_type, payload) in enumerate(entries, 1):
            files[{"system": "system.ndjson", "labels": "labels.ndjson", "decisions": "decisions.ndjson", "raw": "raw-motion.ndjson"}[channel]].append(
                row(sequence, event_type, seconds, payload)
            )
        raw = files["raw-motion.ndjson"]
        receipts = [event["receiptMonotonicNs"] for event in raw]

        suspension_payloads = [
            {
                "fromReceiptMonotonicNs": at(start),
                "toReceiptMonotonicNs": at(end),
                "fromReceiptWallTimeMs": wall(start),
                "toReceiptWallTimeMs": wall(end),
                "fromWallTimeISO8601": "2023-11-14T22:13:20Z",
                "toWallTimeISO8601": "2023-11-14T22:13:20Z",
                "durationSeconds": end - start,
                "basis": "app_lifecycle_raw_gap",
                "observedStreams": ["accelerometer", "gyroscope", "device_motion"],
                "exactSuspensionTimeKnown": False,
                "source": "live_capture",
            }
            for start, end in (suspensions if suspensions is not None else [(2.16, 4.5)])
        ]
        if extra_suspension is not None:
            start, end = extra_suspension
            suspension_payloads.append({
                "fromReceiptMonotonicNs": at(start),
                "toReceiptMonotonicNs": at(end),
                "fromReceiptWallTimeMs": wall(start),
                "toReceiptWallTimeMs": wall(end),
                "fromWallTimeISO8601": "2023-11-14T22:13:20Z",
                "toWallTimeISO8601": "2023-11-14T22:13:20Z",
                "durationSeconds": end - start,
                "basis": "raw_delivery_gap",
                "observedStreams": ["accelerometer", "gyroscope", "device_motion"],
                "exactSuspensionTimeKnown": False,
                "source": "live_capture",
            })

        def within_window(low, high):
            return sum(1 for value in receipts if at(low) <= value < at(high))

        raw_windows = [{
            "scenario": "normal_walking",
            "fromReceiptMonotonicNs": at(0.5),
            "toReceiptMonotonicNs": at(7.0),
            "fromReceiptWallTimeMs": wall(0.5),
            "toReceiptWallTimeMs": wall(7.0),
            "durationSeconds": 6.5,
            "rawSampleCount": within_window(0.5, 7.0) if window_sample_count is None else window_sample_count,
            "rawStreamsObserved": ["accelerometer", "gyroscope", "device_motion"],
            "uncoveredSeconds": 2.34,
            "coverageRatio": 0.64,
            "coverage": window_coverage,
        }]
        manifest = {
            "id": SESSION,
            "status": "completed",
            "rawStream": {
                "schemaVersion": 1,
                "requestedRateHz": 50,
                "expectedStreams": ["accelerometer", "gyroscope", "device_motion"],
                "suspensionThresholdSeconds": 2.0,
                "sampleCountBasis": "exact",
                "sampleCounts": stream_counts,
                "firstSampleMonotonicNs": receipts[0],
                "lastSampleMonotonicNs": receipts[-1],
                "firstSampleWallTimeMs": wall(0.2),
                "lastSampleWallTimeMs": wall(6.16),
                "suspendedSeconds": sum(item["durationSeconds"] for item in suspension_payloads),
                "endedBeforeSessionEnd": ended_before,
                "suspensionCount": len(suspension_payloads),
                "suspensions": suspension_payloads,
                "labelWindows": raw_windows,
            },
        }

        for name, rows in files.items():
            (recorder / name).write_text(
                "".join(json.dumps(item) + "\n" for item in rows), encoding="utf-8"
            )
        (recorder / "metadata.json").write_text(json.dumps({
            "linkedTrace": {
                "requested": True,
                "protocolVersion": 1,
                "sessionId": SESSION,
                "clockDomain": "mach_continuous_time",
                "productionStartWasAssumed": False,
                "nonceExported": False,
            }
        }), encoding="utf-8")
        (recorder / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")

        production = root / "production.ndjson"
        rows = [
            production_event(1, "trace_start", {"protocolVersion": 1}),
            production_event(2, "motion_callback_native", {"stream": "activity"}),
            production_event(3, "detector_persist", {"status": "returned"}),
            production_event(4, "policy_publish", {"status": "returned"}),
            production_event(5, "shield_write", {"status": "returned"}),
            production_event(6, "trace_stop", {"status": "completed"}),
        ]
        production.write_text("".join(json.dumps(item) + "\n" for item in rows), encoding="utf-8")
        return recorder, production

    def run_join(self, recorder, production, output):
        result = subprocess.run(
            ["python3", str(SCRIPT), "--recorder", str(recorder), "--production", str(production), "--output", str(output)],
            check=False,
            capture_output=True,
            text=True,
        )
        validation = None
        if (output / "validation.json").exists():
            validation = json.loads((output / "validation.json").read_text(encoding="utf-8"))
        return result, validation

    def test_declared_suspension_is_accepted_and_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.manifest_fixture(root)
            result, validation = self.run_join(recorder, production, root / "joined")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(validation["valid"], validation["errors"])
            report = validation["rawStream"]
            self.assertTrue(report["declared"])
            self.assertEqual(report["suspensionCount"], 1)
            self.assertEqual(report["suspensions"][0]["basis"], "app_lifecycle_raw_gap")
            self.assertEqual(report["labelWindows"][0]["coverage"], "partial")
            self.assertEqual(len(report["uncoveredLabelWindows"]), 1)
            self.assertTrue(any("incomplete raw coverage" in warning for warning in validation["warnings"]))

    def test_silent_raw_gap_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.manifest_fixture(root, suspensions=[], window_coverage="covered")
            result, validation = self.run_join(recorder, production, root / "joined")
            self.assertEqual(result.returncode, 2)
            self.assertFalse(validation["valid"])
            self.assertTrue(any("is not declared as a suspension" in error for error in validation["errors"]), validation["errors"])

    def test_suspension_over_delivered_samples_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.manifest_fixture(root, extra_suspension=(1.0, 3.0))
            result, validation = self.run_join(recorder, production, root / "joined")
            self.assertEqual(result.returncode, 2)
            self.assertTrue(any("overlaps" in error for error in validation["errors"]), validation["errors"])

    def test_label_window_claiming_coverage_without_samples_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.manifest_fixture(
                root,
                raw_buckets=(0.2,),
                suspensions=[(0.36, 8.0)],
                window_coverage="covered",
                window_sample_count=0,
                ended_before=True,
            )
            result, validation = self.run_join(recorder, production, root / "joined")
            self.assertEqual(result.returncode, 2)
            self.assertTrue(
                any("claims raw coverage but contains no raw inertial sample" in error for error in validation["errors"]),
                validation["errors"],
            )

    def test_label_window_denying_coverage_while_samples_exist_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.manifest_fixture(root, window_coverage="none", window_sample_count=0)
            result, validation = self.run_join(recorder, production, root / "joined")
            self.assertEqual(result.returncode, 2)
            self.assertTrue(
                any("claims no raw coverage but raw samples exist inside it" in error for error in validation["errors"]),
                validation["errors"],
            )

    def test_legacy_manifest_without_raw_stream_still_joins(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.legacy_fixture(root)
            (recorder / "manifest.json").write_text(json.dumps({"id": SESSION, "status": "completed"}), encoding="utf-8")
            result, validation = self.run_join(recorder, production, root / "joined")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(validation["valid"], validation["errors"])
            self.assertFalse(validation["rawStream"]["declared"])
            self.assertTrue(any("legacy archive" in warning for warning in validation["warnings"]))

    def test_missing_manifest_still_joins_with_a_warning(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            recorder, production = self.legacy_fixture(root)
            result, validation = self.run_join(recorder, production, root / "joined")
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue(validation["valid"], validation["errors"])
            self.assertFalse(validation["rawStream"]["declared"])
            self.assertTrue(any("no manifest.json" in warning for warning in validation["warnings"]))


if __name__ == "__main__":
    unittest.main()
