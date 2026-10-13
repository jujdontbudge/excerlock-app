#if EXCERLOCK_LINKED_RECORDER_TRACE
import CryptoKit
import Darwin
import Foundation

public let linkedTraceAppGroup = excerlockAppGroup
public let linkedTraceProtocolVersion = 1
public let linkedTraceSessionTTLMilliseconds: Int64 = 2 * 60 * 60 * 1_000
public let linkedTraceDefaultSessionLimitBytes: Int64 = 25 * 1_024 * 1_024
public let linkedTraceDefaultTotalLimitBytes: Int64 = 100 * 1_024 * 1_024
public let linkedTraceDefaultRetentionMilliseconds: Int64 = 7 * 24 * 60 * 60 * 1_000

public enum LinkedTraceProducer: String, Codable, Sendable {
  case hostNative = "host_native"
  case hostJS = "host_js"
  case monitorExtension = "monitor_extension"
}

public enum LinkedTraceEventType: String, Codable, CaseIterable, Sendable {
  case traceStart = "trace_start"
  case traceStop = "trace_stop"
  case traceTruncated = "trace_truncated"
  case traceDropSummary = "trace_drop_summary"
  case process
  case clockAnchor = "clock_anchor"
  case appLifecycle = "app_lifecycle"
  case executionOpportunity = "execution_opportunity"
  case motionCallbackNative = "motion_callback_native"
  case motionInputJS = "motion_input_js"
  case motionEvidence = "motion_evidence"
  case detectorPersist = "detector_persist"
  case policyPublish = "policy_publish"
  case watchdogOperation = "watchdog_operation"
  case extensionCallback = "extension_callback"
  case shieldWrite = "shield_write"
}

public struct LinkedTraceStamp: Codable, Equatable, Sendable {
  public let monotonicNs: UInt64
  public let wallTimeMs: Int64
  public let wallTimeISO8601: String

  public init(monotonicNs: UInt64, wallTimeMs: Int64, wallTimeISO8601: String) {
    self.monotonicNs = monotonicNs
    self.wallTimeMs = wallTimeMs
    self.wallTimeISO8601 = wallTimeISO8601
  }
}

public struct LinkedTraceStatus: Codable, Equatable, Sendable {
  public let active: Bool
  public let sessionId: String?
  public let expiresAtWallTimeMs: Int64?
  public let truncated: Bool

  public init(active: Bool, sessionId: String?, expiresAtWallTimeMs: Int64?, truncated: Bool) {
    self.active = active
    self.sessionId = sessionId
    self.expiresAtWallTimeMs = expiresAtWallTimeMs
    self.truncated = truncated
  }
}

public enum LinkedTraceError: String, Error, LocalizedError {
  case unavailable
  case invalidSession
  case invalidNonce
  case invalidEvent
  case inactive
  case expired
  case sessionMismatch
  case sessionExists
  case io

  public var errorDescription: String? { rawValue }
}

private struct LinkedTraceSessionDescriptor: Codable, Equatable {
  let protocolVersion: Int
  let sessionId: String
  let nonceDigest: String
  let startedAt: LinkedTraceStamp
  let expiresAtWallTimeMs: Int64
}

/// Written when a session is finalized. Its presence is what makes a session
/// re-exportable after Trace Lab relaunches or iOS purges the temporary export
/// copy: the App Group trace itself is the durable artifact.
private struct LinkedTraceFinalizedMarker: Codable, Equatable {
  let protocolVersion: Int
  let sessionId: String
  let finalizedAtWallTimeMs: Int64
}

enum LinkedTraceAbandonReason: String, Codable {
  case cancelled
  case expired
}

/// Written when the operator cancels an active test (or an expired test is
/// cleaned up). It is deliberately not a finalized marker, so an abandoned
/// session can never be listed or exported; the recorded trace payload is
/// deleted with it, and only this tiny record stays in the lab App Group until
/// retention pruning removes it, as truthful local evidence that the test was
/// abandoned rather than completed.
private struct LinkedTraceAbandonedMarker: Codable, Equatable {
  let protocolVersion: Int
  let sessionId: String
  let reason: LinkedTraceAbandonReason
  let abandonedAtWallTimeMs: Int64
}

public struct LinkedTraceFinalizedSession: Codable, Equatable, Sendable {
  public let sessionId: String
  public let byteCount: Int64
  public let finalizedAtWallTimeMs: Int64

  public init(sessionId: String, byteCount: Int64, finalizedAtWallTimeMs: Int64) {
    self.sessionId = sessionId
    self.byteCount = byteCount
    self.finalizedAtWallTimeMs = finalizedAtWallTimeMs
  }
}

private struct LinkedTraceEnvelope: Encodable {
  let schemaVersion: Int
  let sessionId: String
  let sequence: UInt64
  let producer: LinkedTraceProducer
  let processInstanceId: String
  let eventType: LinkedTraceEventType
  let operationId: String?
  let receiptMonotonicNs: UInt64
  let receiptWallTimeMs: Int64
  let receiptWallTimeISO8601: String
  let writerQueueDelayNs: UInt64
  let payload: [String: LinkedTraceScalar]
}

private enum LinkedTraceScalar: Encodable {
  case string(String)
  case integer(Int64)
  case unsigned(UInt64)
  case double(Double)
  case boolean(Bool)
  case strings([String])
  case null

