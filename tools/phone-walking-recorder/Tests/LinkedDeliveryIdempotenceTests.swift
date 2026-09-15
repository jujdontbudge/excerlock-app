import XCTest
@testable import PhoneWalkingRecorder

/// A repeated linked-session delivery must be idempotent and non-destructive:
/// the recorder rejects it with truthful durable-state wording instead of
/// constructing a writer that truncates the existing archive.
final class LinkedDeliveryIdempotenceTests: XCTestCase {
    private let sessionId = "123e4567-e89b-42d3-a456-426614174000"
    private let nonce = String(repeating: "ab", count: 32)

    private var sessionURL: URL {
        URL(string: "excerlock-walkingrecorder://linked-session?sessionId=\(sessionId)&nonce=\(nonce)&protocolVersion=1")!
    }

    private func temporaryDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("recorder-linked-delivery-\(UUID().uuidString)", isDirectory: true)
        try! FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    /// Every regular file in the archive root, by relative path, with bytes.
    private func snapshot(_ root: URL) throws -> [String: Data] {
        var result: [String: Data] = [:]
        let enumerator = FileManager.default.enumerator(at: root, includingPropertiesForKeys: [.isRegularFileKey])
        while let file = enumerator?.nextObject() as? URL {
            guard try file.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile == true else { continue }
            result[file.path.replacingOccurrences(of: root.path + "/", with: "")] = try Data(contentsOf: file)
        }
        return result
    }

    func testSessionWriterRefusesToTruncateAnExistingArchive() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = SystemCaptureClock()
        let first = try SessionWriter(
            baseURL: root,
            id: sessionId,
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock,
            linkedTraceRecovery: LinkedTraceRecovery(sessionId: sessionId, nonce: nonce)
        )
        try first.append(channel: .system, type: "session_start", payload: ["test": true], critical: true)
        _ = try first.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
        let before = try snapshot(root)

        XCTAssertThrowsError(try SessionWriter(
            baseURL: root,
            id: sessionId,
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock
        )) { error in
            XCTAssertEqual(error as? SessionWriterError, .sessionExists)
        }
        XCTAssertEqual(try snapshot(root), before)
    }

    @MainActor
    func testRepeatedDeliveryOfAnUnfinishedLinkedTestKeepsArchiveAndRecovery() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = SystemCaptureClock()
        var writer: SessionWriter? = try SessionWriter(
            baseURL: root,
            id: sessionId,
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock,
            linkedTraceRecovery: LinkedTraceRecovery(sessionId: sessionId, nonce: nonce)
        )
        try writer?.append(channel: .system, type: "session_start", payload: ["test": true], critical: true)
        try writer?.checkpoint(timeline: LabelTimeline(), gapCount: 0)
        writer = nil

        // First launch recovers and finalizes the interrupted archive but keeps
        // the protected linked recovery for Trace Lab.
        let repository = SessionRepository(baseURL: root)
        XCTAssertEqual(repository.sessions.first?.status, .interrupted)
        XCTAssertEqual(repository.pendingLinkedTraceRecoveries, [LinkedTraceRecovery(sessionId: sessionId, nonce: nonce)])
        let before = try snapshot(root)

        let controller = CaptureController(repository: SessionRepository(baseURL: root), clock: SystemCaptureClock())
        controller.handleIncomingLink(sessionURL)

        XCTAssertFalse(controller.isRecording)
        XCTAssertEqual(controller.mode, .idle)
        XCTAssertEqual(
            controller.notice,
            "This linked test is already recorded on this phone. Use the linked-test card above to finish it in Trace Lab."
        )
        XCTAssertEqual(controller.pendingLinkedTraceRecovery?.sessionId, sessionId)
        XCTAssertEqual(try snapshot(root), before)
    }

    @MainActor
    func testRepeatedDeliveryOfAnAlreadySavedLinkedTestChangesNothing() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let clock = SystemCaptureClock()
        // A saved archive whose linked recovery was already cleared (Trace Lab
        // finalized it) must still never be overwritten by a re-delivered link.
        let writer = try SessionWriter(
            baseURL: root,
            id: sessionId,
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock
        )
        try writer.append(channel: .system, type: "session_start", payload: ["test": true], critical: true)
        _ = try writer.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
        let before = try snapshot(root)

        let controller = CaptureController(repository: SessionRepository(baseURL: root), clock: SystemCaptureClock())
        controller.handleIncomingLink(sessionURL)

        XCTAssertFalse(controller.isRecording)
        XCTAssertEqual(controller.mode, .idle)
        XCTAssertNil(controller.pendingLinkedTraceRecovery)
        XCTAssertEqual(
            controller.notice,
            "This linked test already has a saved recording on this phone. Nothing new was started."
        )
        XCTAssertEqual(try snapshot(root), before)
    }

    @MainActor
    func testRepeatedDeliveryOfAPartialAttemptReportsThatNothingFinished() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        // A directory with neither a manifest nor a recovery checkpoint is not a
        // durable archive; the notice must not claim a saved recording exists.
        let directory = root.appendingPathComponent("\(sessionId).walkingcapture", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try Data("partial attempt".utf8).write(to: directory.appendingPathComponent("raw-motion.ndjson"))
        let before = try snapshot(root)

        let controller = CaptureController(repository: SessionRepository(baseURL: root), clock: SystemCaptureClock())
        controller.handleIncomingLink(sessionURL)

        XCTAssertFalse(controller.isRecording)
        XCTAssertEqual(controller.mode, .idle)
        XCTAssertEqual(
            controller.notice,
            "A previous attempt to record this test did not finish. Nothing was overwritten; start the test again in Trace Lab."
        )
        XCTAssertEqual(try snapshot(root), before)
    }
}
