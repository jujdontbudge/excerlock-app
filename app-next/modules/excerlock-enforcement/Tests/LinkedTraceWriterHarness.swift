#if EXCERLOCK_LINKED_RECORDER_TRACE
import Foundation

private final class MutableStamp: @unchecked Sendable {
  private let lock = NSLock()
  private var wallTimeMs: Int64
  init(_ wallTimeMs: Int64) { self.wallTimeMs = wallTimeMs }
  func advance(to value: Int64) { lock.lock(); wallTimeMs = value; lock.unlock() }
  func read() -> LinkedTraceStamp {
    lock.lock(); let value = wallTimeMs; lock.unlock()
    return LinkedTraceStamp(monotonicNs: UInt64(max(0, value)) * 1_000_000, wallTimeMs: value, wallTimeISO8601: "1970-01-01T00:00:00Z")
  }
}

@main
struct LinkedTraceWriterHarness {
  static func main() throws {
    let root = FileManager.default.temporaryDirectory
      .appendingPathComponent("linked-trace-writer-tests-\(UUID().uuidString)", isDirectory: true)
    defer { try? FileManager.default.removeItem(at: root) }
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    precondition(linkedTraceAppGroup != excerlockProductionAppGroup, "research config must never fall back to production storage")
    // A Trace Lab relaunch recovers an active trace with no lifecycle observers:
    // the first status read must reinstall them exactly once, and never for an
    // inactive or already-observed trace.
    precondition(LinkedTraceLifecyclePolicy.shouldInstallObservers(observerCount: 0, sessionActive: true))
    precondition(!LinkedTraceLifecyclePolicy.shouldInstallObservers(observerCount: 0, sessionActive: false))
    precondition(!LinkedTraceLifecyclePolicy.shouldInstallObservers(observerCount: 4, sessionActive: true))

    let sessionId = UUID().uuidString.lowercased()
    let nonce = String(repeating: "ab", count: 32)
    let writer = LinkedTraceWriter(containerURL: root, sessionLimitBytes: 1_000_000, totalLimitBytes: 2_000_000)
    let started = try writer.startSession(sessionId: sessionId, nonce: nonce)
    precondition(started.active && started.sessionId == sessionId)
    let firstSessionHash = writer.hashIdentifier("stable-local-id")
    let restarted = try writer.startSession(sessionId: sessionId, nonce: nonce)
    precondition(restarted == started)
    do {
      _ = try writer.startSession(sessionId: sessionId, nonce: String(repeating: "cd", count: 32))
      preconditionFailure("active session accepted a different nonce")
    } catch LinkedTraceError.invalidNonce {}
    precondition(!writer.record(producer: .hostJS, eventType: .clockAnchor, payload: ["token": "must_reject"]))
    precondition(!writer.record(producer: .hostJS, eventType: .clockAnchor,
                                payload: ["label": "arbitrary_error_text"]))
    precondition(!writer.record(producer: .hostNative, eventType: .motionCallbackNative,
                                payload: ["stream": "device_motion", "gravityX": 0.25, "bridgeAttempted": true]))
    precondition(writer.record(
      producer: .monitorExtension,
      eventType: .extensionCallback,
      payload: ["callback": "interval_started", "status": "received", "reason": "start_only",
                "monitorIdHash": "0123456789abcdef"]
    ))

    let writers = (0..<4).map { _ in
      LinkedTraceWriter(containerURL: root, sessionLimitBytes: 1_000_000, totalLimitBytes: 2_000_000)
    }
    let group = DispatchGroup()
    for concurrentWriter in writers {
      DispatchQueue.global().async(group: group) {
        for _ in 0..<100 {
          precondition(concurrentWriter.record(
            producer: .hostJS,
            eventType: .clockAnchor,
            payload: ["label": "session_started"]
          ))
        }
      }
    }
    group.wait()
    let export = try writer.stopSession(sessionId: sessionId, nonce: nonce)
    let data = try Data(contentsOf: export)
    let text = String(decoding: data, as: UTF8.self)
    precondition(!text.contains(nonce))
    let rows = try text.split(separator: "\n").map {
      try JSONSerialization.jsonObject(with: Data($0.utf8)) as! [String: Any]
    }
    let sequences = rows.compactMap { ($0["sequence"] as? NSNumber)?.uint64Value }.sorted()
    precondition(sequences == Array(1...UInt64(rows.count)))
    precondition(rows.filter { $0["eventType"] as? String == "clock_anchor" }.count == 400)
    precondition(rows.filter { $0["eventType"] as? String == "trace_start" }.count == 1)
    precondition(rows.filter { $0["eventType"] as? String == "trace_stop" }.count == 1)
    precondition(!writer.status().active)
    let finalizedTrace = root.appendingPathComponent("linked-trace/v1/\(sessionId)/production.ndjson")
    let finalizedBytes = try Data(contentsOf: finalizedTrace).count
    do {
      _ = try writer.startSession(sessionId: sessionId, nonce: nonce)
      preconditionFailure("restarting a finalized session overwrote its trace")
    } catch LinkedTraceError.sessionExists {}
    let retainedBytes = try Data(contentsOf: finalizedTrace).count
    precondition(retainedBytes == finalizedBytes)
    precondition(writer.status().sessionId == nil)

    // A finalized trace stays listable and re-exportable from the App Group, so
    // the operator can share it after a relaunch or after iOS purges the
    // temporary export copy. Deleting it is the only thing that removes it.
    let finalizedSessions = writer.finalizedSessions()
    precondition(finalizedSessions.contains { $0.sessionId == sessionId })
    precondition(finalizedSessions.first { $0.sessionId == sessionId }?.byteCount == Int64(finalizedBytes))
    try? FileManager.default.removeItem(at: export)
    let reExported = try writer.exportFinalizedSession(sessionId: sessionId)
    let reExportedBytes = try Data(contentsOf: reExported).count
    precondition(reExportedBytes == finalizedBytes)
    try writer.deleteSession(sessionId: sessionId)
    precondition(!writer.finalizedSessions().contains { $0.sessionId == sessionId })

    let limitedRoot = root.appendingPathComponent("limited", isDirectory: true)
    try FileManager.default.createDirectory(at: limitedRoot, withIntermediateDirectories: true)
    let limitedId = UUID().uuidString.lowercased()
    let limited = LinkedTraceWriter(containerURL: limitedRoot, sessionLimitBytes: 700, totalLimitBytes: 2_000)
    _ = try limited.startSession(sessionId: limitedId, nonce: nonce)
    precondition(limited.hashIdentifier("stable-local-id") != firstSessionHash)
    for _ in 0..<100 {
      _ = limited.record(producer: .hostJS, eventType: .clockAnchor,
                         payload: ["label": "session_started"])
    }
    precondition(limited.status().truncated)
    do {
      _ = try limited.exportFinalizedSession(sessionId: limitedId)
      preconditionFailure("an active session was exported before it was finalized")
    } catch LinkedTraceError.sessionMismatch {}
    let limitedExport = try limited.stopSession(sessionId: limitedId, nonce: nonce)
    let limitedRows = try String(contentsOf: limitedExport, encoding: .utf8).split(separator: "\n").map {
      try JSONSerialization.jsonObject(with: Data($0.utf8)) as! [String: Any]
    }
    let limitedTypes = limitedRows.compactMap { $0["eventType"] as? String }
    precondition(limitedTypes.contains("trace_truncated"))
    precondition(limitedTypes.last == "trace_stop")
    let limitedSequences = limitedRows.compactMap { ($0["sequence"] as? NSNumber)?.uint64Value }
    precondition(limitedSequences == Array(1...UInt64(limitedRows.count)), "truncation burned a sequence: \(limitedSequences)")

    let stamp = MutableStamp(10_000)
    let expiryRoot = root.appendingPathComponent("expiry", isDirectory: true)
    try FileManager.default.createDirectory(at: expiryRoot, withIntermediateDirectories: true)
    let expiryId = UUID().uuidString.lowercased()
    let expiryWriter = LinkedTraceWriter(containerURL: expiryRoot, stampProvider: { stamp.read() })
    _ = try expiryWriter.startSession(sessionId: expiryId, nonce: nonce)
    stamp.advance(to: 10_000 + linkedTraceSessionTTLMilliseconds + 1)
    precondition(!expiryWriter.status().active)
    precondition(!expiryWriter.record(producer: .hostJS, eventType: .clockAnchor,
                                      payload: ["label": "session_started"]))
    do {
      _ = try expiryWriter.stopSession(sessionId: expiryId, nonce: nonce)
      preconditionFailure("an expired session was finalized after the two-hour TTL")
    } catch LinkedTraceError.expired {}
    precondition(expiryWriter.finalizedSessions().isEmpty)
    do {
      try expiryWriter.deleteSession(sessionId: expiryId)
      preconditionFailure("generic deletion bypassed explicit expired-session abandon")
    } catch LinkedTraceError.sessionMismatch {}
    try expiryWriter.abandonExpiredSession(sessionId: expiryId)
    precondition(expiryWriter.status().sessionId == nil)
    let afterExpiryId = UUID().uuidString.lowercased()
    let afterExpiry = try expiryWriter.startSession(sessionId: afterExpiryId, nonce: nonce)
    precondition(afterExpiry.active)
    _ = try expiryWriter.stopSession(sessionId: afterExpiryId, nonce: nonce)

    let retentionRoot = root.appendingPathComponent("retention", isDirectory: true)
    let retentionTraceRoot = retentionRoot.appendingPathComponent("linked-trace/v1", isDirectory: true)
    try FileManager.default.createDirectory(at: retentionTraceRoot, withIntermediateDirectories: true)
    let retainedIds = [UUID().uuidString.lowercased(), UUID().uuidString.lowercased()]
    for (index, id) in retainedIds.enumerated() {
      let directory = retentionTraceRoot.appendingPathComponent(id, isDirectory: true)
      try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
      try Data(repeating: UInt8(index), count: 800).write(to: directory.appendingPathComponent("production.ndjson"))
      try FileManager.default.setAttributes([.modificationDate: Date(timeIntervalSince1970: Double(index + 1))], ofItemAtPath: directory.path)
    }
    let retentionId = UUID().uuidString.lowercased()
    let retentionWriter = LinkedTraceWriter(
      containerURL: retentionRoot,
      totalLimitBytes: 1_000,
      retentionMilliseconds: Int64.max
    )
    _ = try retentionWriter.startSession(sessionId: retentionId, nonce: nonce)
    precondition(retainedIds.filter { FileManager.default.fileExists(atPath: retentionTraceRoot.appendingPathComponent($0).path) }.count == 1)
    _ = retentionWriter.status()
    precondition(retainedIds.allSatisfy { !FileManager.default.fileExists(atPath: retentionTraceRoot.appendingPathComponent($0).path) })
    _ = try retentionWriter.stopSession(sessionId: retentionId, nonce: nonce)

    let dropRoot = root.appendingPathComponent("drop", isDirectory: true)
    try FileManager.default.createDirectory(at: dropRoot, withIntermediateDirectories: true)
    let dropId = UUID().uuidString.lowercased()
    let dropWriter = LinkedTraceWriter(containerURL: dropRoot, maxPendingEvents: 0)
    _ = try dropWriter.startSession(sessionId: dropId, nonce: nonce)
    for _ in 0..<3 {
      dropWriter.recordDeferred(producer: .hostJS, eventType: .clockAnchor,
                                payload: ["label": "session_started"])
    }
    precondition(dropWriter.record(producer: .hostJS, eventType: .clockAnchor,
                                   payload: ["label": "session_started"]))
    let dropExport = try dropWriter.stopSession(sessionId: dropId, nonce: nonce)
    let dropRows = try String(contentsOf: dropExport, encoding: .utf8).split(separator: "\n").map {
      try JSONSerialization.jsonObject(with: Data($0.utf8)) as! [String: Any]
    }
    let dropSummary = dropRows.first { $0["eventType"] as? String == "trace_drop_summary" }
    precondition(((dropSummary?["payload"] as? [String: Any])?["count"] as? NSNumber)?.intValue == 3)

    print("LinkedTraceWriter harness passed (\(rows.count) events)")
  }
}
#endif
