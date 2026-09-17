import XCTest
@testable import PhoneGymRecorder

private final class RecoveryTestClock: CaptureClock {
    var stamp: CaptureStamp

    init(monotonicNs: UInt64 = 1_000_000_000, wallTimeMs: Int64 = 1_700_000_000_000) {
        stamp = CaptureStamp(monotonicNs: monotonicNs, wallTimeMs: wallTimeMs, wallTimeISO8601: "2023-11-14T22:13:20Z")
    }

    func now() -> CaptureStamp { stamp }

    func advance(seconds: Double) {
        let monotonicDelta = UInt64((seconds * 1_000_000_000).rounded())
        stamp = CaptureStamp(
            monotonicNs: stamp.monotonicNs + monotonicDelta,
            wallTimeMs: stamp.wallTimeMs + Int64((seconds * 1_000).rounded()),
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: stamp.wallTimeMs + Int64((seconds * 1_000).rounded()))
        )
    }
}

/// The launch path must rebuild an interrupted archive without inventing a
/// termination time, without losing the open label window, and without turning
/// a normal five-second delivery gap into a declared suspension.
final class RecoveryTests: XCTestCase {
    private func temporaryDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try! FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private func readLines(_ url: URL) throws -> [[String: Any]] {
        let text = try String(contentsOf: url, encoding: .utf8)
        return try text.split(separator: "\n").map { line in
            try XCTUnwrap(JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any])
        }
    }

    private func makeWriter(
        root: URL,
        id: String,
        clock: RecoveryTestClock,
        checkpointStreams: RawStreamManifest?,
        timeline: inout GymLabelTimeline
    ) throws -> SessionWriter {
        let writer = try SessionWriter(
            baseURL: root,
            id: id,
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion, "scenarioId": "S02"],
            gyms: [["id": "gym-primary", "latitude": 40.741, "longitude": -73.989, "radiusMeters": 100]],
            clock: clock
        )
        try writer.checkpoint(timeline: timeline, gapCount: 0, streams: checkpointStreams)
        return writer
    }

    func testInterruptedArchiveRecoversClosedWindowCoverageAndNeverClaimsTerminationTime() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = RecoveryTestClock()
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)

        var coverage = RawCoverageTracker()
        var manifest: RawStreamManifest?
        clock.advance(seconds: 5)
        coverage.observe(stream: "location", stamp: clock.now())
        timeline.recordLocationSample(at: clock.now())
        clock.advance(seconds: 5)
        coverage.observe(stream: "location", stamp: clock.now())
        timeline.recordLocationSample(at: clock.now())
        let windows = timeline.labelWindows(
            endedAt: clock.now(),
            suspensions: coverage.suspensions,
            thresholdSeconds: coverage.thresholdSeconds
        )
        manifest = coverage.manifest(startedAt: timeline.segments[0].from, endedAt: clock.now(), labelWindows: windows)

        var writer: SessionWriter? = try makeWriter(
            root: root,
            id: "gym-interrupted",
            clock: clock,
            checkpointStreams: manifest,
            timeline: &timeline
        )
        writer = nil

        let recoveryStamp = CaptureStamp(
            monotonicNs: clock.now().monotonicNs + 30_000_000_000,
            wallTimeMs: clock.now().wallTimeMs + 30_000,
            wallTimeISO8601: "2023-11-14T22:14:00Z"
        )
        SessionWriter.recoverInterruptedSessions(baseURL: root, clock: FixedRecoveryClock(stamp: recoveryStamp))

        let repository = SessionRepository(baseURL: root)
        let summary = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(summary.status, .interrupted)
        XCTAssertEqual(summary.scenarioId, "S02")
        let window = try XCTUnwrap(summary.labelWindows.last)
        XCTAssertEqual(window.place, "in_gym")
        XCTAssertEqual(window.toReceiptMonotonicNs, recoveryStamp.monotonicNs)
        XCTAssertEqual(window.coverage, .partial, "a 30 s process gap is real uncovered location time")
        XCTAssertGreaterThan(window.uncoveredSeconds, 20)

        let directory = root.appendingPathComponent("gym-interrupted.gymcapture")
        let system = try readLines(directory.appendingPathComponent("system.ndjson"))
        XCTAssertEqual(system.last?["type"] as? String, "interruption_recovered_on_launch")
        let payload = try XCTUnwrap(system.last?["payload"] as? [String: Any])
        XCTAssertTrue((payload["meaning"] as? String)?.contains("not the exact") == true)
        XCTAssertEqual(system.dropLast().last?["type"] as? String, "location_stream_suspended")

        let labels = try readLines(directory.appendingPathComponent("labels.ndjson"))
        let closing = try XCTUnwrap(labels.last?["payload"] as? [String: Any])
        XCTAssertEqual(closing["reason"] as? String, "session_end")
        XCTAssertTrue(closing["toPlace"] is NSNull)

        XCTAssertFalse(FileManager.default.fileExists(atPath: directory.appendingPathComponent("recovery.json").path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: directory.appendingPathComponent("manifest.json").path))
    }

    func testShortRecoveryGapIsNotDeclaredAsASuspension() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = RecoveryTestClock()
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)

        var coverage = RawCoverageTracker()
        clock.advance(seconds: 2)
        coverage.observe(stream: "location", stamp: clock.now())
        timeline.recordLocationSample(at: clock.now())
        let windows = timeline.labelWindows(
            endedAt: clock.now(),
            suspensions: coverage.suspensions,
            thresholdSeconds: coverage.thresholdSeconds
        )
        let manifest = coverage.manifest(startedAt: timeline.segments[0].from, endedAt: clock.now(), labelWindows: windows)

        var writer: SessionWriter? = try makeWriter(
            root: root,
            id: "gym-short-gap",
            clock: clock,
            checkpointStreams: manifest,
            timeline: &timeline
        )
        writer = nil

        // A relaunch five seconds later is normal Core Location behaviour, not a
        // suspension, so it must not mark the window partial or add a finding.
        let recoveryStamp = CaptureStamp(
            monotonicNs: clock.now().monotonicNs + 5_000_000_000,
            wallTimeMs: clock.now().wallTimeMs + 5_000,
            wallTimeISO8601: "2023-11-14T22:13:27Z"
        )
        SessionWriter.recoverInterruptedSessions(baseURL: root, clock: FixedRecoveryClock(stamp: recoveryStamp))

        let repository = SessionRepository(baseURL: root)
        let summary = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(summary.status, .interrupted)
        XCTAssertEqual(summary.streams?.suspensionCount ?? -1, 0, "a 5 s gap is under the 15 s location threshold")
        let window = try XCTUnwrap(summary.labelWindows.last)
        XCTAssertEqual(window.coverage, .covered)
        XCTAssertLessThanOrEqual(window.uncoveredSeconds, 15)
    }

    func testLegacyCheckpointWithoutStreamSnapshotStillRecovers() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = RecoveryTestClock()
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)
        var writer: SessionWriter? = try makeWriter(
            root: root,
            id: "gym-legacy",
            clock: clock,
            checkpointStreams: nil,
            timeline: &timeline
        )
        XCTAssertNotNil(writer)
        writer = nil

        let recoveryStamp = CaptureStamp(
            monotonicNs: clock.now().monotonicNs + 60_000_000_000,
            wallTimeMs: clock.now().wallTimeMs + 60_000,
            wallTimeISO8601: "2023-11-14T22:14:20Z"
        )
        SessionWriter.recoverInterruptedSessions(baseURL: root, clock: FixedRecoveryClock(stamp: recoveryStamp))

        let repository = SessionRepository(baseURL: root)
        let summary = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(summary.status, .interrupted)
        XCTAssertEqual(summary.streams?.sampleCountBasis, "unavailable")
        XCTAssertEqual(summary.streams?.suspensionCount, 1)
        // A legacy checkpoint carries no stream snapshot, so no window can be
        // rebuilt; the closing transition is still written to labels.ndjson.
        XCTAssertTrue(summary.labelWindows.isEmpty)
        let labels = try readLines(
            root.appendingPathComponent("gym-legacy.gymcapture").appendingPathComponent("labels.ndjson")
        )
        let closing = try XCTUnwrap(labels.last?["payload"] as? [String: Any])
        XCTAssertEqual(closing["reason"] as? String, "session_end")
        XCTAssertEqual(closing["fromPlace"] as? String, "in_gym")
    }

    func testFinalizedArchiveIsNeverRecoveredAgain() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = RecoveryTestClock()
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)
        let writer = try SessionWriter(
            baseURL: root,
            id: "gym-complete",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion],
            gyms: [],
            clock: clock
        )
        _ = try writer.finalize(status: .completed, timeline: timeline, gapCount: 0)

        SessionWriter.recoverInterruptedSessions(
            baseURL: root,
            clock: FixedRecoveryClock(stamp: CaptureStamp(monotonicNs: 9_999_999_999_999, wallTimeMs: 1_700_009_999_999, wallTimeISO8601: "2023-11-15T00:59:59Z"))
        )
        let repository = SessionRepository(baseURL: root)
        let summary = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(summary.id, "gym-complete")
        XCTAssertEqual(summary.status, .completed)
    }
}

private struct FixedRecoveryClock: CaptureClock {
    let stamp: CaptureStamp
    func now() -> CaptureStamp { stamp }
}
