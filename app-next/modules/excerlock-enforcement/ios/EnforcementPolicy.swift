import Foundation
import FamilyControls
import ManagedSettings
import Darwin

let excerlockPolicyVersion = 1
let excerlockSelectionHandle = "excerlock.selection.locked.v1"
let excerlockSelectionDefaultsKey = "familyActivitySelectionIds"
let excerlockWatchdogPrefix = "excerlock.watchdog."
let excerlockWindowPrefix = "excerlock.window."
let excerlockWatchdogEarliestMs: Double = 60_000
let excerlockMaxDeviceActivityMonitors = 20

struct ExcerlockMonitorRegistration: Codable, Equatable {
  let id: String; let revision: Int; let policyGeneration: Int; let accountGeneration: Int
  let selectionVersion: String; let start: Double; let end: Double; let registeredAt: Double
  let eligibleUntil: Double; var committed: Bool; var fireAt: Double? = nil
}
struct ExcerlockScheduledWindow: Codable, Equatable {
  let monitorId: String; let id: String; let revision: Int; let policyGeneration: Int
  let accountGeneration: Int; let selectionVersion: String; let start: Double; let end: Double
}
struct ExcerlockPolicyRecord: Codable, Equatable {
  var version: Int; var revision: Int; var publishedAt: Double; var state: String; var relief: String?
  var eligibleUntil: Double; var openReason: String?; var futureEnforcementEligible: Bool
  var policyGeneration: Int; var accountGeneration: Int; var selectionVersion: String
  var selectionPayload: String?; var registrations: [String: ExcerlockMonitorRegistration]
  var committedId: String?; var windows: [String: ExcerlockScheduledWindow]; var shielded: Bool
}
struct ExcerlockCallbackResult: Equatable {
  let applied: Bool
  let reason: String
}
enum ExcerlockPolicyError: Error, LocalizedError {
  case appGroupUnavailable, lockUnavailable, missingSnapshot, staleRevision, missingSelection, invalidSnapshot
  var errorDescription: String? { switch self {
    case .appGroupUnavailable: return "Enforcement App Group is unavailable"
    case .lockUnavailable: return "Enforcement policy lock is unavailable"
    case .missingSnapshot: return "Enforcement policy has not been published"
    case .staleRevision: return "Enforcement revision was superseded"
    case .missingSelection: return "The opaque Screen Time selection is unavailable"
    case .invalidSnapshot: return "Enforcement snapshot is invalid"
  }}
}
final class ExcerlockPolicyStore {
  static let shared = ExcerlockPolicyStore()
  private let appGroup = excerlockAppGroup
  private let managed = ManagedSettingsStore(named: ManagedSettingsStore.Name("ExcerLockEnforcement"))
  private func container() throws -> URL { guard let u = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { throw ExcerlockPolicyError.appGroupUnavailable }; return u }
  private func policyURL() throws -> URL { try container().appendingPathComponent("enforcement-policy-v1.json") }
  private func lockURL() throws -> URL { try container().appendingPathComponent("enforcement-policy-v1.lock") }
  func locked<T>(_ body: () throws -> T) throws -> T { let fd = open(try lockURL().path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR); guard fd >= 0 else { throw ExcerlockPolicyError.lockUnavailable }; guard flock(fd, LOCK_EX) == 0 else { close(fd); throw ExcerlockPolicyError.lockUnavailable }; defer { flock(fd, LOCK_UN); close(fd) }; return try body() }
  func readLocked() throws -> ExcerlockPolicyRecord { try JSONDecoder().decode(ExcerlockPolicyRecord.self, from: Data(contentsOf: try policyURL())) }
  func readIfPresentLocked() throws -> ExcerlockPolicyRecord? { let url = try policyURL(); guard FileManager.default.fileExists(atPath: url.path) else { return nil }; return try JSONDecoder().decode(ExcerlockPolicyRecord.self, from: Data(contentsOf: url)) }
  func writeLocked(_ value: ExcerlockPolicyRecord) throws { try JSONEncoder().encode(value).write(to: policyURL(), options: [.atomic]) }
  func currentSelectionPayload() -> String? { UserDefaults(suiteName: appGroup)?.dictionary(forKey: excerlockSelectionDefaultsKey)?[excerlockSelectionHandle] as? String }
  /** Decoded operator selection. Callers must not persist or log the tokens. */
  func currentSelection() -> FamilyActivitySelection? { try? selection(currentSelectionPayload()) }
  private func selection(_ payload: String?) throws -> FamilyActivitySelection {
    guard let payload,
          let data = FamilyActivitySelectionCodec.jsonData(fromPersistedPayload: payload),
          let value = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else { throw ExcerlockPolicyError.missingSelection }
    return value
  }

