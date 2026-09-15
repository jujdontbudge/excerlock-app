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

    /// A finalized linked archive with its own protected recovery still waiting,
    /// so a deletion attempt against it must be refused.
    private func writeRecoverableArchive(root: URL, id: String, startedAtWallTimeMs: Int64) throws {
        let clock = SystemCaptureClock()
        let writer = try SessionWriter(
            baseURL: root,
            id: id,
            startedAt: CaptureStamp(
                monotonicNs: UInt64(max(0, startedAtWallTimeMs)),
                wallTimeMs: startedAtWallTimeMs,
                wallTimeISO8601: "2023-11-14T22:13:20Z"
            ),
            metadata: ["schemaVersion": 1],
            clock: clock,
            linkedTraceRecovery: LinkedTraceRecovery(sessionId: id, nonce: nonce)
        )
        try writer.append(channel: .system, type: "session_start", payload: ["test": true], critical: true)
        _ = try writer.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
    }

    private func protectedNotice(_ id: String) -> String {
        "This archive still backs linked Trace Lab test \(String(id.prefix(8)))…. Finish that test in Trace Lab, then remove its protected reminder before deleting the archive."
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

    /// The card may not claim an outcome the recorder cannot observe: Trace Lab
    /// never reports whether it saved or cancelled, so the text must be usable
    /// after either and must never say the trace is still unsaved.
    func testReminderCardCopyNeverClaimsWhatTraceLabDid() {
        XCTAssertEqual(RecorderLinkedReminderCopy.cardTitle, "Linked test recorded here")
        XCTAssertEqual(RecorderLinkedReminderCopy.openAction, "Open Trace Lab")

        let headline = RecorderLinkedReminderCopy.headline(sessionIdPrefix: "123e4567")
        XCTAssertTrue(headline.hasPrefix("Test 123e4567… was recorded here."))
        XCTAssertTrue(headline.localizedCaseInsensitiveContains("does not report back"))
        XCTAssertTrue(headline.localizedCaseInsensitiveContains("saved or cancelled"))

        let cardCopy = [
            RecorderLinkedReminderCopy.cardTitle,
            headline,
            RecorderLinkedReminderCopy.detail,
            RecorderLinkedReminderCopy.openAction,
        ]
        for text in cardCopy {
            XCTAssertFalse(text.localizedCaseInsensitiveContains("has not saved"), text)
            XCTAssertFalse(text.localizedCaseInsensitiveContains("not saved"), text)
            XCTAssertFalse(text.localizedCaseInsensitiveContains("needs finishing"), text)
        }
        // The detail line still offers both truthful reasons to open Trace Lab.
        XCTAssertTrue(RecorderLinkedReminderCopy.detail.localizedCaseInsensitiveContains("save it or check it"))
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

    /// Every pending linked recovery protects its own archived recording, not
    /// only the one reminder the card can display at a time. An older
    /// undisplayed protection must survive a delete attempt, and each archive
    /// becomes deletable only after its own recovery is explicitly cleared.
    @MainActor
    func testEveryPendingRecoveryProtectsItsOwnArchiveNotOnlyTheDisplayedReminder() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let olderId = "11111111-1111-4111-8111-111111111111"
        let newerId = "22222222-2222-4222-8222-222222222222"
        try writeRecoverableArchive(root: root, id: olderId, startedAtWallTimeMs: 1_700_000_000_000)
        try writeRecoverableArchive(root: root, id: newerId, startedAtWallTimeMs: 1_700_000_600_000)
        let repository = SessionRepository(baseURL: root)
        let controller = CaptureController(repository: repository, clock: SystemCaptureClock())

        // The card can only show one reminder, and the newest test leads it.
        XCTAssertEqual(controller.pendingLinkedTraceRecovery?.sessionId, newerId)
        let older = try XCTUnwrap(repository.sessions.first { $0.id == olderId })
        let newer = try XCTUnwrap(repository.sessions.first { $0.id == newerId })
        let before = try snapshot(root)

        // The older, undisplayed recovery still protects its own archive.
        controller.delete(older)
        XCTAssertEqual(controller.notice, protectedNotice(olderId))
        XCTAssertEqual(try snapshot(root), before)
        XCTAssertTrue(controller.repository.sessions.contains { $0.id == olderId })

        // The displayed reminder's archive is protected the same way.
        controller.delete(newer)
        XCTAssertEqual(controller.notice, protectedNotice(newerId))
        XCTAssertEqual(try snapshot(root), before)

        // Clearing only the older test's own recovery makes only the older
        // archive deletable; the newer one stays protected.
        try repository.clearLinkedTraceRecovery(sessionId: olderId)
        controller.delete(older)
        let afterOlderDelete = try snapshot(root)
        XCTAssertFalse(afterOlderDelete.keys.contains("\(olderId).walkingcapture/manifest.json"))
        XCTAssertTrue(afterOlderDelete.keys.contains("\(newerId).walkingcapture/manifest.json"))
        XCTAssertEqual(repository.pendingLinkedTraceRecoveries.map(\.sessionId), [newerId])

        // The newer archive becomes deletable only after its own reminder is
        // explicitly cleared through the confirmation path.
        controller.requestLinkedReminderRemoval()
        controller.confirmLinkedReminderRemoval()
        XCTAssertNil(controller.pendingLinkedTraceRecovery)
        controller.delete(newer)
        XCTAssertFalse(try snapshot(root).keys.contains("\(newerId).walkingcapture/manifest.json"))
    }

    /// The archive store refuses a protected deletion itself, naming the
    /// specific test, so no caller can bypass the controller guard.
    @MainActor
    func testRepositoryRefusesToDeleteAnArchiveWithItsOwnPendingRecovery() throws {
        let root = temporaryDirectory()
        defer { try? FileManager.default.removeItem(at: root) }
        let protectedId = "33333333-3333-4333-8333-333333333333"
        let freeId = "44444444-4444-4444-8444-444444444444"
        try writeRecoverableArchive(root: root, id: protectedId, startedAtWallTimeMs: 1_700_000_000_000)
        // A second finalized archive without a linked recovery must stay
        // deletable, so the guard is specific and not a blanket refusal.
        let clock = SystemCaptureClock()
        let plain = try SessionWriter(
            baseURL: root,
            id: freeId,
            startedAt: clock.now(),
            metadata: ["schemaVersion": 1],
            clock: clock
        )
        try plain.append(channel: .system, type: "session_start", payload: ["test": true], critical: true)
        _ = try plain.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
        let repository = SessionRepository(baseURL: root)
        let protectedSession = try XCTUnwrap(repository.sessions.first { $0.id == protectedId })
        let freeSession = try XCTUnwrap(repository.sessions.first { $0.id == freeId })
        let before = try snapshot(root)

        XCTAssertThrowsError(try repository.delete(protectedSession)) { error in
            XCTAssertEqual(error as? SessionRepositoryError, .protectedLinkedRecovery(sessionId: protectedId))
            XCTAssertEqual(error.localizedDescription, protectedNotice(protectedId))
        }
        XCTAssertEqual(try snapshot(root), before)

        XCTAssertNoThrow(try repository.delete(freeSession))
        XCTAssertFalse(try snapshot(root).keys.contains("\(freeId).walkingcapture/manifest.json"))
        XCTAssertTrue(try snapshot(root).keys.contains("\(protectedId).walkingcapture/manifest.json"))

        try repository.clearLinkedTraceRecovery(sessionId: protectedId)
        XCTAssertNoThrow(try repository.delete(protectedSession))
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
