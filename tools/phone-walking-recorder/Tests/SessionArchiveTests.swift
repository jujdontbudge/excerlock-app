import XCTest
@testable import PhoneWalkingRecorder

private final class TestCaptureClock: CaptureClock {
    var stamp: CaptureStamp

    init(monotonicNs: UInt64 = 1_000_000_000, wallTimeMs: Int64 = 1_700_000_000_000) {
        stamp = CaptureStamp(monotonicNs: monotonicNs, wallTimeMs: wallTimeMs, wallTimeISO8601: "2023-11-14T22:13:20Z")
    }

    func now() -> CaptureStamp { stamp }
}

final class SessionArchiveTests: XCTestCase {
    func testLabelSwitchIsOneAtomicBoundaryWithoutOverlap() throws {
        var timeline = LabelTimeline()
        let first = CaptureStamp(monotonicNs: 1, wallTimeMs: 10, wallTimeISO8601: "a")
        let second = CaptureStamp(monotonicNs: 2, wallTimeMs: 11, wallTimeISO8601: "b")
        let third = CaptureStamp(monotonicNs: 3, wallTimeMs: 12, wallTimeISO8601: "c")

        let start = try XCTUnwrap(timeline.transition(to: .normalWalking, at: first, reason: "start"))
        XCTAssertNil(start.from)
        XCTAssertEqual(start.to, .normalWalking)

        let switchBoundary = try XCTUnwrap(timeline.transition(to: .seatedShaking, at: second, reason: "switch"))
        XCTAssertEqual(switchBoundary.from, .normalWalking)
        XCTAssertEqual(switchBoundary.to, .seatedShaking)
        XCTAssertEqual(switchBoundary.boundary, second)
        XCTAssertEqual(timeline.segmentCount, 2)

        let stop = try XCTUnwrap(timeline.transition(to: nil, at: third, reason: "stop"))
        XCTAssertEqual(stop.from, .seatedShaking)
        XCTAssertNil(stop.to)
        XCTAssertNil(timeline.active)
        XCTAssertNil(timeline.activeSince)
    }