  private func apply(_ shield: Bool, record: inout ExcerlockPolicyRecord, initiator: String) throws {
    #if EXCERLOCK_LINKED_RECORDER_TRACE
    let operationId = UUID().uuidString.lowercased()
    LinkedTraceWriter.shared.recordDeferred(
      producer: Bundle.main.bundlePath.hasSuffix(".appex") ? .monitorExtension : .hostNative,
      eventType: .shieldWrite,
      operationId: operationId,
      payload: [
        "operation": shield ? "shield" : "unshield", "status": "attempt", "desired": shield,
        "initiator": initiator, "revision": record.revision
      ]
    )
    #endif

    do {
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      var applications = 0
      var webDomains = 0
      var applicationCategories = false
      var webDomainCategories = false
      #endif
      if shield {
        let s = try selection(record.selectionPayload)
        managed.shield.applications = s.applicationTokens
        managed.shield.webDomains = s.webDomainTokens
        managed.shield.applicationCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
        managed.shield.webDomainCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
        #if EXCERLOCK_LINKED_RECORDER_TRACE
        applications = s.applicationTokens.count
        webDomains = s.webDomainTokens.count
        applicationCategories = !s.categoryTokens.isEmpty
        webDomainCategories = !s.categoryTokens.isEmpty
        #endif
      } else {
        managed.shield.applications = nil
        managed.shield.webDomains = nil
        managed.shield.applicationCategories = nil
        managed.shield.webDomainCategories = nil
      }
      record.shielded = shield
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      let configured = !(managed.shield.applications ?? []).isEmpty ||
        !(managed.shield.webDomains ?? []).isEmpty ||
        managed.shield.applicationCategories != nil || managed.shield.webDomainCategories != nil
      LinkedTraceWriter.shared.recordDeferred(
        producer: Bundle.main.bundlePath.hasSuffix(".appex") ? .monitorExtension : .hostNative,
        eventType: .shieldWrite,
        operationId: operationId,
        payload: [
          "operation": shield ? "shield" : "unshield", "status": "returned", "desired": shield,
          "initiator": initiator, "revision": record.revision, "configured": configured,
          "applicationCount": applications, "webDomainCount": webDomains,
          "applicationCategoriesConfigured": applicationCategories,
          "webDomainCategoriesConfigured": webDomainCategories
        ]
      )
      #endif
    } catch {
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      LinkedTraceWriter.shared.recordDeferred(
        producer: Bundle.main.bundlePath.hasSuffix(".appex") ? .monitorExtension : .hostNative,
        eventType: .shieldWrite,
        operationId: operationId,
        payload: [
          "operation": shield ? "shield" : "unshield", "status": "rejected", "desired": shield,
          "initiator": initiator, "revision": record.revision,
          "reason": error is ExcerlockPolicyError ? "policy_error" : "native_error"
        ]
      )
      #endif
      throw error
    }
  }

