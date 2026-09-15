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


if __name__ == "__main__":
    unittest.main()
