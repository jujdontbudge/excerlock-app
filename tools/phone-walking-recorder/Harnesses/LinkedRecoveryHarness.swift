import Foundation

private final class LinkedRecoveryClock: CaptureClock {
    var stamp = CaptureStamp(
        monotonicNs: 1_000_000_000,
        wallTimeMs: 1_700_000_000_000,
        wallTimeISO8601: "2023-11-14T22:13:20Z"
    )
    func now() -> CaptureStamp { stamp }
}

@main
struct LinkedRecoveryHarness {
    static func main() throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent("walking-recorder-recovery-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: root) }
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)

        let nonce = String(repeating: "ab", count: 32)
        let interruptedId = UUID().uuidString.lowercased()
        do {
            let clock = LinkedRecoveryClock()
            let writer = try SessionWriter(
                baseURL: root,
                id: interruptedId,
                startedAt: clock.now(),
                metadata: ["schemaVersion": 1],
                clock: clock,
                linkedTraceRecovery: LinkedTraceRecovery(sessionId: interruptedId, nonce: nonce)
            )
            try writer.checkpoint(timeline: LabelTimeline(), gapCount: 0)
        }

        let repository = SessionRepository(baseURL: root)
        precondition(repository.sessions.first(where: { $0.id == interruptedId })?.status == .interrupted)
        precondition(repository.pendingLinkedTraceRecoveries.contains(LinkedTraceRecovery(sessionId: interruptedId, nonce: nonce)))
        let interrupted = repository.sessions.first { $0.id == interruptedId }!
        let archive = try repository.export(interrupted)
        let archiveBytes = try Data(contentsOf: archive)
        precondition(archiveBytes.range(of: Data(nonce.utf8)) == nil)
        precondition(!String(decoding: archiveBytes, as: UTF8.self).contains("recovery.json"))

        for terminal in [SessionCompletionStatus.storageLimit, .sensorError] {
            let id = UUID().uuidString.lowercased()
            let clock = LinkedRecoveryClock()
            let writer = try SessionWriter(
                baseURL: root,
                id: id,
                startedAt: clock.now(),
                metadata: ["schemaVersion": 1],
                clock: clock,
                linkedTraceRecovery: LinkedTraceRecovery(sessionId: id, nonce: nonce)
            )
            _ = try writer.finalize(status: terminal, timeline: LabelTimeline(), gapCount: 0)
        }
        repository.reload()
        precondition(repository.pendingLinkedTraceRecoveries.count == 3)
        try repository.clearLinkedTraceRecovery(sessionId: interruptedId)
        precondition(!repository.pendingLinkedTraceRecoveries.contains(where: { $0.sessionId == interruptedId }))

        // Actionable ordering: the newest unfinished test is surfaced first, an
        // already-finalized archive that only waits for Trace Lab follows, and
        // equal start stamps still order by session id instead of directory order.
        let orderRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("walking-recorder-recovery-order-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: orderRoot) }
        try FileManager.default.createDirectory(at: orderRoot, withIntermediateDirectories: true)
        func stamp(_ wallTimeMs: Int64) -> CaptureStamp {
            CaptureStamp(monotonicNs: UInt64(max(0, wallTimeMs)), wallTimeMs: wallTimeMs, wallTimeISO8601: "2023-11-14T22:13:20Z")
        }
        func recovery(_ id: String) -> LinkedTraceRecovery {
            LinkedTraceRecovery(sessionId: id, nonce: nonce)
        }
        let clock = LinkedRecoveryClock()
        let olderFinalizedId = UUID().uuidString.lowercased()
        let olderFinalized = try SessionWriter(
            baseURL: orderRoot, id: olderFinalizedId, startedAt: stamp(1_700_000_000_000),
            metadata: ["schemaVersion": 1], clock: clock, linkedTraceRecovery: recovery(olderFinalizedId)
        )
        _ = try olderFinalized.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
        let unfinishedId = UUID().uuidString.lowercased()
        let unfinished = try SessionWriter(
            baseURL: orderRoot, id: unfinishedId, startedAt: stamp(1_700_000_400_000),
            metadata: ["schemaVersion": 1], clock: clock, linkedTraceRecovery: recovery(unfinishedId)
        )
        try unfinished.checkpoint(timeline: LabelTimeline(), gapCount: 0)
        let newerFinalizedId = UUID().uuidString.lowercased()
        let newerFinalized = try SessionWriter(
            baseURL: orderRoot, id: newerFinalizedId, startedAt: stamp(1_700_000_800_000),
            metadata: ["schemaVersion": 1], clock: clock, linkedTraceRecovery: recovery(newerFinalizedId)
        )
        _ = try newerFinalized.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
        let ordered = SessionWriter.pendingLinkedTraceRecoveries(baseURL: orderRoot)
        precondition(
            ordered.map(\.sessionId) == [unfinishedId, newerFinalizedId, olderFinalizedId],
            "pending linked recoveries are not actionable-ordered: \(ordered.map(\.sessionId))"
        )

        let tieRoot = FileManager.default.temporaryDirectory
            .appendingPathComponent("walking-recorder-recovery-tie-\(UUID().uuidString)", isDirectory: true)
        defer { try? FileManager.default.removeItem(at: tieRoot) }
        try FileManager.default.createDirectory(at: tieRoot, withIntermediateDirectories: true)
        let tieIds = ["aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa", "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb"]
        for id in tieIds {
            let writer = try SessionWriter(
                baseURL: tieRoot, id: id, startedAt: stamp(1_700_000_000_000),
                metadata: ["schemaVersion": 1], clock: clock, linkedTraceRecovery: recovery(id)
            )
            _ = try writer.finalize(status: .completed, timeline: LabelTimeline(), gapCount: 0)
        }
        precondition(
            SessionWriter.pendingLinkedTraceRecoveries(baseURL: tieRoot).map(\.sessionId) == tieIds.reversed(),
            "equal start stamps did not order by session id"
        )

        print("Walking Recorder linked recovery harness passed")
    }
}
