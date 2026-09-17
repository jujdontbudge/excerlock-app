import XCTest
@testable import PhoneGymRecorder

private final class ArchiveTestClock: CaptureClock {
    var stamp: CaptureStamp

    init(monotonicNs: UInt64 = 1_000_000_000, wallTimeMs: Int64 = 1_700_000_000_000) {
        stamp = CaptureStamp(monotonicNs: monotonicNs, wallTimeMs: wallTimeMs, wallTimeISO8601: "2023-11-14T22:13:20Z")
    }

    func now() -> CaptureStamp { stamp }
}

/// The `.gymcapture` archive itself: six channels, the two JSON side files the
/// validator refuses to work without, one shared sequence across every stream,
/// the zip round trip the phone offers for sharing, and the storage ceiling.
final class SessionArchiveTests: XCTestCase {
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

    func testEveryChannelGymAndSchemaAreWrittenWithOneSharedSequence() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ArchiveTestClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: "six-channels",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion, "scenarioId": "S02"],
            gyms: [[
                "id": "gym-primary",
                "name": "Home gym",
                "latitude": 40.741,
                "longitude": -73.989,
                "radiusMeters": 100,
                "setBy": "typed"
            ]],
            clock: clock
        )
        let writes: [(CaptureEventChannel, String)] = [
            (.system, "session_start"),
            (.labels, "scenario_declared"),
            (.observations, "excerlock_state_observed"),
            (.decisions, "production_gym_decision"),
            (.rawLocation, "landmark"),
            (.rawMotion, "landmark")
        ]
        for (channel, type) in writes {
            try writer.append(channel: channel, type: type, payload: ["marker": type])
            clock.stamp = CaptureStamp(
                monotonicNs: clock.stamp.monotonicNs + 1_000_000_000,
                wallTimeMs: clock.stamp.wallTimeMs + 1_000,
                wallTimeISO8601: "2023-11-14T22:13:21Z"
            )
        }

        for channel in CaptureEventChannel.allCases {
            // Events are buffered; the archive only has to hold them once the
            // writer flushes (checkpoint, critical event or finish).
            try writer.flush()
            let url = writer.directoryURL.appendingPathComponent(channel.rawValue)
            XCTAssertTrue(FileManager.default.fileExists(atPath: url.path), "missing \(channel.rawValue)")
            XCTAssertEqual(try readLines(url).count, 1, "\(channel.rawValue) should hold exactly one event")
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: writer.directoryURL.appendingPathComponent("gym.json").path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: writer.directoryURL.appendingPathComponent("schema.json").path))
        let gymJSON = try XCTUnwrap(
            JSONSerialization.jsonObject(
                with: Data(contentsOf: writer.directoryURL.appendingPathComponent("gym.json"))
            ) as? [String: Any]
        )
        let gyms = try XCTUnwrap(gymJSON["gyms"] as? [[String: Any]])
        XCTAssertEqual(gyms.first?["radiusMeters"] as? Int, 100)

        // One sequence across all six files, in write order, so a reader can
        // order the whole session without trusting six independent counters.
        try writer.flush()
        var sequences: [Int] = []
        for channel in CaptureEventChannel.allCases {
            let events = try readLines(writer.directoryURL.appendingPathComponent(channel.rawValue))
            sequences.append(contentsOf: events.compactMap { $0["sequence"] as? Int })
        }
        XCTAssertEqual(sequences.sorted(), Array(1...6))
    }

    func testManifestCarriesScenarioGymsWindowsAndReducerIntervals() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ArchiveTestClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: "manifest",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion, "scenarioId": "S05"],
            gyms: [["id": "gym-primary", "radiusMeters": 100]],
            clock: clock
        )
        var timeline = GymLabelTimeline()
        _ = timeline.transition(to: .inGym, at: clock.now(), reason: .sessionStart)
        clock.stamp = CaptureStamp(monotonicNs: 61_000_000_000, wallTimeMs: 1_700_000_060_000, wallTimeISO8601: "2023-11-14T22:14:20Z")
        _ = timeline.transition(to: .away, at: clock.now(), reason: .userTap)
        let windows = timeline.labelWindows(endedAt: clock.now(), suspensions: [], thresholdSeconds: locationSuspensionThresholdSeconds)
        let summary = try writer.finalize(
            status: .completed,
            timeline: timeline,
            gapCount: 0,
            streams: RawCoverageTracker().manifest(startedAt: clock.now(), endedAt: clock.now(), labelWindows: windows),
            scenarioId: "S05",
            gymIds: ["gym-primary"],
            reducerIntervals: [
                GymIntervalSummary(
                    id: "gym-primary:0",
                    regionId: "gym-primary",
                    enteredAtWallTimeMs: 1_000,
                    confirmedAtWallTimeMs: 31_000,
                    exitedAtWallTimeMs: 60_000
                )
            ]
        )
        XCTAssertEqual(summary.scenarioId, "S05")
        XCTAssertEqual(summary.gymIds, ["gym-primary"])
        XCTAssertEqual(summary.labelWindows.map(\.place), ["in_gym", "away"])
        XCTAssertEqual(summary.reducerIntervals.first?.confirmedAtWallTimeMs, 31_000)

        let manifest = try XCTUnwrap(
            JSONSerialization.jsonObject(
                with: Data(contentsOf: writer.directoryURL.appendingPathComponent("manifest.json"))
            ) as? [String: Any]
        )
        XCTAssertEqual(manifest["scenarioId"] as? String, "S05")
        XCTAssertEqual(manifest["gymIds"] as? [String], ["gym-primary"])
        XCTAssertNotNil(manifest["labelWindows"])
        XCTAssertNotNil(manifest["reducerIntervals"])
    }

    func testExportIsAZipThatCarriesEveryRequiredFileAndNeverRecoveryJSON() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ArchiveTestClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: "export",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion],
            gyms: [],
            clock: clock
        )
        try writer.append(channel: .rawLocation, type: "location_sample", payload: ["latitude": 1.0])
        try writer.flush()
        let summary = try writer.finalize(status: .completed, timeline: GymLabelTimeline(), gapCount: 0)
        let repository = SessionRepository(baseURL: root)
        let archive = try repository.export(try XCTUnwrap(repository.sessions.first ?? summary))
        XCTAssertEqual(archive.lastPathComponent, "gym-capture-export.zip")

        let data = try Data(contentsOf: archive)
        XCTAssertEqual(Array(data.prefix(4)), [0x50, 0x4B, 0x03, 0x04], "export must be a real zip")
        // The names live in the zip central directory as plain text; enough to
        // assert membership without a zip reader in the test target.
        let text = String(decoding: data, as: UTF8.self)
        for name in [
            "raw-location.ndjson", "raw-motion.ndjson", "labels.ndjson", "observations.ndjson",
            "decisions.ndjson", "system.ndjson", "gym.json", "metadata.json", "schema.json",
            "manifest.json", "README.txt"
        ] {
            XCTAssertTrue(text.contains(name), "export is missing \(name)")
        }
        XCTAssertFalse(text.contains("recovery.json"))
    }

    func testStorageLimitStopsBeforeUnboundedBufferGrowth() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ArchiveTestClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: "bounded",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion],
            gyms: [],
            clock: clock,
            maxBytes: 256
        )
        XCTAssertThrowsError(try writer.append(
            channel: .rawLocation,
            type: "oversized",
            payload: ["data": String(repeating: "x", count: 512)]
        )) { error in
            XCTAssertEqual(error as? SessionWriterError, .storageLimit)
        }
        let summary = try writer.finalize(status: .storageLimit, timeline: GymLabelTimeline(), gapCount: 0)
        XCTAssertEqual(summary.status, .storageLimit)
    }

    func testARepeatedSessionIdIsRefusedRatherThanOverwritten() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ArchiveTestClock()
        _ = try SessionWriter(
            baseURL: root,
            id: "same-id",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion],
            gyms: [],
            clock: clock
        )
        XCTAssertThrowsError(try SessionWriter(
            baseURL: root,
            id: "same-id",
            startedAt: clock.now(),
            metadata: ["schemaVersion": recorderSchemaVersion],
            gyms: [],
            clock: clock
        )) { error in
            XCTAssertEqual(error as? SessionWriterError, .sessionExists)
        }
    }
}
