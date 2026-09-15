import XCTest
@testable import PhoneWalkingRecorder

/// The recorder's reminder-removal path is not a "saved" dismissal: Trace Lab
/// may have saved the trace or cancelled the test there, and the protected
/// one-time link is only dropped after an explicit inline confirmation. The
/// recording archive always stays.
@MainActor
final class LinkedReminderRemovalTests: XCTestCase {
    private let sessionId = "123e4567-e89b-42d3-a456-426614174000"
    private let nonce = String(repeating: "ab", count: 32)

    private func temporaryDirectory() -> URL {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("recorder-reminder-removal-\(UUID().uuidString)", isDirectory: true)
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

    /// A linked session that was recorded and finalized on this phone, whose
    /// protected reminder still waits for Trace Lab.
    private func makeRecoverableArchive(root: URL) throws -> CaptureController {
        let clock = SystemCaptureClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: sessionId,
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock,
            linkedTraceRecovery: LinkedTraceRecovery(sessionId: sessionId, nonce: nonce)
        )
        try writer.append(channel: .system, type: "session_start", payload: ["test": true], critical: true)
        try writer.checkpoint(timeline: LabelTimeline(), gapCount: 0)
        return CaptureController(repository: SessionRepository(baseURL: root), clock: SystemCaptureClock())
    }

    func testRemovalCopyIsNeutralAndExplainsTheInlineConfirmation() {
        // The old "I already saved it in Trace Lab" dismissal was false after a
        // Trace Lab cancellation. The action is now a neutral reminder removal,
        // and the confirmation names both truthful outcomes.
        XCTAssertEqual(RecorderLinkedReminderCopy.removeAction, "Remove this reminder")
        XCTAssertFalse(RecorderLinkedReminderCopy.removeAction.localizedCaseInsensitiveContains("saved"))
        XCTAssertEqual(
            RecorderLinkedReminderCopy.removeConfirmation,
            "Remove this reminder only after Trace Lab has saved or cancelled the test. Your recording stays on this phone."
        )
        XCTAssertEqual(RecorderLinkedReminderCopy.confirmAction, "Remove reminder")
        XCTAssertEqual(RecorderLinkedReminderCopy.cancelAction, "Keep it")
    }

    func testRemovalRequiresConfirmationAndNeverTouchesTheArchive() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let controller = try makeRecoverableArchive(root: root)
        XCTAssertEqual(controller.pendingLinkedTraceRecovery?.sessionId, sessionId)
        XCTAssertFalse(controller.linkedReminderRemovalRequested)
        let before = try snapshot(root)

        // Asking for the confirmation changes no durable state at all.
        controller.requestLinkedReminderRemoval()
        XCTAssertTrue(controller.linkedReminderRemovalRequested)
        XCTAssertEqual(try snapshot(root), before)
        XCTAssertEqual(controller.pendingLinkedTraceRecovery?.sessionId, sessionId)

        // Without the confirmation the removal never happens.
        controller.cancelLinkedReminderRemoval()
        XCTAssertFalse(controller.linkedReminderRemovalRequested)
        controller.confirmLinkedReminderRemoval()
        XCTAssertEqual(try snapshot(root), before)
        XCTAssertEqual(controller.pendingLinkedTraceRecovery?.sessionId, sessionId)

        // Confirming removes only the protected reminder file.
        controller.requestLinkedReminderRemoval()
        controller.confirmLinkedReminderRemoval()
        XCTAssertFalse(controller.linkedReminderRemovalRequested)
        XCTAssertNil(controller.pendingLinkedTraceRecovery)
        let after = try snapshot(root)
        XCTAssertNil(after["\(sessionId).walkingcapture/recovery.json"])
        XCTAssertEqual(
            Set(before.keys).subtracting(after.keys),
            ["\(sessionId).walkingcapture/recovery.json"]
        )
        for (path, data) in after {
            XCTAssertEqual(data, before[path], "removing the reminder changed \(path)")
        }
        // The finished recording remains a saved session with its manifest and
        // streams, and the card can no longer offer removal.
        XCTAssertTrue(controller.repository.sessions.contains { $0.id == sessionId })
        XCTAssertNotNil(after["\(sessionId).walkingcapture/manifest.json"])
    }

    func testRemovalAfterTheReminderIsGoneIsAnIdempotentNoOp() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let controller = try makeRecoverableArchive(root: root)
        let before = try snapshot(root)
        controller.requestLinkedReminderRemoval()
        controller.confirmLinkedReminderRemoval()
        controller.confirmLinkedReminderRemoval()
        controller.requestLinkedReminderRemoval()

        XCTAssertFalse(controller.linkedReminderRemovalRequested)
        XCTAssertNil(controller.pendingLinkedTraceRecovery)
        XCTAssertNil(controller.notice)
        XCTAssertEqual(
            Set(before.keys).subtracting(try snapshot(root).keys),
            ["\(sessionId).walkingcapture/recovery.json"]
        )
    }
}
