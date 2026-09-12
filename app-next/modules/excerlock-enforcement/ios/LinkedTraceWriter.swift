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
    if let value = value as? Bool { self = .boolean(value); return }
    if let value = value as? String, value.utf8.count <= 160 { self = .string(value); return }
    if let value = value as? [String], value.count <= 16,
       value.allSatisfy({ $0.utf8.count <= 64 }) { self = .strings(value); return }
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
      "reason": ["policy_error", "native_error"]
    ],
    .extensionCallback: [
      "callback": ["threshold_reached", "interval_started", "interval_ended"],
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
        if let existing = try readDescriptorLocked(), existing.expiresAtWallTimeMs > started.wallTimeMs {
          guard existing.sessionId == descriptor.sessionId else { throw LinkedTraceError.sessionMismatch }
          guard existing.nonceDigest == descriptor.nonceDigest else { throw LinkedTraceError.invalidNonce }
          resultDescriptor = existing
          return
        }
        let directory = try sessionDirectory(descriptor.sessionId)
        if fileManager.fileExists(atPath: directory.path) { try fileManager.removeItem(at: directory) }
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
        guard let descriptor = try readDescriptorLocked() else {
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
      let stopped = stampProvider()
      try withTraceLock {
        guard let descriptor = try readDescriptorLocked() else { throw LinkedTraceError.inactive }
        guard descriptor.sessionId == normalized else { throw LinkedTraceError.sessionMismatch }
        guard descriptor.nonceDigest == Self.digest(nonce) else { throw LinkedTraceError.invalidNonce }
        try appendLocked(descriptor: descriptor, producer: .hostNative, eventType: .traceStop,
                         operationId: nil, payload: ["status": "completed"], stamp: stopped, bypassLimit: true)
        try removeDescriptorLocked()
      }
      announcedSessionId = nil
      return try exportURLLocked(sessionId: normalized)
    }
  }

  public func deleteSession(sessionId: String) throws {
    try onQueue {
      try withTraceLock {
        let normalized = sessionId.lowercased()
        guard Self.validSessionId(normalized) else { throw LinkedTraceError.invalidSession }
        if let descriptor = try readDescriptorLocked(), descriptor.sessionId == normalized {
          throw LinkedTraceError.sessionMismatch
        }
        try deleteSessionFilesLocked(sessionId: normalized)
      }
    }
  }

  public func abandonExpiredSession(sessionId: String) throws {
    try onQueue {
      try withTraceLock {
        let normalized = sessionId.lowercased()
        guard Self.validSessionId(normalized) else { throw LinkedTraceError.invalidSession }
        guard let descriptor = try readDescriptorLocked() else { throw LinkedTraceError.inactive }
        guard descriptor.sessionId == normalized else { throw LinkedTraceError.sessionMismatch }
        guard descriptor.expiresAtWallTimeMs <= stampProvider().wallTimeMs else { throw LinkedTraceError.sessionMismatch }
        try removeDescriptorLocked()
        try deleteSessionFilesLocked(sessionId: normalized)
      }
      announcedSessionId = nil
    }
  }

  public func hashIdentifier(_ value: String) -> String {
    let salt = (try? onQueue {
      try withTraceLock { try readDescriptorLocked().map { "\($0.sessionId):\($0.nonceDigest)" } }
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
      guard let descriptor = try readDescriptorLocked() else { return false }
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
    let sequence = try nextSequenceLocked(descriptor.sessionId)
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

  private func nextSequenceLocked(_ sessionId: String) throws -> UInt64 {
    let url = try sequenceURL(sessionId)
    let previous = (try? String(contentsOf: url, encoding: .utf8)).flatMap(UInt64.init) ?? 0
    let next = previous + 1
    try String(next).write(to: url, atomically: true, encoding: .utf8)
    try applyProtection(to: url)
    return next
  }

  private func deleteSessionFilesLocked(sessionId: String) throws {
    let directory = try sessionDirectory(sessionId)
    if fileManager.fileExists(atPath: directory.path) { try fileManager.removeItem(at: directory) }
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
    let descriptor = try readDescriptorLocked()
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
