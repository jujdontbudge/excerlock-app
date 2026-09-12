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

        print("Walking Recorder linked recovery harness passed")
    }
}