  init(any value: Any) throws {
    if value is NSNull { self = .null; return }
    // Foundation bridges every Swift Bool to NSNumber, and `as? Bool` also
    // accepts NSNumber 0/1, so a JavaScript number that arrives as an NSNumber
    // must be classified by CF type identity before any Bool cast can coerce
    // it. Otherwise a real `0`/`1` payload is written as `false`/`true`.
    if let value = value as? NSNumber {
      if CFGetTypeID(value) == CFBooleanGetTypeID() { self = .boolean(value.boolValue); return }
      let number = value.doubleValue
      guard number.isFinite else { throw LinkedTraceError.invalidEvent }
      if floor(number) == number, number >= Double(Int64.min), number <= Double(Int64.max) {
        self = .integer(value.int64Value)
      } else {
        self = .double(number)
      }
      return
    }
    if let value = value as? Bool { self = .boolean(value); return }
    if let value = value as? String, value.utf8.count <= 160 { self = .string(value); return }
    if let value = value as? [String], value.count <= 16,
       value.allSatisfy({ $0.utf8.count <= 64 }) { self = .strings(value); return }
    if let value = value as? Int { self = .integer(Int64(value)); return }
    if let value = value as? Int64 { self = .integer(value); return }
    if let value = value as? UInt64 { self = .unsigned(value); return }
    if let value = value as? Double, value.isFinite { self = .double(value); return }
    throw LinkedTraceError.invalidEvent
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    switch self {
    case .string(let value): try container.encode(value)
    case .integer(let value): try container.encode(value)
    case .unsigned(let value): try container.encode(value)
    case .double(let value): try container.encode(value)
    case .boolean(let value): try container.encode(value)
    case .strings(let value): try container.encode(value)
    case .null: try container.encodeNil()
    }
  }
}

public final class LinkedTraceWriter: @unchecked Sendable {
  public static let shared = LinkedTraceWriter()

  private static let allowedPayloadKeys: [LinkedTraceEventType: Set<String>] = [
    .traceStart: ["protocolVersion", "expiresAtWallTimeMs"],
    .traceStop: ["status"],
    .traceTruncated: ["limitBytes"],
    .traceDropSummary: ["count", "reason"],
    .process: ["status"],
    .clockAnchor: ["label"],
    .appLifecycle: ["layer", "state", "previous"],
    .executionOpportunity: ["source", "status"],
    .motionCallbackNative: ["stream", "classes", "confidence", "startedAtWallMs", "receivedAtWallMs", "stepsPerSecond", "cumulativeSteps", "asOfWallMs", "timestampWallMs", "bridgeAttempted"],
    .motionInputJS: ["stream", "status", "reason", "sourceAtWallMs"],
    .motionEvidence: ["qualifying", "observedAtWallMs", "activityAtWallMs", "cadenceAtWallMs", "cadencePerMinute"],
    .detectorPersist: ["trigger", "status", "generation", "observedAtWallMs", "phaseBefore", "phaseAfter", "watermarkBefore", "watermarkAfter", "qualifyingSinceBefore", "qualifyingSinceAfter", "activeSinceBefore", "activeSinceAfter", "lastEvidenceAtBefore", "lastEvidenceAtAfter", "lastQualifyingBefore", "lastQualifyingAfter", "graceEndsAtBefore", "graceEndsAtAfter"],
    .policyPublish: ["layer", "status", "revision", "state", "relief", "eligibleUntilWallMs", "openReason", "futureEnforcementEligible", "policyGeneration", "accountGeneration", "selectionVersionHash"],
    .watchdogOperation: ["operation", "status", "monitorIdHash", "revision", "startWallMs", "endWallMs", "registeredAtWallMs", "eligibleUntilWallMs", "reason"],
    .extensionCallback: ["callback", "status", "monitorIdHash", "reason"],
    .shieldWrite: ["operation", "status", "desired", "initiator", "revision", "configured", "applicationCount", "webDomainCount", "applicationCategoriesConfigured", "webDomainCategoriesConfigured", "reason"],
  ]
  private static let forbiddenKeyFragments = ["token", "payload", "bundle", "accountid", "deviceid", "latitude", "longitude", "coordinate", "message", "description", "name"]
  private static let activityClasses: Set<String> = ["walking", "running", "cycling", "automotive", "stationary", "unknown"]
  private static let stringValues: [LinkedTraceEventType: [String: Set<String>]] = [
    .traceStop: ["status": ["completed"]],
    .traceDropSummary: ["reason": ["buffer_full"]],
    .process: ["status": ["started"]],
    .clockAnchor: ["label": ["session_started"]],
    .appLifecycle: [
      "layer": ["native", "js"],
      "state": ["active", "inactive", "background", "foreground", "unknown", "extension"],
      "previous": ["active", "inactive", "background", "foreground", "unknown", "extension", "observer_installed"]
    ],
    .executionOpportunity: [
      "source": [
        "geofence_task", "walk_location_task",
        "runtime_foreground_full", "runtime_foreground_tick", "runtime_foreground_committed",
        "runtime_background_full", "runtime_background_tick", "runtime_background_committed",
        "runtime_geofence_full", "runtime_geofence_tick", "runtime_geofence_committed",
        "runtime_manual_full", "runtime_manual_tick", "runtime_manual_committed"
      ],
      "status": ["received", "completed", "failed", "error"]
    ],
    .motionCallbackNative: ["stream": ["activity", "cadence", "device_motion"], "confidence": ["low", "medium", "high"]],
    .motionInputJS: [
      "stream": ["activity", "cadence"], "status": ["accepted", "rejected"],
      "reason": ["invalid_time", "invalid_value", "stale"]
    ],
    .motionEvidence: ["qualifying": ["unknown"]],
    .detectorPersist: [
      "trigger": ["placement", "wake", "tick", "coverage_lost", "gym_region_invalidated", "manual_motion", "live_motion", "propped", "commit"],
      "status": ["returned", "failed"],
      "phaseBefore": ["inactive", "verifying", "active", "grace"],
      "phaseAfter": ["inactive", "verifying", "active", "grace"]
    ],
    .policyPublish: [
      "layer": ["native", "js"], "status": ["attempt", "returned", "rejected", "failed"],
      "state": ["shield", "open", "conditional", "unknown"],
      "relief": ["unlockedWalking", "unlockedPropped", "unlockedAtGym"],
      "openReason": ["earned", "outsideWindow", "lapsed", "disabled", "deleting"]
    ],
    .watchdogOperation: [
      "operation": ["stage", "commit", "cancel", "replace_windows"],
      "status": ["attempt", "returned", "rejected", "failed"],
      "reason": [
        "policy_error", "native_error", "excessive_activities", "interval_too_long",
        "interval_too_short", "invalid_date_components", "unauthorized"
      ]
    ],
    .extensionCallback: [
      "callback": ["threshold_reached", "interval_started", "interval_ended", "interval_warning"],
      "status": ["received", "applied", "rejected", "failed"],
      "reason": [
        "start_only", "policy_error", "policy_version", "not_conditional", "not_committed",
        "registration_missing", "generation_mismatch", "before_end", "ineligible", "outside_window",
        "window_missing", "future_ineligible", "suppressed", "earned", "live_conditional",
        "another_window_active", "lapsed", "disabled", "deleting", "applied"
      ]
    ],
    .shieldWrite: [
      "operation": ["shield", "unshield"], "status": ["attempt", "returned", "rejected", "failed"],
      "initiator": ["host", "watchdog", "window", "policy_open", "policy_shield", "conditional_relief", "fail_closed"],
      "reason": ["policy_error", "native_error"]
    ]
  ]

