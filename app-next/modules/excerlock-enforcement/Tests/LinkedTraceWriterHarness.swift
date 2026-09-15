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

    // One status read feeds reconciliation: the same active value that decides
    // whether observers install also builds the screen payload, so a status
    // poll never performs a second writer lock/prune read.
    var statusReads = 0
    var observerInstalls = 0
    let reconciledActive = LinkedTraceLifecyclePolicy.readStatusAndReconcile(
      observerCount: 0,
      readStatus: { () -> LinkedTraceStatus in
        statusReads += 1
        return LinkedTraceStatus(active: true, sessionId: "reconciled", expiresAtWallTimeMs: 1, truncated: false)
      },
      isActive: { $0.active },
      installObservers: { observerInstalls += 1 }
    )
    precondition(statusReads == 1, "an active status was read \(statusReads) times, not once")
    precondition(observerInstalls == 1, "an active status with no observers did not reconcile")
    precondition(reconciledActive.active)

    var inactiveReads = 0
    let reconciledInactive = LinkedTraceLifecyclePolicy.readStatusAndReconcile(
      observerCount: 0,
      readStatus: { () -> LinkedTraceStatus in
        inactiveReads += 1
        return LinkedTraceStatus(active: false, sessionId: nil, expiresAtWallTimeMs: nil, truncated: false)
      },
      isActive: { $0.active },
      installObservers: { observerInstalls += 1 }
    )
    precondition(inactiveReads == 1, "an inactive status was read \(inactiveReads) times, not once")
    precondition(observerInstalls == 1, "an inactive status installed observers")
    precondition(!reconciledInactive.active)

    let reconciledObserved = LinkedTraceLifecyclePolicy.readStatusAndReconcile(
      observerCount: 4,
      readStatus: { LinkedTraceStatus(active: true, sessionId: "reconciled", expiresAtWallTimeMs: 1, truncated: false) },
      isActive: { $0.active },
      installObservers: { observerInstalls += 1 }
    )
    precondition(observerInstalls == 1, "an already-observed active status reinstalled observers")
    precondition(reconciledObserved.active)

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

    // JavaScript numbers 0/1 arrive as NSNumber, and Foundation's bridging would
    // let `as? Bool` coerce them into false/true. The scalar decoder must
    // discriminate booleans by CF type identity first, so a real number is
    // always written as a number and a real boolean as a boolean.
    let bridgingRoot = root.appendingPathComponent("bridging", isDirectory: true)
    try FileManager.default.createDirectory(at: bridgingRoot, withIntermediateDirectories: true)
    let bridgingId = UUID().uuidString.lowercased()
    let bridgingWriter = LinkedTraceWriter(containerURL: bridgingRoot)
    _ = try bridgingWriter.startSession(sessionId: bridgingId, nonce: nonce)
    precondition(bridgingWriter.record(producer: .hostJS, eventType: .policyPublish, payload: [
      "layer": "js",
      "status": "attempt",
      "revision": NSNumber(value: 1),
      "policyGeneration": NSNumber(value: 0),
      "futureEnforcementEligible": false,
    ]))
    precondition(bridgingWriter.record(producer: .hostJS, eventType: .policyPublish, payload: [
      "layer": "js",
      "status": "attempt",
      "revision": 1,
      "eligibleUntilWallMs": NSNumber(value: 1.5),
      "futureEnforcementEligible": true,
    ]))
    let bridgingExport = try bridgingWriter.stopSession(sessionId: bridgingId, nonce: nonce)
    let bridgingRows = try String(contentsOf: bridgingExport, encoding: .utf8).split(separator: "\n").map {
      try JSONSerialization.jsonObject(with: Data($0.utf8)) as! [String: Any]
    }
    let policyRows = bridgingRows.filter { $0["eventType"] as? String == "policy_publish" }
    precondition(policyRows.count == 2)
    let firstPayload = policyRows[0]["payload"] as! [String: Any]
    let secondPayload = policyRows[1]["payload"] as! [String: Any]
    func isFoundationNumber(_ value: Any?) -> Bool {
      guard let value else { return false }
      return CFGetTypeID(value as CFTypeRef) == CFNumberGetTypeID()
    }
    func isFoundationBoolean(_ value: Any?) -> Bool {
      guard let value else { return false }
      return CFGetTypeID(value as CFTypeRef) == CFBooleanGetTypeID()
    }
    precondition(isFoundationNumber(firstPayload["revision"]) && (firstPayload["revision"] as? NSNumber)?.int64Value == 1)
    precondition(isFoundationNumber(firstPayload["policyGeneration"]) && (firstPayload["policyGeneration"] as? NSNumber)?.int64Value == 0)
    precondition(isFoundationBoolean(firstPayload["futureEnforcementEligible"])
      && (firstPayload["futureEnforcementEligible"] as? NSNumber)?.boolValue == false)
    precondition(isFoundationNumber(secondPayload["revision"]) && (secondPayload["revision"] as? NSNumber)?.int64Value == 1)
    precondition(isFoundationNumber(secondPayload["eligibleUntilWallMs"])
      && (secondPayload["eligibleUntilWallMs"] as? NSNumber)?.doubleValue == 1.5)
    precondition(isFoundationBoolean(secondPayload["futureEnforcementEligible"])
      && (secondPayload["futureEnforcementEligible"] as? NSNumber)?.boolValue == true)

    // Cancelling an active test stops tracing and records abandonment, never
    // finalization: the trace can never be listed or exported afterwards.
    let cancelRoot = root.appendingPathComponent("cancel", isDirectory: true)
    try FileManager.default.createDirectory(at: cancelRoot, withIntermediateDirectories: true)
    let cancelId = UUID().uuidString.lowercased()
    let cancelWriter = LinkedTraceWriter(containerURL: cancelRoot)
    _ = try cancelWriter.startSession(sessionId: cancelId, nonce: nonce)
    precondition(cancelWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
    try cancelWriter.cancelActiveSession(sessionId: cancelId)
    precondition(!cancelWriter.status().active && cancelWriter.status().sessionId == nil)
    precondition(cancelWriter.finalizedSessions().isEmpty)
    do {
      _ = try cancelWriter.exportFinalizedSession(sessionId: cancelId)
      preconditionFailure("a cancelled session was exported")
    } catch LinkedTraceError.inactive {}
    let cancelledDirectory = cancelRoot.appendingPathComponent("linked-trace/v1/\(cancelId)", isDirectory: true)
    let abandonedData = try Data(contentsOf: cancelledDirectory.appendingPathComponent("abandoned-v1.json"))
    let abandonedJSON = try JSONSerialization.jsonObject(with: abandonedData) as! [String: Any]
    precondition(abandonedJSON["reason"] as? String == "cancelled")
    precondition(abandonedJSON["sessionId"] as? String == cancelId)
    // The void test keeps no measurement data: only the abandonment record
    // survives until retention pruning removes the directory.
    precondition(!FileManager.default.fileExists(atPath: cancelledDirectory.appendingPathComponent("production.ndjson").path))
    // A retried cancel after the durable transition is idempotent success, and
    // it never claims a session that was never abandoned.
    try cancelWriter.cancelActiveSession(sessionId: cancelId)
    do {
      try cancelWriter.cancelActiveSession(sessionId: UUID().uuidString.lowercased())
      preconditionFailure("an unknown session was reported as abandoned")
    } catch LinkedTraceError.inactive {}
    try cancelWriter.deleteSession(sessionId: cancelId)
    precondition(!FileManager.default.fileExists(atPath: cancelledDirectory.path))

    // Abandonment crash points. The durable marker is the authoritative
    // transition; the payload deletion and descriptor removal after it are
    // idempotent cleanup. Each case recreates exactly what a process that died
    // at that step leaves behind, then proves the next writer call finishes the
    // same transition: the session can never look active, resumable,
    // appendable, listable, or exportable again.
    enum AbandonCrashPoint: String, CaseIterable {
      case markerWritten
      case payloadRemoved
      case descriptorRemoved
    }
    func seedCrashPoint(_ crashPoint: AbandonCrashPoint) throws -> (root: URL, sessionId: String) {
      let crashRoot = root.appendingPathComponent("abandon-crash-\(crashPoint.rawValue)", isDirectory: true)
      try FileManager.default.createDirectory(at: crashRoot, withIntermediateDirectories: true)
      let crashId = UUID().uuidString.lowercased()
      let crashWriter = LinkedTraceWriter(containerURL: crashRoot)
      _ = try crashWriter.startSession(sessionId: crashId, nonce: nonce)
      precondition(crashWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
      let directory = crashRoot.appendingPathComponent("linked-trace/v1/\(crashId)", isDirectory: true)
      try Data("{}".utf8).write(to: directory.appendingPathComponent("abandoned-v1.json"))
      if crashPoint != .markerWritten {
        try FileManager.default.removeItem(at: directory.appendingPathComponent("production.ndjson"))
        try FileManager.default.removeItem(at: directory.appendingPathComponent("sequence-v1.txt"))
      }
      if crashPoint == .descriptorRemoved {
        try FileManager.default.removeItem(at: crashRoot.appendingPathComponent("linked-trace-active-v1.json"))
      }
      return (crashRoot, crashId)
    }
    for crashPoint in AbandonCrashPoint.allCases {
      let seeded = try seedCrashPoint(crashPoint)
      let crashWriter = LinkedTraceWriter(containerURL: seeded.root)
      let directory = seeded.root.appendingPathComponent("linked-trace/v1/\(seeded.sessionId)", isDirectory: true)
      let trace = directory.appendingPathComponent("production.ndjson")
      let descriptor = seeded.root.appendingPathComponent("linked-trace-active-v1.json")

      // A later append must never recreate the payload of an abandoned session.
      precondition(!crashWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
      precondition(!FileManager.default.fileExists(atPath: trace.path))

      // Status reports the session as inactive and abandoned, never running.
      let crashStatus = crashWriter.status()
      precondition(!crashStatus.active && crashStatus.sessionId == nil)
      precondition(!FileManager.default.fileExists(atPath: descriptor.path))

      // A relaunch cannot resume it, finalize it, list it, or export it.
      do {
        _ = try crashWriter.startSession(sessionId: seeded.sessionId, nonce: nonce)
        preconditionFailure("an abandoned session was resumed")
      } catch LinkedTraceError.sessionExists {}
      do {
        _ = try crashWriter.stopSession(sessionId: seeded.sessionId, nonce: nonce)
        preconditionFailure("an abandoned session was finalized")
      } catch LinkedTraceError.inactive {}
      precondition(!FileManager.default.fileExists(atPath: directory.appendingPathComponent("finalized-v1.json").path))
      precondition(crashWriter.finalizedSessions().isEmpty)
      do {
        _ = try crashWriter.exportFinalizedSession(sessionId: seeded.sessionId)
        preconditionFailure("an abandoned session was exported")
      } catch LinkedTraceError.inactive {}

      // A retried cancel at any crash point is idempotent success, and the
      // abandonment record itself survives as the truthful local state.
      try crashWriter.cancelActiveSession(sessionId: seeded.sessionId)
      try crashWriter.cancelActiveSession(sessionId: seeded.sessionId)
      precondition(crashWriter.status().sessionId == nil)
      precondition(FileManager.default.fileExists(atPath: directory.appendingPathComponent("abandoned-v1.json").path))

      // A clean session still starts afterwards, and a stale retry of the old
      // abandonment must never delete the new session's descriptor.
      let successorId = UUID().uuidString.lowercased()
      let successor = try crashWriter.startSession(sessionId: successorId, nonce: nonce)
      precondition(successor.active && successor.sessionId == successorId)
      precondition(crashWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
      try crashWriter.cancelActiveSession(sessionId: seeded.sessionId)
      precondition(crashWriter.status().active && crashWriter.status().sessionId == successorId)
      _ = try crashWriter.stopSession(sessionId: successorId, nonce: nonce)
      let savedIds = crashWriter.finalizedSessions().map(\.sessionId)
      precondition(savedIds.contains(successorId) && !savedIds.contains(seeded.sessionId))
    }

    // A real partial abandonment produced by the writer itself, not a
    // hand-built state: with the container directory unwritable, the payload
    // cleanup succeeds and removing the descriptor fails, which is exactly
    // what a crash between those two steps leaves behind. Restoring the
    // container and consulting the writer must finish the same abandonment and
    // still refuse to resurrect, resume, or export the session.
    let faultRoot = root.appendingPathComponent("abandon-unwritable", isDirectory: true)
    try FileManager.default.createDirectory(at: faultRoot, withIntermediateDirectories: true)
    let faultId = UUID().uuidString.lowercased()
    let faultWriter = LinkedTraceWriter(containerURL: faultRoot)
    _ = try faultWriter.startSession(sessionId: faultId, nonce: nonce)
    precondition(faultWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
    let faultDirectory = faultRoot.appendingPathComponent("linked-trace/v1/\(faultId)", isDirectory: true)
    let faultDescriptor = faultRoot.appendingPathComponent("linked-trace-active-v1.json")
    try FileManager.default.setAttributes([.posixPermissions: 0o555], ofItemAtPath: faultRoot.path)
    var faultFailed = false
    do { try faultWriter.cancelActiveSession(sessionId: faultId) } catch { faultFailed = true }
    try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: faultRoot.path)
    precondition(faultFailed, "descriptor removal unexpectedly succeeded on an unwritable container")
    precondition(FileManager.default.fileExists(atPath: faultDirectory.appendingPathComponent("abandoned-v1.json").path))
    precondition(FileManager.default.fileExists(atPath: faultDescriptor.path))
    precondition(!FileManager.default.fileExists(atPath: faultDirectory.appendingPathComponent("production.ndjson").path))
    // The next writer call finishes the interrupted transition: no payload is
    // recreated and the session is inactive, unlistable, and unexportable.
    precondition(!faultWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
    precondition(!FileManager.default.fileExists(atPath: faultDirectory.appendingPathComponent("production.ndjson").path))
    let faultStatus = faultWriter.status()
    precondition(!faultStatus.active && faultStatus.sessionId == nil)
    precondition(!FileManager.default.fileExists(atPath: faultDescriptor.path))
    precondition(faultWriter.finalizedSessions().isEmpty)
    do {
      _ = try faultWriter.exportFinalizedSession(sessionId: faultId)
      preconditionFailure("an interrupted abandonment was exported")
    } catch LinkedTraceError.inactive {}
    try faultWriter.cancelActiveSession(sessionId: faultId)

    // The same recovery must happen when a fresh start is the first thing a
    // relaunched Trace Lab does, with no status read before it.
    let relaunchRoot = root.appendingPathComponent("abandon-relaunch", isDirectory: true)
    try FileManager.default.createDirectory(at: relaunchRoot, withIntermediateDirectories: true)
    let abandonedId = UUID().uuidString.lowercased()
    let abandonedWriter = LinkedTraceWriter(containerURL: relaunchRoot)
    _ = try abandonedWriter.startSession(sessionId: abandonedId, nonce: nonce)
    precondition(abandonedWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
    let abandonedDirectory = relaunchRoot.appendingPathComponent("linked-trace/v1/\(abandonedId)", isDirectory: true)
    try Data("{}".utf8).write(to: abandonedDirectory.appendingPathComponent("abandoned-v1.json"))
    let freshId = UUID().uuidString.lowercased()
    let freshWriter = LinkedTraceWriter(containerURL: relaunchRoot)
    _ = try freshWriter.startSession(sessionId: freshId, nonce: nonce)
    precondition(freshWriter.status().sessionId == freshId)
    precondition(!FileManager.default.fileExists(atPath: abandonedDirectory.appendingPathComponent("production.ndjson").path))
    precondition(FileManager.default.fileExists(atPath: relaunchRoot.appendingPathComponent("linked-trace-active-v1.json").path))
    _ = try freshWriter.stopSession(sessionId: freshId, nonce: nonce)
    let relaunchSaved = freshWriter.finalizedSessions().map(\.sessionId)
    precondition(relaunchSaved.contains(freshId) && !relaunchSaved.contains(abandonedId))

    // Finalization crash points. The finalized marker is the authoritative
    // transition exactly like the abandonment marker: whatever step the process
    // died at, every later writer call finishes the same finalization and
    // reports a saved test that can never be resumed, appended to, or cancelled.
    // `.markerWritten` recreates a death between the marker and the stop event;
    // `.completed` is a real completed finalization (marker + stop, descriptor
    // already gone); the fault-injection case below covers marker + stop with
    // the descriptor still present.
    enum FinalizeCrashPoint: String, CaseIterable {
      case markerWritten
      case completed
    }
    func seedFinalizeCrashPoint(_ crashPoint: FinalizeCrashPoint) throws -> (root: URL, sessionId: String) {
      let crashRoot = root.appendingPathComponent("finalize-crash-\(crashPoint.rawValue)", isDirectory: true)
      try FileManager.default.createDirectory(at: crashRoot, withIntermediateDirectories: true)
      let crashId = UUID().uuidString.lowercased()
      let crashWriter = LinkedTraceWriter(containerURL: crashRoot)
      _ = try crashWriter.startSession(sessionId: crashId, nonce: nonce)
      precondition(crashWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
      if crashPoint == .completed {
        _ = try crashWriter.stopSession(sessionId: crashId, nonce: nonce)
        return (crashRoot, crashId)
      }
      let directory = crashRoot.appendingPathComponent("linked-trace/v1/\(crashId)", isDirectory: true)
      let marker: [String: Any] = [
        "protocolVersion": linkedTraceProtocolVersion,
        "sessionId": crashId,
        "finalizedAtWallTimeMs": 1_000,
      ]
      try JSONSerialization.data(withJSONObject: marker)
        .write(to: directory.appendingPathComponent("finalized-v1.json"))
      return (crashRoot, crashId)
    }
    for crashPoint in FinalizeCrashPoint.allCases {
      let seeded = try seedFinalizeCrashPoint(crashPoint)
      let crashWriter = LinkedTraceWriter(containerURL: seeded.root)
      let directory = seeded.root.appendingPathComponent("linked-trace/v1/\(seeded.sessionId)", isDirectory: true)
      let trace = directory.appendingPathComponent("production.ndjson")
      let descriptor = seeded.root.appendingPathComponent("linked-trace-active-v1.json")
      let preRecoveryBytes = try Data(contentsOf: trace).count

      // The next writer call completes the interrupted finalization: the session
      // is reported saved, the stale descriptor is gone, and the payload is kept.
      let crashStatus = crashWriter.status()
      precondition(!crashStatus.active && crashStatus.sessionId == nil)
      precondition(!FileManager.default.fileExists(atPath: descriptor.path))
      precondition(FileManager.default.fileExists(atPath: trace.path))

      // A later append must never extend a finalized trace.
      let recoveredBytes = try Data(contentsOf: trace).count
      precondition(!crashWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
      let afterAppendRefusalBytes = try Data(contentsOf: trace).count
      precondition(afterAppendRefusalBytes == recoveredBytes)

      // A relaunch cannot resume it, and cancelling it is refused without
      // deleting the saved trace: the finalized marker wins over every cancel.
      do {
        _ = try crashWriter.startSession(sessionId: seeded.sessionId, nonce: nonce)
        preconditionFailure("a finalized session was resumed")
      } catch LinkedTraceError.sessionExists {}
      do {
        try crashWriter.cancelActiveSession(sessionId: seeded.sessionId)
        preconditionFailure("a finalized session was cancelled")
      } catch LinkedTraceError.inactive {}
      do {
        try crashWriter.abandonExpiredSession(sessionId: seeded.sessionId)
        preconditionFailure("a finalized session was abandoned as expired")
      } catch LinkedTraceError.inactive {}
      precondition(FileManager.default.fileExists(atPath: trace.path))
      precondition(!FileManager.default.fileExists(atPath: directory.appendingPathComponent("abandoned-v1.json").path))
      precondition(crashWriter.finalizedSessions().map(\.sessionId) == [seeded.sessionId])

      // The saved trace stays listable, re-exportable, and self-describing:
      // exactly one stop event, and it is the last line even when the crash
      // landed before the stop event was written.
      let savedSession = crashWriter.finalizedSessions().first { $0.sessionId == seeded.sessionId }
      precondition(savedSession?.byteCount == Int64(recoveredBytes))
      let exportURL = try crashWriter.exportFinalizedSession(sessionId: seeded.sessionId)
      let exportedRows = try String(contentsOf: exportURL, encoding: .utf8).split(separator: "\n").map {
        try JSONSerialization.jsonObject(with: Data($0.utf8)) as! [String: Any]
      }
      precondition(exportedRows.filter { $0["eventType"] as? String == "trace_stop" }.count == 1)
      precondition(exportedRows.last?["eventType"] as? String == "trace_stop")
      precondition(preRecoveryBytes <= recoveredBytes)

      // A retried save of the same finalized session is idempotent: it returns
      // the same truth instead of a duplicate stop event.
      let exportedBytes = try Data(contentsOf: exportURL)
      let retriedExport = try crashWriter.stopSession(sessionId: seeded.sessionId, nonce: nonce)
      let retriedBytes = try Data(contentsOf: retriedExport)
      precondition(retriedBytes == exportedBytes)
      let retriedRows = try String(contentsOf: retriedExport, encoding: .utf8).split(separator: "\n").filter {
        $0.contains("trace_stop")
      }
      precondition(retriedRows.count == 1)

      // Deleting the saved trace is still the operator's explicit action.
      try crashWriter.deleteSession(sessionId: seeded.sessionId)
      precondition(!FileManager.default.fileExists(atPath: directory.path))
      precondition(crashWriter.finalizedSessions().isEmpty)
    }

    // A real partial finalization produced by the writer itself, not a
    // hand-built state: with the container directory unwritable, the marker and
    // the stop event are written and removing the descriptor fails, which is
    // exactly what a crash between those two steps leaves behind. Restoring the
    // container and consulting the writer must finish the same finalization,
    // keep every byte of the trace, never append a second stop event, refuse a
    // cancel, and still export the saved trace.
    let finalizeFaultRoot = root.appendingPathComponent("finalize-unwritable", isDirectory: true)
    try FileManager.default.createDirectory(at: finalizeFaultRoot, withIntermediateDirectories: true)
    let finalizeFaultId = UUID().uuidString.lowercased()
    let finalizeFaultWriter = LinkedTraceWriter(containerURL: finalizeFaultRoot)
    _ = try finalizeFaultWriter.startSession(sessionId: finalizeFaultId, nonce: nonce)
    precondition(finalizeFaultWriter.record(producer: .hostJS, eventType: .clockAnchor, payload: ["label": "session_started"]))
    let finalizeFaultDirectory = finalizeFaultRoot.appendingPathComponent("linked-trace/v1/\(finalizeFaultId)", isDirectory: true)
    let finalizeFaultDescriptor = finalizeFaultRoot.appendingPathComponent("linked-trace-active-v1.json")
    try FileManager.default.setAttributes([.posixPermissions: 0o555], ofItemAtPath: finalizeFaultRoot.path)
    var finalizeFaultFailed = false
    do { _ = try finalizeFaultWriter.stopSession(sessionId: finalizeFaultId, nonce: nonce) } catch { finalizeFaultFailed = true }
    try FileManager.default.setAttributes([.posixPermissions: 0o755], ofItemAtPath: finalizeFaultRoot.path)
    precondition(finalizeFaultFailed, "descriptor removal unexpectedly succeeded on an unwritable container")
    precondition(FileManager.default.fileExists(atPath: finalizeFaultDescriptor.path))
    precondition(FileManager.default.fileExists(atPath: finalizeFaultDirectory.appendingPathComponent("finalized-v1.json").path))
    let interruptedBytes = try Data(contentsOf: finalizeFaultDirectory.appendingPathComponent("production.ndjson")).count
    // A wrong nonce still cannot finalize the session the descriptor owns.
    do {
      _ = try finalizeFaultWriter.stopSession(sessionId: finalizeFaultId, nonce: String(repeating: "cd", count: 32))
      preconditionFailure("an interrupted finalization accepted a different nonce")
    } catch LinkedTraceError.invalidNonce {}
    // The next writer call finishes it: the recorded bytes never shrink and the
    // stop event is not appended twice.
    let finalizeFaultStatus = finalizeFaultWriter.status()
    precondition(!finalizeFaultStatus.active && finalizeFaultStatus.sessionId == nil)
    precondition(!FileManager.default.fileExists(atPath: finalizeFaultDescriptor.path))
    let afterRecoveryBytes = try Data(contentsOf: finalizeFaultDirectory.appendingPathComponent("production.ndjson")).count
    precondition(afterRecoveryBytes == interruptedBytes)
    do {
      try finalizeFaultWriter.cancelActiveSession(sessionId: finalizeFaultId)
      preconditionFailure("an interrupted finalization was cancelled")
    } catch LinkedTraceError.inactive {}
    precondition(!FileManager.default.fileExists(atPath: finalizeFaultDirectory.appendingPathComponent("abandoned-v1.json").path))
    let finalizeFaultExport = try finalizeFaultWriter.exportFinalizedSession(sessionId: finalizeFaultId)
    let finalizeFaultRows = try String(contentsOf: finalizeFaultExport, encoding: .utf8).split(separator: "\n").map {
      try JSONSerialization.jsonObject(with: Data($0.utf8)) as! [String: Any]
    }
    precondition(finalizeFaultRows.filter { $0["eventType"] as? String == "trace_stop" }.count == 1)
    let retriedFaultExport = try finalizeFaultWriter.stopSession(sessionId: finalizeFaultId, nonce: nonce)
    let retriedFaultBytes = try Data(contentsOf: retriedFaultExport)
    let finalizedFaultBytes = try Data(contentsOf: finalizeFaultExport)
    precondition(retriedFaultBytes == finalizedFaultBytes)
    try finalizeFaultWriter.deleteSession(sessionId: finalizeFaultId)

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
    let expiredMarkerData = try Data(contentsOf: expiryRoot.appendingPathComponent("linked-trace/v1/\(expiryId)/abandoned-v1.json"))
    let expiredMarker = try JSONSerialization.jsonObject(with: expiredMarkerData) as! [String: Any]
    precondition(expiredMarker["reason"] as? String == "expired")
    precondition(!FileManager.default.fileExists(atPath: expiryRoot.appendingPathComponent("linked-trace/v1/\(expiryId)/production.ndjson").path))
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