    func testIncrementalStreamsSchemaAndExportRoundTrip() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = TestCaptureClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: "roundtrip",
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1, "test": true],
            clock: clock
        )
        try writer.append(channel: .raw, type: "device_motion_sample", payload: ["x": 1.25])
        clock.stamp = CaptureStamp(monotonicNs: 2_000_000_000, wallTimeMs: 1_700_000_001_000, wallTimeISO8601: "2023-11-14T22:13:21Z")
        try writer.append(
            channel: .labels,
            type: "label_transition",
            payload: ["fromLabel": NSNull(), "toLabel": "normal_walking"],
            critical: true
        )
        let summary = try writer.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
        XCTAssertEqual(summary.status, .completed)
        XCTAssertEqual(summary.eventCount, 3)

        let raw = try readLines(writer.directoryURL.appendingPathComponent("raw-motion.ndjson"))
        let labels = try readLines(writer.directoryURL.appendingPathComponent("labels.ndjson"))
        let system = try readLines(writer.directoryURL.appendingPathComponent("system.ndjson"))
        XCTAssertEqual(raw.count, 1)
        XCTAssertEqual(labels.count, 1)
        XCTAssertEqual(system.count, 1)
        XCTAssertEqual(raw[0]["sequence"] as? Int, 1)
        XCTAssertEqual(labels[0]["sequence"] as? Int, 2)
        XCTAssertEqual(system[0]["sequence"] as? Int, 3)
        XCTAssertEqual(labels[0]["receiptMonotonicNs"] as? Int, 2_000_000_000)
        XCTAssertTrue(FileManager.default.fileExists(atPath: writer.directoryURL.appendingPathComponent("schema.json").path))
        XCTAssertFalse(FileManager.default.fileExists(atPath: writer.directoryURL.appendingPathComponent("recovery.json").path))

        let repository = SessionRepository(baseURL: root)
        let loaded = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(loaded.id, "roundtrip")
        let archive = try repository.export(loaded)
        let archiveData = try Data(contentsOf: archive)
        XCTAssertEqual(Array(archiveData.prefix(4)), [0x50, 0x4B, 0x03, 0x04])
        let archiveText = String(decoding: archiveData, as: UTF8.self)
        for name in ["README.txt", "metadata.json", "schema.json", "raw-motion.ndjson", "labels.ndjson", "decisions.ndjson", "system.ndjson", "manifest.json"] {
            XCTAssertTrue(archiveText.contains(name), "missing \(name)")
        }
    }

    func testInterruptedSessionIsRecoveredWithoutInventingTerminationTime() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let startClock = TestCaptureClock()
        var timeline = LabelTimeline()
        _ = timeline.transition(to: .treadmillWalkingPhoneInHand, at: startClock.now(), reason: "start")
        var writer: SessionWriter? = try SessionWriter(
            baseURL: root,
            id: "interrupted",
            startedAt: startClock.now(),
            metadata: ["schemaVersion": 1],
            clock: startClock
        )
        try writer?.append(channel: .labels, type: "label_transition", payload: ["toLabel": "treadmill_walking_phone_in_hand"], critical: true)
        try writer?.checkpoint(timeline: timeline, gapCount: 1)
        writer = nil

        let recoveryClock = TestCaptureClock(monotonicNs: 9_000_000_000, wallTimeMs: 1_700_000_008_000)
        SessionWriter.recoverInterruptedSessions(baseURL: root, clock: recoveryClock)
        let repository = SessionRepository(baseURL: root)
        let summary = try XCTUnwrap(repository.sessions.first)
        XCTAssertEqual(summary.status, .interrupted)
        XCTAssertEqual(summary.segmentCount, 1)
        XCTAssertEqual(summary.gapCount, 1)
        let system = try readLines(root
            .appendingPathComponent("interrupted.walkingcapture")
            .appendingPathComponent("system.ndjson"))
        XCTAssertEqual(system.last?["type"] as? String, "interruption_recovered_on_launch")
        let payload = try XCTUnwrap(system.last?["payload"] as? [String: Any])
        XCTAssertTrue((payload["meaning"] as? String)?.contains("not the exact") == true)
    }

    func testLinkedRecoverySurvivesTerminationAndNeverEntersExport() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = TestCaptureClock()
        let sessionId = "123e4567-e89b-42d3-a456-426614174000"
        let nonce = String(repeating: "ab", count: 32)
        var writer: SessionWriter? = try SessionWriter(
            baseURL: root,
            id: sessionId,
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock,
            linkedTraceRecovery: LinkedTraceRecovery(sessionId: sessionId, nonce: nonce)
        )
        try writer?.checkpoint(timeline: LabelTimeline(), gapCount: 0)
        let recoveryURL = try XCTUnwrap(writer?.directoryURL.appendingPathComponent("recovery.json"))
        XCTAssertTrue(try String(contentsOf: recoveryURL, encoding: .utf8).contains(nonce))
        writer = nil

        let repository = SessionRepository(baseURL: root)
        XCTAssertEqual(repository.sessions.first?.status, .interrupted)
        XCTAssertEqual(repository.pendingLinkedTraceRecoveries, [LinkedTraceRecovery(sessionId: sessionId, nonce: nonce)])
        XCTAssertTrue(FileManager.default.fileExists(atPath: recoveryURL.path))

        let archive = try repository.export(try XCTUnwrap(repository.sessions.first))
        let archiveData = try Data(contentsOf: archive)
        let archiveText = String(decoding: archiveData, as: UTF8.self)
        XCTAssertFalse(archiveText.contains("recovery.json"))
        XCTAssertFalse(archiveText.contains(nonce))

        try repository.clearLinkedTraceRecovery(sessionId: sessionId)
        XCTAssertTrue(repository.pendingLinkedTraceRecoveries.isEmpty)
        XCTAssertFalse(FileManager.default.fileExists(atPath: recoveryURL.path))
    }

    func testFailureFinalizationRetainsLinkedRecoveryForStopAndExport() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let nonce = String(repeating: "cd", count: 32)
        for status in [SessionCompletionStatus.storageLimit, .sensorError] {
            let sessionId = UUID().uuidString.lowercased()
            let clock = TestCaptureClock()
            let writer = try SessionWriter(
                baseURL: root,
                id: sessionId,
                startedAt: clock.now(),
                metadata: ["schemaVersion": 1],
                clock: clock,
                linkedTraceRecovery: LinkedTraceRecovery(sessionId: sessionId, nonce: nonce)
            )
            _ = try writer.finalize(status: status, timeline: LabelTimeline(), gapCount: 0)
        }
        let repository = SessionRepository(baseURL: root)
        XCTAssertEqual(Set(repository.pendingLinkedTraceRecoveries.map(\.sessionId)).count, 2)
        XCTAssertEqual(Set(repository.sessions.map(\.status)), Set([.storageLimit, .sensorError]))
    }

    func testStorageLimitStopsBeforeUnboundedBufferGrowth() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = TestCaptureClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: "bounded",
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock,
            maxBytes: 256
        )
        XCTAssertThrowsError(try writer.append(channel: .raw, type: "oversized", payload: ["data": String(repeating: "x", count: 512)])) { error in
            XCTAssertEqual(error as? SessionWriterError, .storageLimit)
        }
        let summary = try writer.finalize(status: .storageLimit, timeline: LabelTimeline(), gapCount: 0)
        XCTAssertEqual(summary.status, .storageLimit)
    }

    func testReadinessRejectsPermissionUnsupportedSensorsAndLowStorage() {
        let full = SensorAvailability(activity: true, cadence: true, stepCounting: true, accelerometer: true, gyroscope: true, deviceMotion: true)
        XCTAssertEqual(CaptureReadiness.evaluate(permission: .notDetermined, availability: full, freeBytes: nil), .needsPermission)
        XCTAssertEqual(CaptureReadiness.evaluate(permission: .denied, availability: full, freeBytes: nil), .permissionDenied)
        let unsupported = SensorAvailability(activity: false, cadence: false, stepCounting: false, accelerometer: true, gyroscope: true, deviceMotion: true)
        XCTAssertEqual(
            CaptureReadiness.evaluate(permission: .authorized, availability: unsupported, freeBytes: nil),
            .unsupported(["activity classification", "cadence", "step count"])
        )
        XCTAssertEqual(CaptureReadiness.evaluate(permission: .authorized, availability: full, freeBytes: 10), .lowStorage)
        XCTAssertFalse(StoragePolicy.canStartSession(totalStoredBytes: 800 * 1_024 * 1_024, freeBytes: 1_000 * 1_024 * 1_024))
    }

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
}