  private let fileManager: FileManager
  private let containerURL: URL?
  private let stampProvider: @Sendable () -> LinkedTraceStamp
  private let queue = DispatchQueue(label: "com.johansardar.excerlock.linked-trace", qos: .utility)
  private let queueKey = DispatchSpecificKey<UInt8>()
  private let pendingLock = NSLock()
  private let maxPendingEvents: Int
  private let sessionLimitBytes: Int64
  private let totalLimitBytes: Int64
  private let retentionMilliseconds: Int64
  private let processInstanceId = UUID().uuidString.lowercased()
  private var pendingEvents = 0
  private var droppedEvents = 0
  private var announcedSessionId: String?

  public init(
    containerURL: URL? = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: linkedTraceAppGroup),
    fileManager: FileManager = .default,
    sessionLimitBytes: Int64 = linkedTraceDefaultSessionLimitBytes,
    totalLimitBytes: Int64 = linkedTraceDefaultTotalLimitBytes,
    retentionMilliseconds: Int64 = linkedTraceDefaultRetentionMilliseconds,
    maxPendingEvents: Int = 1_024,
    stampProvider: @escaping @Sendable () -> LinkedTraceStamp = { LinkedTraceWriter.systemStamp() }
  ) {
    self.containerURL = containerURL
    self.fileManager = fileManager
    self.sessionLimitBytes = sessionLimitBytes
    self.totalLimitBytes = totalLimitBytes
    self.retentionMilliseconds = retentionMilliseconds
    self.maxPendingEvents = maxPendingEvents
    self.stampProvider = stampProvider
    queue.setSpecific(key: queueKey, value: 1)
  }

  public static func systemStamp() -> LinkedTraceStamp {
    var timebase = mach_timebase_info_data_t()
    mach_timebase_info(&timebase)
    let ticks = mach_continuous_time()
    let nanos = ticks.multipliedReportingOverflow(by: UInt64(timebase.numer)).overflow
      ? UInt64(Double(ticks) * Double(timebase.numer) / Double(timebase.denom))
      : ticks * UInt64(timebase.numer) / UInt64(timebase.denom)
    let date = Date()
    return LinkedTraceStamp(
      monotonicNs: nanos,
      wallTimeMs: Int64((date.timeIntervalSince1970 * 1_000).rounded()),
      wallTimeISO8601: ISO8601DateFormatter().string(from: date)
    )
  }

  public func startSession(sessionId: String, nonce: String) throws -> LinkedTraceStatus {
    try onQueue {
      guard Self.validSessionId(sessionId) else { throw LinkedTraceError.invalidSession }
      guard Self.validNonce(nonce) else { throw LinkedTraceError.invalidNonce }
      guard containerURL != nil else { throw LinkedTraceError.unavailable }
      let started = stampProvider()
      let descriptor = LinkedTraceSessionDescriptor(
        protocolVersion: linkedTraceProtocolVersion,
        sessionId: sessionId.lowercased(),
        nonceDigest: Self.digest(nonce),
        startedAt: started,
        expiresAtWallTimeMs: started.wallTimeMs + linkedTraceSessionTTLMilliseconds
      )
      var resultDescriptor = descriptor
      try withTraceLock {
        try prepareRoot()
        try pruneLocked(nowWallTimeMs: started.wallTimeMs)
        if let existing = try liveDescriptorLocked(), existing.expiresAtWallTimeMs > started.wallTimeMs {
          guard existing.sessionId == descriptor.sessionId else { throw LinkedTraceError.sessionMismatch }
          guard existing.nonceDigest == descriptor.nonceDigest else { throw LinkedTraceError.invalidNonce }
          resultDescriptor = existing
          return
        }
        let directory = try sessionDirectory(descriptor.sessionId)
        guard !fileManager.fileExists(atPath: directory.path) else { throw LinkedTraceError.sessionExists }
        try fileManager.createDirectory(at: directory, withIntermediateDirectories: true)
        try applyProtection(to: directory)
        try writeDescriptorLocked(descriptor)
        announcedSessionId = nil
        do {
          try appendLocked(
            descriptor: descriptor,
            producer: .hostNative,
            eventType: .traceStart,
            operationId: nil,
            payload: ["protocolVersion": linkedTraceProtocolVersion, "expiresAtWallTimeMs": descriptor.expiresAtWallTimeMs],
            stamp: started,
            bypassLimit: false
          )
        } catch {
          try? removeDescriptorLocked()
          try? fileManager.removeItem(at: directory)
          throw error
        }
      }
      let truncated = fileManager.fileExists(atPath: try truncatedURL(resultDescriptor.sessionId).path)
      return LinkedTraceStatus(active: true, sessionId: resultDescriptor.sessionId, expiresAtWallTimeMs: resultDescriptor.expiresAtWallTimeMs, truncated: truncated)
    }
  }

  public func status() -> LinkedTraceStatus {
    (try? onQueue {
      try withTraceLock {
        let now = stampProvider().wallTimeMs
        try prepareRoot()
        try pruneLocked(nowWallTimeMs: now)
        guard let descriptor = try liveDescriptorLocked() else {
          return LinkedTraceStatus(active: false, sessionId: nil, expiresAtWallTimeMs: nil, truncated: false)
        }
        let active = descriptor.expiresAtWallTimeMs > now
        let truncated = fileManager.fileExists(atPath: try truncatedURL(descriptor.sessionId).path)
        return LinkedTraceStatus(active: active, sessionId: descriptor.sessionId, expiresAtWallTimeMs: descriptor.expiresAtWallTimeMs, truncated: truncated)
      }
    }) ?? LinkedTraceStatus(active: false, sessionId: nil, expiresAtWallTimeMs: nil, truncated: false)
  }

  public func recordDeferred(
    producer: LinkedTraceProducer,
    eventType: LinkedTraceEventType,
    operationId: String? = nil,
    payload: [String: Any] = [:]
  ) {
    let stamp = stampProvider()
    pendingLock.lock()
    if pendingEvents >= maxPendingEvents {
      droppedEvents += 1
      pendingLock.unlock()
      return
    }
    pendingEvents += 1
    pendingLock.unlock()
    queue.async { [self] in
      defer {
        pendingLock.lock()
        pendingEvents -= 1
        pendingLock.unlock()
      }
      _ = try? appendActive(producer: producer, eventType: eventType, operationId: operationId, payload: payload, stamp: stamp)
    }
  }

  @discardableResult
  public func record(
    producer: LinkedTraceProducer,
    eventType: LinkedTraceEventType,
    operationId: String? = nil,
    payload: [String: Any] = [:]
  ) -> Bool {
    (try? onQueue {
      try appendActive(producer: producer, eventType: eventType, operationId: operationId, payload: payload, stamp: stampProvider())
    }) ?? false
  }

  public func flush() { try? onQueue {} }

  public func stopSession(sessionId: String, nonce: String) throws -> URL {
    try onQueue {
      let normalized = sessionId.lowercased()
      try withTraceLock {
        guard Self.validSessionId(normalized) else { throw LinkedTraceError.invalidSession }
        guard Self.validNonce(nonce) else { throw LinkedTraceError.invalidNonce }
        // A finalization that was interrupted after its authoritative marker is
        // completed here, and the same call still returns the export URL: a
        // retried save is idempotent success, never a duplicate stop event and
        // never a lost trace.
        if fileManager.fileExists(atPath: try finalizedMarkerURL(normalized).path) {
          if let descriptor = try readDescriptorLocked(), descriptor.sessionId == normalized {
            guard descriptor.nonceDigest == Self.digest(nonce) else { throw LinkedTraceError.invalidNonce }
          }
          try completeFinalizationLocked(sessionId: normalized)
          return
        }
        let stopped = stampProvider()
        guard let descriptor = try liveDescriptorLocked() else { throw LinkedTraceError.inactive }
        guard descriptor.sessionId == normalized else { throw LinkedTraceError.sessionMismatch }
        guard descriptor.nonceDigest == Self.digest(nonce) else { throw LinkedTraceError.invalidNonce }
        // The two-hour TTL is enforced here, not only in the UI: an expired
        // trace can never be finalized or exported, even from a review screen.
        guard descriptor.expiresAtWallTimeMs > stopped.wallTimeMs else { throw LinkedTraceError.expired }
        // The marker goes first: if it cannot be written nothing else changes and
        // the operator can retry the same save without a duplicate stop event.
        try writeFinalizedMarkerLocked(sessionId: normalized, finalizedAtWallTimeMs: stopped.wallTimeMs)
        try appendLocked(descriptor: descriptor, producer: .hostNative, eventType: .traceStop,
                         operationId: nil, payload: ["status": "completed"], stamp: stopped, bypassLimit: true)
        try removeDescriptorLocked()
      }
      announcedSessionId = nil
      return try exportURLLocked(sessionId: normalized)
    }
  }

  /// Finalized sessions stay in the App Group until the retention window ends,
  /// so the operator can come back later (even after a relaunch, a reconnect,
  /// or iOS purging the temporary export copy) and still share both files.
  public func finalizedSessions() -> [LinkedTraceFinalizedSession] {
    (try? onQueue {
      try withTraceLock {
        let now = stampProvider().wallTimeMs
        try prepareRoot()
        try pruneLocked(nowWallTimeMs: now)
        // The finalized marker, when it exists, is authoritative: liveDescriptorLocked()
        // already finished the interrupted finalization and dropped the stale
        // descriptor, so a session the current descriptor still owns is genuinely
        // running or expired and is never listed here. An interrupted
        // abandonment is completed first too, so its descriptor can never hide a
        // genuinely saved session either.
        let descriptorSessionId = try liveDescriptorLocked()?.sessionId
        let directories = (try? fileManager.contentsOfDirectory(
          at: try rootURL(),
          includingPropertiesForKeys: [.isDirectoryKey],
          options: [.skipsHiddenFiles]
        )) ?? []
        return directories.compactMap { url -> LinkedTraceFinalizedSession? in
          guard (try? url.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true,
                Self.validSessionId(url.lastPathComponent),
                url.lastPathComponent != descriptorSessionId,
                let marker = try? readFinalizedMarkerLocked(sessionId: url.lastPathComponent) else { return nil }
          let trace = try? traceURL(marker.sessionId)
          let size = trace.flatMap { try? $0.resourceValues(forKeys: [.fileSizeKey]).fileSize }
          return LinkedTraceFinalizedSession(
            sessionId: marker.sessionId,
            byteCount: Int64(size ?? 0),
            finalizedAtWallTimeMs: marker.finalizedAtWallTimeMs
          )
        }.sorted { $0.finalizedAtWallTimeMs > $1.finalizedAtWallTimeMs }
      }
    }) ?? []
  }

  /// Rebuilds the shareable copy from the durable App Group trace. Exporting an
  /// active session is refused so a running test can never be shipped early.
  public func exportFinalizedSession(sessionId: String) throws -> URL {
    try onQueue {
      let normalized = sessionId.lowercased()
      guard Self.validSessionId(normalized) else { throw LinkedTraceError.invalidSession }
      return try withTraceLock {
        try prepareRoot()
        if let descriptor = try liveDescriptorLocked(), descriptor.sessionId == normalized {
          throw LinkedTraceError.sessionMismatch
        }
        guard (try? readFinalizedMarkerLocked(sessionId: normalized)) != nil else { throw LinkedTraceError.inactive }
        return try exportURLLocked(sessionId: normalized)
      }
    }
  }

  public func deleteSession(sessionId: String) throws {
    try onQueue {
      try withTraceLock {
        let normalized = sessionId.lowercased()
        guard Self.validSessionId(normalized) else { throw LinkedTraceError.invalidSession }
        if let descriptor = try liveDescriptorLocked(), descriptor.sessionId == normalized {
          throw LinkedTraceError.sessionMismatch
        }
        try deleteSessionFilesLocked(sessionId: normalized)
      }
    }
  }

  /// Operator escape from an active test whose recorder never started or cannot
  /// finish: the trace stops, the walking evidence rule is removed by the call
  /// site, the recorded trace payload is deleted, and a durable abandonment
  /// marker is written instead of a finalized marker, so nothing can list or
  /// export this session. The marker is cleared with every other old session by
  /// retention pruning.
  ///
  /// The marker is the one durable authoritative transition and is written
  /// first, under the session lock. A process that dies at any later cleanup
  /// step leaves that marker behind, and every later writer call finishes the
  /// same abandonment idempotently before it can observe a live session, so a
  /// cancelled test can never be resumed, appended to, finalized, listed, or
  /// exported again.
  public func cancelActiveSession(sessionId: String) throws {
    try abandonSession(sessionId: sessionId, reason: .cancelled)
  }

  public func abandonExpiredSession(sessionId: String) throws {
    try abandonSession(sessionId: sessionId, reason: .expired)
  }

  private func abandonSession(sessionId: String, reason: LinkedTraceAbandonReason) throws {
    try onQueue {
      try withTraceLock {
        let normalized = sessionId.lowercased()
        guard Self.validSessionId(normalized) else { throw LinkedTraceError.invalidSession }
        // The finalized marker wins over every later cancel: a save that began
        // and was interrupted must be finished, never deleted as abandoned. The
        // interrupted finalization is completed first, then the cancel is
        // refused truthfully because there is no active test left to abandon.
        if fileManager.fileExists(atPath: try finalizedMarkerURL(normalized).path) {
          try completeFinalizationLocked(sessionId: normalized)
          throw LinkedTraceError.inactive
        }
        // An interrupted abandonment already recorded its authoritative
        // transition. Finishing that cleanup again is idempotent success, not
        // an error, whether or not the descriptor survived the crash.
        if fileManager.fileExists(atPath: try abandonedMarkerURL(normalized).path) {
          try completeAbandonmentLocked(sessionId: normalized)
          return
        }
        guard let descriptor = try readDescriptorLocked() else { throw LinkedTraceError.inactive }
        guard descriptor.sessionId == normalized else { throw LinkedTraceError.sessionMismatch }
        if reason == .expired {
          guard descriptor.expiresAtWallTimeMs <= stampProvider().wallTimeMs else { throw LinkedTraceError.sessionMismatch }
        }
        // Truthful local evidence before anything else changes: the session was
        // abandoned, not completed. The marker is not a finalized marker, so
        // finalizedSessions() and exportFinalizedSession() still refuse it, and
        // the recorded trace payload is deleted so a void test keeps no data.
        try writeAbandonedMarkerLocked(sessionId: normalized, reason: reason, abandonedAtWallTimeMs: stampProvider().wallTimeMs)
        try completeAbandonmentLocked(sessionId: normalized)
      }
    }
  }

  /// Idempotent cleanup of the steps after the authoritative abandonment
  /// marker: drop the recorded payload and remove the descriptor, but only
  /// when it still describes the abandoned session. A newer session that
  /// started after an interrupted abandonment must never lose its descriptor
  /// to an old retry.
  private func completeAbandonmentLocked(sessionId: String) throws {
    try removeAbandonedTraceFilesLocked(sessionId: sessionId)
    if let descriptor = try readDescriptorLocked(), descriptor.sessionId == sessionId {
      try removeDescriptorLocked()
    }
    announcedSessionId = nil
  }

  /// Idempotent completion of the steps after the authoritative finalized
  /// marker: append the missing stop event when the process died between the
  /// marker and that event, then remove the descriptor, but only when it still
  /// describes the finalized session. A newer session that started after an
  /// interrupted save must never lose its descriptor to an old retry. Unlike
  /// abandonment, the trace payload is kept: it is exactly what the operator
  /// can still list and export after a relaunch.
  private func completeFinalizationLocked(sessionId: String) throws {
    if let descriptor = try readDescriptorLocked(), descriptor.sessionId == sessionId {
      if !traceEndsWithStopLocked(sessionId: sessionId) {
        // Best effort: a trace that cannot take the repair event is still
        // finalized and exportable, exactly like one written before this bug fix.
        _ = try? appendLocked(
          descriptor: descriptor,
          producer: .hostNative,
          eventType: .traceStop,
          operationId: nil,
          payload: ["status": "completed"],
          stamp: stampProvider(),
          bypassLimit: true
        )
      }
      try removeDescriptorLocked()
    }
    announcedSessionId = nil
  }

  /// True when the trace's last complete line is already the stop event, so a
  /// finalization recovery never appends a second one. Only a bounded tail is
  /// read: the marker, not this scan, is what proves the session is finalized.
  private func traceEndsWithStopLocked(sessionId: String) -> Bool {
    let url: URL
    let handle: FileHandle
    do {
      url = try traceURL(sessionId)
      handle = try FileHandle(forReadingFrom: url)
    } catch { return false }
    defer { try? handle.close() }
    guard let size = try? handle.seekToEnd() else { return false }
    let window: UInt64 = 64 * 1_024
    let start = size > window ? size - window : 0
    do { try handle.seek(toOffset: start) } catch { return false }
    guard let data = try? handle.readToEnd(), !data.isEmpty else { return false }
    var tail = String(decoding: data, as: UTF8.self)
    // The window may open in the middle of a line; drop that partial line.
    if start > 0, let newline = tail.firstIndex(of: "\n") { tail = String(tail[tail.index(after: newline)...]) }
    guard let lastLine = tail.split(separator: "\n").last,
          let row = try? JSONSerialization.jsonObject(with: Data(lastLine.utf8)) as? [String: Any] else {
      return false
    }
    return row["eventType"] as? String == LinkedTraceEventType.traceStop.rawValue
  }

  /// The descriptor for a session that is actually live. A finalized marker and
  /// an abandoned marker both win over it: if a crash left one behind, this call
  /// finishes that transition first and reports no live session, so the session
  /// can never look active, resumable, appendable, cancellable, or finalizable
  /// again. The two markers are written for different outcomes — a finalized
  /// session stays listable and exportable, an abandoned one never is.
  private func liveDescriptorLocked() throws -> LinkedTraceSessionDescriptor? {
    guard let descriptor = try readDescriptorLocked() else { return nil }
    if fileManager.fileExists(atPath: try abandonedMarkerURL(descriptor.sessionId).path) {
      try completeAbandonmentLocked(sessionId: descriptor.sessionId)
      return nil
    }
    if fileManager.fileExists(atPath: try finalizedMarkerURL(descriptor.sessionId).path) {
      try completeFinalizationLocked(sessionId: descriptor.sessionId)
      return nil
    }
    return descriptor
  }

  public func hashIdentifier(_ value: String) -> String {
    let salt = (try? onQueue {
      try withTraceLock { try liveDescriptorLocked().map { "\($0.sessionId):\($0.nonceDigest)" } }
    }) ?? nil
    return String(Self.digest("\(salt ?? processInstanceId):\(value)").prefix(16))
  }

  private func appendActive(
    producer: LinkedTraceProducer,
    eventType: LinkedTraceEventType,
    operationId: String?,
    payload: [String: Any],
    stamp: LinkedTraceStamp
  ) throws -> Bool {
    try withTraceLock {
      guard let descriptor = try liveDescriptorLocked() else { return false }
      guard descriptor.expiresAtWallTimeMs > stamp.wallTimeMs else { return false }
      pendingLock.lock()
      let dropped = droppedEvents
      droppedEvents = 0
      pendingLock.unlock()
      if dropped > 0 {
        try appendLocked(descriptor: descriptor, producer: producer, eventType: .traceDropSummary,
                         operationId: nil, payload: ["count": dropped, "reason": "buffer_full"], stamp: stamp, bypassLimit: true)
      }
      if announcedSessionId != descriptor.sessionId {
        try appendLocked(descriptor: descriptor, producer: producer, eventType: .process,
                         operationId: nil, payload: ["status": "started"], stamp: stamp, bypassLimit: false)
        announcedSessionId = descriptor.sessionId
      }
      return try appendLocked(descriptor: descriptor, producer: producer, eventType: eventType,
                              operationId: operationId, payload: payload, stamp: stamp, bypassLimit: false)
    }
  }

  @discardableResult
  private func appendLocked(
    descriptor: LinkedTraceSessionDescriptor,
    producer: LinkedTraceProducer,
    eventType: LinkedTraceEventType,
    operationId: String?,
    payload: [String: Any],
    stamp: LinkedTraceStamp,
    bypassLimit: Bool
  ) throws -> Bool {
    if let operationId {
      guard operationId.utf8.count <= 160,
            operationId.unicodeScalars.allSatisfy({ CharacterSet.alphanumerics.union(CharacterSet(charactersIn: ":._-")).contains($0) }) else {
        throw LinkedTraceError.invalidEvent
      }
    }
    let sanitized = try sanitize(payload: payload, for: eventType)
    let trace = try traceURL(descriptor.sessionId)
    let currentSize = ((try? trace.resourceValues(forKeys: [.fileSizeKey]).fileSize).map(Int64.init)) ?? 0
    if !bypassLimit && currentSize >= sessionLimitBytes {
      let marker = try truncatedURL(descriptor.sessionId)
      if !fileManager.fileExists(atPath: marker.path) {
        try Data().write(to: marker, options: .atomic)
        _ = try appendLocked(descriptor: descriptor, producer: producer, eventType: .traceTruncated,
                             operationId: nil, payload: ["limitBytes": sessionLimitBytes], stamp: stamp, bypassLimit: true)
      }
      return false
    }
    let sequence = lastSequenceLocked(descriptor.sessionId) + 1
    let writeStamp = stampProvider()
    let envelope = LinkedTraceEnvelope(
      schemaVersion: linkedTraceProtocolVersion,
      sessionId: descriptor.sessionId,
      sequence: sequence,
      producer: producer,
      processInstanceId: processInstanceId,
      eventType: eventType,
      operationId: operationId,
      receiptMonotonicNs: stamp.monotonicNs,
      receiptWallTimeMs: stamp.wallTimeMs,
      receiptWallTimeISO8601: stamp.wallTimeISO8601,
      writerQueueDelayNs: writeStamp.monotonicNs >= stamp.monotonicNs ? writeStamp.monotonicNs - stamp.monotonicNs : 0,
      payload: sanitized
    )
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
    var line = try encoder.encode(envelope)
    line.append(0x0A)
    if !bypassLimit && currentSize + Int64(line.count) > sessionLimitBytes {
      let marker = try truncatedURL(descriptor.sessionId)
      if !fileManager.fileExists(atPath: marker.path) {
        try Data().write(to: marker, options: .atomic)
        _ = try appendLocked(descriptor: descriptor, producer: producer, eventType: .traceTruncated,
                             operationId: nil, payload: ["limitBytes": sessionLimitBytes], stamp: stamp, bypassLimit: true)
      }
      return false
    }
    if !fileManager.fileExists(atPath: trace.path) {
      fileManager.createFile(atPath: trace.path, contents: nil)
      try applyProtection(to: trace)
    }
    let handle = try FileHandle(forWritingTo: trace)
    defer { try? handle.close() }
    try handle.seekToEnd()
    try handle.write(contentsOf: line)
    if eventType != .motionCallbackNative { try handle.synchronize() }
    try writeSequenceLocked(descriptor.sessionId, sequence)
    return true
  }

  private func sanitize(payload: [String: Any], for eventType: LinkedTraceEventType) throws -> [String: LinkedTraceScalar] {
    guard let allowed = Self.allowedPayloadKeys[eventType], Set(payload.keys).isSubset(of: allowed) else {
      throw LinkedTraceError.invalidEvent
    }
    var result: [String: LinkedTraceScalar] = [:]
    for (key, value) in payload {
      let normalized = key.lowercased().replacingOccurrences(of: "_", with: "")
      guard !Self.forbiddenKeyFragments.contains(where: normalized.contains) else { throw LinkedTraceError.invalidEvent }
      let scalar = try LinkedTraceScalar(any: value)
      switch scalar {
      case .string(let string):
        if key.hasSuffix("Hash") {
          guard string.count == 16,
                string.unicodeScalars.allSatisfy({ CharacterSet(charactersIn: "0123456789abcdef").contains($0) }) else {
            throw LinkedTraceError.invalidEvent
          }
        } else {
          guard Self.stringValues[eventType]?[key]?.contains(string) == true else { throw LinkedTraceError.invalidEvent }
        }
      case .strings(let strings):
        guard eventType == .motionCallbackNative, key == "classes",
              strings.allSatisfy(Self.activityClasses.contains) else { throw LinkedTraceError.invalidEvent }
      default:
        break
      }
      result[key] = scalar
    }
    return result
  }

  private func onQueue<T>(_ body: () throws -> T) throws -> T {
    if DispatchQueue.getSpecific(key: queueKey) != nil { return try body() }
    return try queue.sync(execute: body)
  }

  private func withTraceLock<T>(_ body: () throws -> T) throws -> T {
    guard let containerURL else { throw LinkedTraceError.unavailable }
    try fileManager.createDirectory(at: containerURL, withIntermediateDirectories: true)
    let lockURL = containerURL.appendingPathComponent("linked-trace-v1.lock")
    let descriptor = Darwin.open(lockURL.path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
    guard descriptor >= 0 else { throw LinkedTraceError.io }
    guard flock(descriptor, LOCK_EX) == 0 else { Darwin.close(descriptor); throw LinkedTraceError.io }
    defer { flock(descriptor, LOCK_UN); Darwin.close(descriptor) }
    return try body()
  }

  private func prepareRoot() throws {
    let root = try rootURL()
    try fileManager.createDirectory(at: root, withIntermediateDirectories: true)
    try applyProtection(to: root)
  }

  private func rootURL() throws -> URL {
    guard let containerURL else { throw LinkedTraceError.unavailable }
    return containerURL.appendingPathComponent("linked-trace", isDirectory: true)
      .appendingPathComponent("v1", isDirectory: true)
  }

  private func descriptorURL() throws -> URL {
    guard let containerURL else { throw LinkedTraceError.unavailable }
    return containerURL.appendingPathComponent("linked-trace-active-v1.json")
  }

  private func sessionDirectory(_ sessionId: String) throws -> URL {
    try rootURL().appendingPathComponent(sessionId, isDirectory: true)
  }

  private func traceURL(_ sessionId: String) throws -> URL {
    try sessionDirectory(sessionId).appendingPathComponent("production.ndjson")
  }

  private func sequenceURL(_ sessionId: String) throws -> URL {
    try sessionDirectory(sessionId).appendingPathComponent("sequence-v1.txt")
  }

  private func truncatedURL(_ sessionId: String) throws -> URL {
    try sessionDirectory(sessionId).appendingPathComponent("truncated-v1")
  }

  private func finalizedMarkerURL(_ sessionId: String) throws -> URL {
    try sessionDirectory(sessionId).appendingPathComponent("finalized-v1.json")
  }

  private func abandonedMarkerURL(_ sessionId: String) throws -> URL {
    try sessionDirectory(sessionId).appendingPathComponent("abandoned-v1.json")
  }

  private func writeAbandonedMarkerLocked(
    sessionId: String,
    reason: LinkedTraceAbandonReason,
    abandonedAtWallTimeMs: Int64
  ) throws {
    let marker = LinkedTraceAbandonedMarker(
      protocolVersion: linkedTraceProtocolVersion,
      sessionId: sessionId,
      reason: reason,
      abandonedAtWallTimeMs: abandonedAtWallTimeMs
    )
    let data = try JSONEncoder().encode(marker)
    try fileManager.createDirectory(at: try sessionDirectory(sessionId), withIntermediateDirectories: true)
    try data.write(to: try abandonedMarkerURL(sessionId), options: [.atomic])
    try applyProtection(to: try abandonedMarkerURL(sessionId))
  }

  private func readFinalizedMarkerLocked(sessionId: String) throws -> LinkedTraceFinalizedMarker {
    let marker = try JSONDecoder().decode(
      LinkedTraceFinalizedMarker.self,
      from: Data(contentsOf: try finalizedMarkerURL(sessionId))
    )
    guard marker.protocolVersion == linkedTraceProtocolVersion, marker.sessionId == sessionId.lowercased() else {
      throw LinkedTraceError.io
    }
    return marker
  }

  private func writeFinalizedMarkerLocked(sessionId: String, finalizedAtWallTimeMs: Int64) throws {
    let marker = LinkedTraceFinalizedMarker(
      protocolVersion: linkedTraceProtocolVersion,
      sessionId: sessionId,
      finalizedAtWallTimeMs: finalizedAtWallTimeMs
    )
    let data = try JSONEncoder().encode(marker)
    try data.write(to: try finalizedMarkerURL(sessionId), options: [.atomic])
    try applyProtection(to: try finalizedMarkerURL(sessionId))
  }

  private func readDescriptorLocked() throws -> LinkedTraceSessionDescriptor? {
    let url = try descriptorURL()
    guard fileManager.fileExists(atPath: url.path) else { return nil }
    do { return try JSONDecoder().decode(LinkedTraceSessionDescriptor.self, from: Data(contentsOf: url)) }
    catch { throw LinkedTraceError.io }
  }

  private func writeDescriptorLocked(_ descriptor: LinkedTraceSessionDescriptor) throws {
    let data = try JSONEncoder().encode(descriptor)
    try data.write(to: descriptorURL(), options: [.atomic])
    try applyProtection(to: descriptorURL())
  }

  private func removeDescriptorLocked() throws {
    let url = try descriptorURL()
    if fileManager.fileExists(atPath: url.path) { try fileManager.removeItem(at: url) }
  }

  private func lastSequenceLocked(_ sessionId: String) -> UInt64 {
    (try? String(contentsOf: sequenceURL(sessionId), encoding: .utf8)).flatMap(UInt64.init) ?? 0
  }

  private func writeSequenceLocked(_ sessionId: String, _ sequence: UInt64) throws {
    let url = try sequenceURL(sessionId)
    try String(sequence).write(to: url, atomically: true, encoding: .utf8)
    try applyProtection(to: url)
  }

  private func deleteSessionFilesLocked(sessionId: String) throws {
    let directory = try sessionDirectory(sessionId)
    if fileManager.fileExists(atPath: directory.path) { try fileManager.removeItem(at: directory) }
    removeTemporaryExport(sessionId: sessionId)
  }

  /// Removes the recorded payload of an abandoned session but keeps its tiny
  /// abandonment marker: the test is void, so no measurement data survives,
  /// while the local record that it was abandoned (never completed) remains
  /// until retention pruning clears the whole directory.
  private func removeAbandonedTraceFilesLocked(sessionId: String) throws {
    let directory = try sessionDirectory(sessionId)
    for name in ["production.ndjson", "sequence-v1.txt", "truncated-v1"] {
      let url = directory.appendingPathComponent(name)
      if fileManager.fileExists(atPath: url.path) { try? fileManager.removeItem(at: url) }
    }
    removeTemporaryExport(sessionId: sessionId)
  }

  private func removeTemporaryExport(sessionId: String) {
    let export = fileManager.temporaryDirectory
      .appendingPathComponent("ExcerLockLinkedTraceExports", isDirectory: true)
      .appendingPathComponent("excerlock-linked-trace-\(sessionId).ndjson")
    if fileManager.fileExists(atPath: export.path) { try? fileManager.removeItem(at: export) }
  }

  private func exportURLLocked(sessionId: String) throws -> URL {
    guard Self.validSessionId(sessionId) else { throw LinkedTraceError.invalidSession }
    let source = try traceURL(sessionId)
    guard fileManager.fileExists(atPath: source.path) else { throw LinkedTraceError.inactive }
    let exportRoot = fileManager.temporaryDirectory.appendingPathComponent("ExcerLockLinkedTraceExports", isDirectory: true)
    try fileManager.createDirectory(at: exportRoot, withIntermediateDirectories: true)
    let destination = exportRoot.appendingPathComponent("excerlock-linked-trace-\(sessionId).ndjson")
    try? fileManager.removeItem(at: destination)
    try fileManager.copyItem(at: source, to: destination)
    try applyProtection(to: destination)
    return destination
  }

  private func pruneLocked(nowWallTimeMs: Int64) throws {
    let root = try rootURL()
    let descriptor = try liveDescriptorLocked()
    let active: String?
    if let descriptor, descriptor.expiresAtWallTimeMs <= nowWallTimeMs {
      if nowWallTimeMs - descriptor.expiresAtWallTimeMs > retentionMilliseconds {
        try removeDescriptorLocked()
        active = nil
      } else {
        active = descriptor.sessionId
      }
    } else {
      active = descriptor?.sessionId
    }
    let directories = (try? fileManager.contentsOfDirectory(
      at: root,
      includingPropertiesForKeys: [.contentModificationDateKey, .isDirectoryKey],
      options: [.skipsHiddenFiles]
    )) ?? []
    let candidates = directories.compactMap { url -> (URL, Int64, Int64)? in
      guard url.lastPathComponent != active,
            let values = try? url.resourceValues(forKeys: [.contentModificationDateKey, .isDirectoryKey]),
            values.isDirectory == true else { return nil }
      let modified = Int64(((values.contentModificationDate ?? .distantPast).timeIntervalSince1970 * 1_000).rounded())
      return (url, modified, directorySize(url))
    }.sorted { $0.1 < $1.1 }
    let activeSize = active.flatMap { try? sessionDirectory($0) }.map(directorySize) ?? 0
    var total = activeSize + candidates.reduce(Int64(0)) { $0 + $1.2 }
    for candidate in candidates {
      if nowWallTimeMs - candidate.1 > retentionMilliseconds || total > totalLimitBytes {
        try? fileManager.removeItem(at: candidate.0)
        total -= candidate.2
      }
    }
  }

  private func directorySize(_ url: URL) -> Int64 {
    let enumerator = fileManager.enumerator(at: url, includingPropertiesForKeys: [.fileSizeKey, .isRegularFileKey])
    var total: Int64 = 0
    while let file = enumerator?.nextObject() as? URL,
          let values = try? file.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey]) {
      if values.isRegularFile == true { total += Int64(values.fileSize ?? 0) }
    }
    return total
  }

  private func applyProtection(to url: URL) throws {
    #if os(iOS)
    try fileManager.setAttributes([.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: url.path)
    #endif
  }

  private static func validSessionId(_ value: String) -> Bool {
    guard let parsed = UUID(uuidString: value) else { return false }
    return parsed.uuidString.lowercased() == value.lowercased()
  }

  private static func validNonce(_ value: String) -> Bool {
    value.utf8.count >= 64 && value.utf8.count <= 160 &&
      value.unicodeScalars.allSatisfy { CharacterSet(charactersIn: "0123456789abcdefABCDEF-").contains($0) }
  }

  private static func digest(_ value: String) -> String {
    SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined()
  }
}
#endif
