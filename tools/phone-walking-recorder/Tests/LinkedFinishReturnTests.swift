import XCTest
@testable import PhoneWalkingRecorder

/// Only the successful `finishAndSave` path may open Trace Lab's return link.
/// A write-failure stop must finalize and save the recording locally with an
/// error status and never open `linkedStopURL`, so Trace Lab cannot show a
/// false "test finished — save it" screen after a failed recording. The stub
/// capture service drives the linked lifecycle without real Core Motion.
@MainActor
final class LinkedFinishReturnTests: XCTestCase {
    private let sessionId = "723e4567-e89b-42d3-a456-426614174777"
    private let nonce = String(repeating: "cd", count: 32)

    private var sessionURL: URL {
        URL(string: "excerlock-walkingrecorder://linked-session?sessionId=\(sessionId)&nonce=\(nonce)&protocolVersion=1")!
    }

    private func temporaryDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("recorder-finish-return-\(UUID().uuidString)", isDirectory: true)
        try! FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private func systemStreamText(root: URL, sessionId: String) throws -> String {
        String(decoding: try Data(contentsOf: root.appendingPathComponent("\(sessionId).walkingcapture/system.ndjson")), as: UTF8.self)
    }

    /// Authorized, complete, deterministic capture service so the linked
    /// session starts and finishes in the test without touching real sensors.
    private final class StubMotionService: MotionCaptureServicing {
        weak var delegate: MotionCaptureServiceDelegate?
        let availability = SensorAvailability(
            activity: true, cadence: true, stepCounting: true,
            accelerometer: true, gyroscope: true, deviceMotion: true
        )
        let permission = MotionPermission.authorized
        private(set) var stopCount = 0

        func requestLiveAuthorization(completion: @escaping (MotionPermission) -> Void) { completion(permission) }
        func start() throws -> SensorAvailability { availability }
        func stop() { stopCount += 1 }

        /// Delivers one activity event whose payload cannot be encoded, so the
        /// controller's raw append fails exactly like a real sensor write
        /// failure and drives the error finish path.
        func emitUnencodableActivity(stamp: CaptureStamp) {
            delegate?.motionCaptureDidReceiveActivity(
                raw: ["unencodable": NSObject()],
                production: ProductionActivitySample(classes: [], confidence: "high", startedAtMs: 0, receivedAtMs: stamp.monotonicMs),
                stamp: stamp
            )
        }
    }

    /// A write failure during a linked recording finalizes and saves locally
    /// with the error status and never opens Trace Lab's return link or writes
    /// a "stop requested" event that would claim Trace Lab was notified.
    func testSensorErrorFinishSavesLocallyWithoutOpeningTraceLab() async throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let service = StubMotionService()
        let controller = CaptureController(
            repository: SessionRepository(baseURL: root),
            clock: SystemCaptureClock(),
            motionService: service
        )
        var opened: [URL] = []
        controller.openExternalLink = { opened.append($0) }

        controller.handleIncomingLink(sessionURL)
        XCTAssertTrue(controller.isRecording)
        XCTAssertEqual(controller.linkedSessionID, sessionId)

        service.emitUnencodableActivity(stamp: SystemCaptureClock().now())
        // The delivered event is handled on the main actor; yield until the
        // write failure has driven the finish path to completion.
        for _ in 0..<50 where controller.mode == .recording { await Task.yield() }

        XCTAssertNotEqual(controller.mode, .recording)
        XCTAssertEqual(controller.mode, .idle)
        XCTAssertEqual(service.stopCount, 1)
        let summary = try XCTUnwrap(controller.repository.sessions.first { $0.id == sessionId })
        XCTAssertEqual(summary.status, .sensorError)
        XCTAssertTrue(try systemStreamText(root: root, sessionId: sessionId).contains("clock_mapping"))
        XCTAssertFalse(try systemStreamText(root: root, sessionId: sessionId).contains("linked_trace_stop_requested"))
        XCTAssertTrue(opened.isEmpty, "an error finish must not open Trace Lab, opened \(opened)")
        // The failed-but-saved recording keeps its protected recovery so the
        // operator can still finish the test truthfully in Trace Lab.
        XCTAssertEqual(controller.pendingLinkedTraceRecovery?.sessionId, sessionId)
    }

    /// The successful finish path is unchanged: it saves, marks the archive
    /// completed, and opens the one Trace Lab return link built from the
    /// shared link contract.
    func testCompletedFinishOpensTheTraceLabReturnLinkExactlyOnce() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let service = StubMotionService()
        let controller = CaptureController(
            repository: SessionRepository(baseURL: root),
            clock: SystemCaptureClock(),
            motionService: service
        )
        var opened: [URL] = []
        controller.openExternalLink = { opened.append($0) }

        controller.handleIncomingLink(sessionURL)
        XCTAssertTrue(controller.isRecording)

        controller.finishAndSave()

        XCTAssertEqual(controller.mode, .idle)
        XCTAssertEqual(service.stopCount, 1)
        let summary = try XCTUnwrap(controller.repository.sessions.first { $0.id == sessionId })
        XCTAssertEqual(summary.status, .completed)
        XCTAssertTrue(try systemStreamText(root: root, sessionId: sessionId).contains("linked_trace_stop_requested"))
        XCTAssertEqual(opened.count, 1, "the completed finish must open the return link once, opened \(opened)")
        XCTAssertEqual(opened.first, try XCTUnwrap(RecorderLinkedLink.traceLab(sessionId: sessionId, nonce: nonce)))
    }
}