  func apply(shield: Bool, revision: Int) throws -> Bool { try locked { var r = try readLocked(); guard r.revision == revision else { return false }; try apply(shield, record: &r, initiator: "host"); try writeLocked(r); return true } }
  func handleWatchdog(_ id: String, now: Double = Date().timeIntervalSince1970 * 1000) throws -> Bool { try handleWatchdogResult(id, now: now).applied }
  func handleWatchdogResult(_ id: String, now: Double = Date().timeIntervalSince1970 * 1000) throws -> ExcerlockCallbackResult { try locked {
    var r = try readLocked()
    guard r.version == excerlockPolicyVersion else { return .init(applied: false, reason: "policy_version") }
    guard r.state == "conditional" else { return .init(applied: false, reason: "not_conditional") }
    guard r.committedId == id else { return .init(applied: false, reason: "not_committed") }
    guard let m = r.registrations[id], m.committed else { return .init(applied: false, reason: "registration_missing") }
    guard m.policyGeneration == r.policyGeneration, m.accountGeneration == r.accountGeneration, m.selectionVersion == r.selectionVersion else { return .init(applied: false, reason: "generation_mismatch") }
    guard now >= (m.fireAt != nil ? m.registeredAt + excerlockWatchdogEarliestMs : m.end) else { return .init(applied: false, reason: "before_end") }
    guard now < m.eligibleUntil, now < r.eligibleUntil else { return .init(applied: false, reason: "ineligible") }
    guard r.windows.isEmpty || r.windows.values.contains(where: { windowActive($0, now: now) }) else { return .init(applied: false, reason: "outside_window") }
    try apply(true, record: &r, initiator: "watchdog"); try writeLocked(r)
    return .init(applied: true, reason: "applied")
  }}
  func handleWindow(_ id: String, started: Bool, now: Double = Date().timeIntervalSince1970 * 1000) throws -> Bool { try handleWindowResult(id, started: started, now: now).applied }
  func handleWindowResult(_ id: String, started: Bool, now: Double = Date().timeIntervalSince1970 * 1000) throws -> ExcerlockCallbackResult { try locked {
    var r = try readLocked()
    guard let w = r.windows[id] else { return .init(applied: false, reason: "window_missing") }
    guard w.revision == r.revision, w.policyGeneration == r.policyGeneration, w.accountGeneration == r.accountGeneration, w.selectionVersion == r.selectionVersion else { return .init(applied: false, reason: "generation_mismatch") }
    if started {
      let indefinitelySuppressed = ["lapsed", "disabled", "deleting"].contains(r.openReason ?? "")
      let earnedStillValid = r.openReason == "earned" && now < r.eligibleUntil
      let liveConditional = r.state == "conditional" && now < r.eligibleUntil
      guard r.futureEnforcementEligible else { return .init(applied: false, reason: "future_ineligible") }
      guard !indefinitelySuppressed else { return .init(applied: false, reason: "suppressed") }
      guard !earnedStillValid else { return .init(applied: false, reason: "earned") }
      guard !liveConditional else { return .init(applied: false, reason: "live_conditional") }
      guard windowActive(w, now: now) else { return .init(applied: false, reason: "outside_window") }
      try apply(true, record: &r, initiator: "window")
    } else {
      let active = r.windows.values.contains { windowActive($0, now: now) }
      guard !active else { return .init(applied: false, reason: "another_window_active") }
      guard r.openReason != "earned" else { return .init(applied: false, reason: "earned") }
      guard r.openReason != "lapsed" else { return .init(applied: false, reason: "lapsed") }
      guard r.openReason != "disabled" else { return .init(applied: false, reason: "disabled") }
      guard r.openReason != "deleting" else { return .init(applied: false, reason: "deleting") }
      try apply(false, record: &r, initiator: "window")
    }
    try writeLocked(r); return .init(applied: true, reason: "applied")
  }}
  private func windowActive(_ w: ExcerlockScheduledWindow, now: Double) -> Bool {
    let calendar = Calendar.autoupdatingCurrent
    func weeklySecond(_ date: Date) -> Int { let c = calendar.dateComponents([.weekday, .hour, .minute, .second], from: date); return ((c.weekday ?? 1) - 1) * 86_400 + (c.hour ?? 0) * 3_600 + (c.minute ?? 0) * 60 + (c.second ?? 0) }
    let current = weeklySecond(Date(timeIntervalSince1970: now / 1000)); let start = weeklySecond(Date(timeIntervalSince1970: w.start / 1000)); let end = weeklySecond(Date(timeIntervalSince1970: w.end / 1000))
    return end > start ? (current >= start && current < end) : (current >= start || current < end)
  }
}
