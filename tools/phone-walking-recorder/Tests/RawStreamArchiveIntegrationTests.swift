import SwiftUI
import XCTest
@testable import PhoneWalkingRecorder

/// End-to-end evidence for the lab recorder's raw stream, driven through the
/// real `CaptureController` with a manual clock and a fake motion service.
///
/// These tests deliberately inspect the archive as plain JSON instead of the
/// new manifest types, so the same test bodies compile against the pre-fix
/// recorder and fail on its missing raw-coverage evidence.
@MainActor
final class RawStreamArchiveIntegrationTests: XCTestCase {
    private final class ManualClock: CaptureClock {
        var stamp = CaptureStamp(
            monotonicNs: 1_000_000_000,
            wallTimeMs: 1_700_000_000_000,
            wallTimeISO8601: "2023-11-14T22:13:20Z"
        )

        func now() -> CaptureStamp { stamp }

        func advance(seconds: Double) {
            let wallTimeMs = stamp.wallTimeMs + Int64((seconds * 1_000).rounded())
            stamp = CaptureStamp(
                monotonicNs: stamp.monotonicNs + UInt64((seconds * 1_000_000_000).rounded()),
                wallTimeMs: wallTimeMs,
                wallTimeISO8601: ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: Double(wallTimeMs) / 1_000))
            )
        }
    }

    private final class FakeMotionService: MotionCaptureServicing {
        weak var delegate: MotionCaptureServiceDelegate?
        var permissionValue: MotionPermission = .authorized
        var availabilityValue = SensorAvailability(
            activity: true,
            cadence: true,
            stepCounting: true,
            accelerometer: true,
            gyroscope: true,
            deviceMotion: true
        )
        private(set) var isStarted = false

        var permission: MotionPermission { permissionValue }
        var availability: SensorAvailability { availabilityValue }

        func requestLiveAuthorization(completion: @escaping (MotionPermission) -> Void) { completion(permissionValue) }
        func start() throws -> SensorAvailability { isStarted = true; return availabilityValue }
        func stop() { isStarted = false }
    }

    private var sourceSeconds = 0.0

    func testEverySessionModeWritesRawSamplesForItsWholeLabelWindow() async throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ManualClock()
        let motion = FakeMotionService()
        let repository = SessionRepository(baseURL: root)
        let controller = CaptureController(repository: repository, clock: clock, motionService: motion)

        for mode in GroundTruthScenario.allCases {
            controller.tapScenario(mode)
            try await deliver(seconds: 2.0, clock: clock, motion: motion)
        }
        controller.finishAndSave()
        await drain()

        let summary = try XCTUnwrap(repository.sessions.first)
        let directory = root.appendingPathComponent(summary.directoryName)
        let rawEvents = try readEvents(directory.appendingPathComponent("raw-motion.ndjson"))
        let labels = try readEvents(directory.appendingPathComponent("labels.ndjson"))
        let manifest = try readJSONObject(directory.appendingPathComponent("manifest.json"))
        let rawStream = try XCTUnwrap(manifest["rawStream"] as? [String: Any], "manifest must declare raw-stream coverage")

        // Every inertial stream ran at ~50 Hz for the whole 8 s session.
        let sampleCounts = try XCTUnwrap(rawStream["sampleCounts"] as? [String: Int])
        for stream in ["accelerometer", "gyroscope", "device_motion"] {
            XCTAssertEqual(sampleCounts[stream], 400, "\(stream) must be written at ~50 Hz for the whole session")
            let observed = try XCTUnwrap((rawStream["observed"] as? [String: Any])?[stream] as? [String: Any])
            let rate = try XCTUnwrap(observed["observedAverageDeliveryRateHz"] as? Double)
            XCTAssertEqual(rate, 50, accuracy: 2, "\(stream) must sustain a sane delivery rate")
        }

        // Each label mode has raw samples at a sane rate across its own window.
        let windows = try labelWindows(from: labels)
        XCTAssertEqual(windows.count, GroundTruthScenario.allCases.count)
        for (index, window) in windows.enumerated() {
            let scenario = GroundTruthScenario.allCases[index].rawValue
            XCTAssertEqual(window.scenario, scenario)
            let duration = Double(window.toMonotonicNs - window.fromMonotonicNs) / 1_000_000_000
            XCTAssertEqual(duration, 2.0, accuracy: 0.05)
            for stream in ["accelerometer", "gyroscope", "device_motion"] {
                let events = rawEvents.filter {
                    $0.type == "\(stream)_sample"
                        && $0.monotonicNs >= window.fromMonotonicNs
                        && $0.monotonicNs < window.toMonotonicNs
                }
                let rate = Double(events.count) / duration
                XCTAssertGreaterThanOrEqual(rate, 45, "\(stream) must cover the \(scenario) window at ~50 Hz")
            }
        }

        // The manifest states that coverage per window and calls it covered.
        XCTAssertEqual(rawStream["schemaVersion"] as? Int, 1)
        XCTAssertEqual(rawStream["suspensionThresholdSeconds"] as? Double, 2.0)
        XCTAssertEqual(rawStream["sampleCountBasis"] as? String, "exact")
        XCTAssertEqual((rawStream["firstSampleMonotonicNs"] as? NSNumber)?.uint64Value, rawEvents.first?.monotonicNs)
        XCTAssertEqual((rawStream["lastSampleMonotonicNs"] as? NSNumber)?.uint64Value, rawEvents.last?.monotonicNs)
        let manifestWindows = try XCTUnwrap(rawStream["labelWindows"] as? [[String: Any]])
        XCTAssertEqual(manifestWindows.count, windows.count)
        for (index, window) in manifestWindows.enumerated() {
            XCTAssertEqual(window["scenario"] as? String, GroundTruthScenario.allCases[index].rawValue)
            XCTAssertEqual(window["coverage"] as? String, "covered")
            XCTAssertGreaterThan(window["rawSampleCount"] as? Int ?? 0, 90)
            XCTAssertLessThanOrEqual(window["uncoveredSeconds"] as? Double ?? .infinity, 2.0)
            XCTAssertNotNil(window["fromReceiptWallTimeMs"] as? NSNumber)
            XCTAssertNotNil(window["toReceiptWallTimeMs"] as? NSNumber)
        }

        // A clean session carries no suspension marker anywhere.
        XCTAssertEqual(rawStream["suspensionCount"] as? Int, 0)
        XCTAssertEqual(rawStream["endedBeforeSessionEnd"] as? Bool, false)
        let system = try readEvents(directory.appendingPathComponent("system.ndjson"))
        XCTAssertTrue(system.filter { $0.type == "raw_stream_suspended" }.isEmpty)
        let coverageEvent = try XCTUnwrap(system.first { $0.type == "raw_stream_coverage" })
        XCTAssertEqual(coverageEvent.payload["suspensionCount"] as? Int, 0)
        XCTAssertEqual(coverageEvent.payload["endedBeforeSessionEnd"] as? Bool, false)
    }

    func testBackgroundSuspensionIsMarkedExactlyOverTheUndeliveredRange() async throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ManualClock()
        let motion = FakeMotionService()
        let repository = SessionRepository(baseURL: root)
        let controller = CaptureController(repository: repository, clock: clock, motionService: motion)

        controller.tapScenario(.normalWalking)
        let initialDelivery = try await deliver(seconds: 3.0, clock: clock, motion: motion)
        let lastDeliveredStamp = clock.now()

        // Screen lock/background: no lifecycle keep-alive, so delivery stops.
        controller.handleScenePhase(.background)
        clock.advance(seconds: 6.0)
        controller.handleScenePhase(.active)
        let resumedDelivery = try await deliver(seconds: 1.0, clock: clock, motion: motion)
        let resumedStamp = try XCTUnwrap(resumedDelivery.first)
        clock.advance(seconds: 0.5)
        controller.finishAndSave()
        await drain()

        let summary = try XCTUnwrap(repository.sessions.first)
        let directory = root.appendingPathComponent(summary.directoryName)
        let system = try readEvents(directory.appendingPathComponent("system.ndjson"))
        let suspensions = system.filter { $0.type == "raw_stream_suspended" }
        XCTAssertEqual(suspensions.count, 1, "exactly the suspended range may carry a marker")

        let suspension = try XCTUnwrap(suspensions.first)
        XCTAssertEqual((suspension.payload["fromReceiptMonotonicNs"] as? NSNumber)?.uint64Value, lastDeliveredStamp.monotonicNs)
        XCTAssertEqual((suspension.payload["toReceiptMonotonicNs"] as? NSNumber)?.uint64Value, resumedStamp.monotonicNs)
        let expectedSuspendedSeconds = Double(resumedStamp.monotonicNs - lastDeliveredStamp.monotonicNs) / 1_000_000_000
        XCTAssertEqual(suspension.payload["durationSeconds"] as? Double ?? 0, expectedSuspendedSeconds, accuracy: 0.001)
        XCTAssertEqual(suspension.payload["basis"] as? String, "app_lifecycle_raw_gap")
        XCTAssertEqual(suspension.payload["exactSuspensionTimeKnown"] as? Bool, false)
        XCTAssertEqual((suspension.payload["fromWallTimeMs"] as? NSNumber)?.int64Value, lastDeliveredStamp.wallTimeMs)

        let manifest = try readJSONObject(directory.appendingPathComponent("manifest.json"))
        let rawStream = try XCTUnwrap(manifest["rawStream"] as? [String: Any])
        let manifestSuspensions = try XCTUnwrap(rawStream["suspensions"] as? [[String: Any]])
        XCTAssertEqual(manifestSuspensions.count, 1)
        let declared = try XCTUnwrap(manifestSuspensions.first)
        XCTAssertEqual((declared["fromReceiptMonotonicNs"] as? NSNumber)?.uint64Value, lastDeliveredStamp.monotonicNs)
        XCTAssertEqual((declared["toReceiptMonotonicNs"] as? NSNumber)?.uint64Value, resumedStamp.monotonicNs)
        XCTAssertEqual((declared["fromReceiptWallTimeMs"] as? NSNumber)?.int64Value, lastDeliveredStamp.wallTimeMs)
        XCTAssertEqual((declared["toReceiptWallTimeMs"] as? NSNumber)?.int64Value, resumedStamp.wallTimeMs)
        XCTAssertEqual(declared["basis"] as? String, "app_lifecycle_raw_gap")
        XCTAssertEqual(rawStream["suspendedSeconds"] as? Double ?? 0, expectedSuspendedSeconds, accuracy: 0.001)

        let windows = try XCTUnwrap(rawStream["labelWindows"] as? [[String: Any]])
        XCTAssertEqual(windows.count, 1)
        XCTAssertEqual(windows[0]["coverage"] as? String, "partial")
        // The window's uncovered time is the suspension plus the ordinary edges
        // before the first and after the last delivered sample.
        let windowFrom = (windows[0]["fromReceiptMonotonicNs"] as? NSNumber)?.uint64Value ?? 0
        let windowTo = (windows[0]["toReceiptMonotonicNs"] as? NSNumber)?.uint64Value ?? 0
        let firstSample = try XCTUnwrap(initialDelivery.first)
        let lastSample = try XCTUnwrap(resumedDelivery.last)
        let headGap = Double(firstSample.monotonicNs - windowFrom) / 1_000_000_000
        let tailGap = Double(windowTo - lastSample.monotonicNs) / 1_000_000_000
        XCTAssertEqual(
            windows[0]["uncoveredSeconds"] as? Double ?? 0,
            expectedSuspendedSeconds + headGap + tailGap,
            accuracy: 0.01
        )
    }

    func testShortSceneChangeWithoutDeliveryLossIsNotASuspension() async throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = ManualClock()
        let motion = FakeMotionService()
        let repository = SessionRepository(baseURL: root)
        let controller = CaptureController(repository: repository, clock: clock, motionService: motion)

        controller.tapScenario(.normalWalking)
        try await deliver(seconds: 2.0, clock: clock, motion: motion)
        controller.handleScenePhase(.inactive)
        try await deliver(seconds: 1.0, clock: clock, motion: motion)
        controller.handleScenePhase(.active)
        try await deliver(seconds: 1.0, clock: clock, motion: motion)
        controller.finishAndSave()
        await drain()

        let summary = try XCTUnwrap(repository.sessions.first)
        let directory = root.appendingPathComponent(summary.directoryName)
        let system = try readEvents(directory.appendingPathComponent("system.ndjson"))
        XCTAssertTrue(system.filter { $0.type == "raw_stream_suspended" }.isEmpty)
        let manifest = try readJSONObject(directory.appendingPathComponent("manifest.json"))
        let rawStream = try XCTUnwrap(manifest["rawStream"] as? [String: Any])
        XCTAssertEqual(rawStream["suspensionCount"] as? Int, 0)
        XCTAssertEqual(rawStream["endedBeforeSessionEnd"] as? Bool, false)
        let windows = try XCTUnwrap(rawStream["labelWindows"] as? [[String: Any]])
        XCTAssertEqual(windows[0]["coverage"] as? String, "covered")
    }

    // MARK: - Helpers

    @discardableResult
    private func deliver(seconds: Double, clock: ManualClock, motion: FakeMotionService) async throws -> (first: CaptureStamp?, last: CaptureStamp?) {
        let ticks = Int((seconds / 0.02).rounded())
        var first: CaptureStamp?
        var last: CaptureStamp?
        for tick in 1...ticks {
            clock.advance(seconds: 0.02)
            let stamp = clock.now()
            if first == nil { first = stamp }
            last = stamp
            for stream in ["accelerometer", "gyroscope", "device_motion"] {
                sourceSeconds += 0.02
                motion.delegate?.motionCaptureDidReceiveInertial(
                    raw: ["stream": stream, "valid": true],
                    stream: stream,
                    sourceTimestampSeconds: sourceSeconds,
                    stamp: stamp
                )
            }
            if tick.isMultiple(of: 10) { await drain() }
        }
        await drain()
        return (first, last)
    }

    private func drain() async {
        await Task.yield()
        try? await Task.sleep(nanoseconds: 1_000_000)
        await Task.yield()
    }

    private func temporaryDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try! FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private struct RawEvent {
        let type: String
        let monotonicNs: UInt64
        let payload: [String: Any]
    }

    private func readEvents(_ url: URL) throws -> [RawEvent] {
        let text = try String(contentsOf: url, encoding: .utf8)
        return text.split(separator: "\n").compactMap { line in
            guard let object = try? JSONSerialization.jsonObject(with: Data(line.utf8)) as? [String: Any],
                  let type = object["type"] as? String else { return nil }
            return RawEvent(
                type: type,
                monotonicNs: (object["receiptMonotonicNs"] as? NSNumber)?.uint64Value ?? 0,
                payload: object["payload"] as? [String: Any] ?? [:]
            )
        }
    }

    private func readJSONObject(_ url: URL) throws -> [String: Any] {
        let data = try Data(contentsOf: url)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    private struct LabelWindow {
        let scenario: String
        let fromMonotonicNs: UInt64
        let toMonotonicNs: UInt64
    }

    /// Rebuilds the labeled windows from labels.ndjson: each boundary that
    /// starts a label opens a window, and the next boundary (or session end)
    /// closes it.
    private func labelWindows(from labels: [RawEvent]) throws -> [LabelWindow] {
        var windows: [LabelWindow] = []
        var open: (scenario: String, from: UInt64)?
        for event in labels where event.type == "label_transition" {
            if let open {
                windows.append(LabelWindow(scenario: open.scenario, fromMonotonicNs: open.from, toMonotonicNs: event.monotonicNs))
            }
            let toLabel = event.payload["toLabel"]
            if let scenario = toLabel as? String {
                open = (scenario, event.monotonicNs)
            } else {
                open = nil
            }
        }
        if let open, let last = labels.last {
            windows.append(LabelWindow(scenario: open.scenario, fromMonotonicNs: open.from, toMonotonicNs: last.monotonicNs))
        }
        return windows
    }
}
