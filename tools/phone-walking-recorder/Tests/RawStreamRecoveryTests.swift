import XCTest
@testable import PhoneWalkingRecorder

/// An archive whose process dies without finalizing must not look like a clean
/// session that happened to end quietly: the relaunch recovery pass states the
/// suspension tail on disk and keeps the suspensions the live session recorded.
final class RawStreamRecoveryTests: XCTestCase {
    private final class RecoveryClock: CaptureClock {
        var stamp: CaptureStamp

        init(monotonicNs: UInt64 = 1_000_000_000, wallTimeMs: Int64 = 1_700_000_000_000) {
            stamp = CaptureStamp(monotonicNs: monotonicNs, wallTimeMs: wallTimeMs, wallTimeISO8601: "2023-11-14T22:13:20Z")
        }

        func now() -> CaptureStamp { stamp }

        func advance(seconds: Double) {
            let wallTimeMs = stamp.wallTimeMs + Int64((seconds * 1_000).rounded())
            stamp = CaptureStamp(
                monotonicNs: stamp.monotonicNs + UInt64((seconds * 1_000_000_000).rounded()),
                wallTimeMs: wallTimeMs,
                wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: wallTimeMs)
            )
        }
    }

    func testInterruptedArchiveManifestCarriesTheTerminationSuspension() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = RecoveryClock()
        let startedAt = clock.now()
        let tracker = RawCoverageTracker()
        var writer: SessionWriter? = try SessionWriter(
            baseURL: root,
            id: "interrupted-raw",
            startedAt: startedAt,
            metadata: ["schemaVersion": 1],
            clock: clock
        )
        let directory = try XCTUnwrap(writer?.directoryURL)

        // ~1 s delivered, a 4 s hole, then ~1 s delivered, then the process dies.
        for _ in 0...50 {
            try appendSample(writer: writer, tracker: tracker, stream: "device_motion", clock: clock)
        }
        let lastSampleBeforeHole = clock.now()
        clock.advance(seconds: 4.0)
        try appendSample(writer: writer, tracker: tracker, stream: "device_motion", clock: clock)
        let firstSampleAfterHole = clock.now()
        for _ in 0...50 {
            try appendSample(writer: writer, tracker: tracker, stream: "accelerometer", clock: clock)
        }
        let lastSample = clock.now()
        clock.advance(seconds: 2.5)
        _ = tracker.closeAtSessionEnd(startedAt: startedAt, endedAt: clock.now())
        let snapshot = tracker.manifest(startedAt: startedAt, endedAt: clock.now(), labelWindows: [])
        XCTAssertEqual(snapshot.suspensions.count, 2)
        try writer?.checkpoint(timeline: LabelTimeline(), gapCount: 0, rawStream: snapshot)
        // Raw samples keep arriving after the last checkpoint and are flushed to
        // disk without a new checkpoint (the 64 KB buffer flush): recovery must
        // continue after the sequence on disk, not after the recovery file.
        for _ in 0...2 {
            try appendSample(writer: writer, tracker: tracker, stream: "device_motion", clock: clock)
        }
        try writer?.flush()
        let lastSampleOnDisk = clock.now()
        XCTAssertEqual(SessionWriter.lastRawInertialSampleStamp(in: directory)?.monotonicNs, lastSampleOnDisk.monotonicNs)
        // The process dies here: no finalize, no manifest.
        writer = nil

        let recoveryClock = RecoveryClock(monotonicNs: 500_000_000_000, wallTimeMs: 1_700_000_500_000)
        SessionWriter.recoverInterruptedSessions(baseURL: root, clock: recoveryClock)

        let repository = SessionRepository(baseURL: root)
        let summary = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(summary.status, .interrupted)
        let rawStream = try XCTUnwrap(summary.rawStream)
        XCTAssertTrue(rawStream.endedBeforeSessionEnd)
        XCTAssertEqual(rawStream.sampleCountBasis, "as_of_last_checkpoint")
        XCTAssertEqual(rawStream.suspensions.count, 2)
        let liveSuspension = try XCTUnwrap(rawStream.suspensions.first)
        XCTAssertEqual(liveSuspension.basis, RawSuspensionBasis.rawDeliveryGap.rawValue)
        XCTAssertEqual(liveSuspension.fromReceiptMonotonicNs, lastSampleBeforeHole.monotonicNs)
        XCTAssertEqual(liveSuspension.toReceiptMonotonicNs, firstSampleAfterHole.monotonicNs)
        let termination = try XCTUnwrap(rawStream.suspensions.last)
        XCTAssertEqual(termination.basis, RawSuspensionBasis.processTerminationRecoveredOnLaunch.rawValue)
        XCTAssertEqual(termination.fromReceiptMonotonicNs, lastSampleOnDisk.monotonicNs)
        XCTAssertEqual(termination.toReceiptMonotonicNs, recoveryClock.stamp.monotonicNs)
        XCTAssertEqual(termination.source, RawSuspensionSource.recoveryPass.rawValue)
        let expectedSuspended = liveSuspension.durationSeconds + termination.durationSeconds
        XCTAssertEqual(rawStream.suspendedSeconds, expectedSuspended, accuracy: 0.0001)

        let system = try readEvents(directory.appendingPathComponent("system.ndjson"))
        XCTAssertEqual(Array(system.suffix(2).map(\.type)), ["raw_stream_suspended", "interruption_recovered_on_launch"])
        let suspensionEvent = try XCTUnwrap(system.last { $0.type == "raw_stream_suspended" })
        XCTAssertEqual(suspensionEvent.payload["basis"] as? String, RawSuspensionBasis.processTerminationRecoveredOnLaunch.rawValue)
        XCTAssertEqual((suspensionEvent.payload["fromReceiptMonotonicNs"] as? NSNumber)?.uint64Value, lastSampleOnDisk.monotonicNs)
        // The recovered events continue after the highest sequence on disk, so
        // the archive never contains a duplicate sequence.
        let diskMaximum = SessionWriter.lastSequenceOnDisk(in: directory) - 2
        XCTAssertEqual(Array(system.suffix(2).map(\.sequence)), [diskMaximum + 1, diskMaximum + 2])
    }

    func testLegacyManifestWithoutRawStreamStillDecodes() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let directory = root.appendingPathComponent("legacy.walkingcapture", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let manifest: [String: Any] = [
            "id": "legacy",
            "startedAt": ["monotonicNs": 1_000_000_000, "wallTimeMs": 1_700_000_000_000, "wallTimeISO8601": "2023-11-14T22:13:20Z"],
            "endedAt": ["monotonicNs": 2_000_000_000, "wallTimeMs": 1_700_000_001_000, "wallTimeISO8601": "2023-11-14T22:13:21Z"],
            "status": "completed",
            "eventCount": 3,
            "segmentCount": 1,
            "gapCount": 0,
            "byteCount": 128,
            "scenarioCounts": ["normal_walking": 1],
            "directoryName": "legacy.walkingcapture",
        ]
        try JSONSerialization.data(withJSONObject: manifest).write(to: directory.appendingPathComponent("manifest.json"))

        let repository = SessionRepository(baseURL: root)
        let session = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(session.id, "legacy")
        XCTAssertNil(session.rawStream, "an archive recorded before the evidence format must still load")
    }

    private func appendSample(writer: SessionWriter?, tracker: RawCoverageTracker, stream: String, clock: RecoveryClock) throws {
        clock.advance(seconds: 0.02)
        let stamp = clock.now()
        try writer?.append(channel: .raw, type: "\(stream)_sample", payload: ["stream": stream, "valid": true], stamp: stamp)
        tracker.observe(stream: stream, stamp: stamp)
    }

    private func temporaryDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try! FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private struct RawEvent {
        let type: String
        let sequence: Int
        let payload: [String: Any]
    }

    private func readEvents(_ url: URL) throws -> [RawEvent] {
        let text = try String(contentsOf: url, encoding: .utf8)
        return text.split(separator: "\n").compactMap { line in
            guard let object = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
                  let type = object["type"] as? String else { return nil }
            return RawEvent(
                type: type,
                sequence: (object["sequence"] as? NSNumber)?.intValue ?? 0,
                payload: object["payload"] as? [String: Any] ?? [:]
            )
        }
    }
}
