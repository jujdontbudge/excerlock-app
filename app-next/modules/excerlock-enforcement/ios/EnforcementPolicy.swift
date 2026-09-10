import Foundation
import FamilyControls
import ManagedSettings
import Darwin

let excerlockPolicyVersion = 1
let excerlockSelectionHandle = "excerlock.locked-selection.v1"
let excerlockSelectionDefaultsKey = "familyActivitySelectionIds"
let excerlockWatchdogPrefix = "excerlock.watchdog."
let excerlockWindowPrefix = "excerlock.window."

struct ExcerlockMonitorRegistration: Codable, Equatable {
  let id: String; let revision: Int; let policyGeneration: Int; let accountGeneration: Int
  let selectionVersion: String; let start: Double; let end: Double; let registeredAt: Double
  let eligibleUntil: Double; var committed: Bool
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
  private let appGroup = "group.com.johansardar.excerlock"
  private let managed = ManagedSettingsStore(named: ManagedSettingsStore.Name("ExcerLockEnforcement"))
  private func container() throws -> URL { guard let u = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { throw ExcerlockPolicyError.appGroupUnavailable }; return u }
  private func policyURL() throws -> URL { try container().appendingPathComponent("enforcement-policy-v1.json") }
  private func lockURL() throws -> URL { try container().appendingPathComponent("enforcement-policy-v1.lock") }
  func locked<T>(_ body: () throws -> T) throws -> T { let fd = open(try lockURL().path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR); guard fd >= 0 else { throw ExcerlockPolicyError.lockUnavailable }; guard flock(fd, LOCK_EX) == 0 else { close(fd); throw ExcerlockPolicyError.lockUnavailable }; defer { flock(fd, LOCK_UN); close(fd) }; return try body() }
  func readLocked() throws -> ExcerlockPolicyRecord { try JSONDecoder().decode(ExcerlockPolicyRecord.self, from: Data(contentsOf: try policyURL())) }
  func readIfPresentLocked() throws -> ExcerlockPolicyRecord? { let url = try policyURL(); guard FileManager.default.fileExists(atPath: url.path) else { return nil }; return try JSONDecoder().decode(ExcerlockPolicyRecord.self, from: Data(contentsOf: url)) }
  func writeLocked(_ value: ExcerlockPolicyRecord) throws { try JSONEncoder().encode(value).write(to: policyURL(), options: [.atomic]) }
  func currentSelectionPayload() -> String? { UserDefaults(suiteName: appGroup)?.dictionary(forKey: excerlockSelectionDefaultsKey)?[excerlockSelectionHandle] as? String }
  private func selection(_ payload: String?) throws -> FamilyActivitySelection { guard let payload, let data = payload.data(using: .utf8), let value = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else { throw ExcerlockPolicyError.missingSelection }; return value }
  private func apply(_ shield: Bool, record: inout ExcerlockPolicyRecord) throws {
    if shield { let s = try selection(record.selectionPayload); managed.shield.applications = s.applicationTokens; managed.shield.webDomains = s.webDomainTokens; managed.shield.applicationCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens); managed.shield.webDomainCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens) }
    else { managed.shield.applications = nil; managed.shield.webDomains = nil; managed.shield.applicationCategories = nil; managed.shield.webDomainCategories = nil }
    record.shielded = shield
  }
  func apply(shield: Bool, revision: Int) throws -> Bool { try locked { var r = try readLocked(); guard r.revision == revision else { return false }; try apply(shield, record: &r); try writeLocked(r); return true } }
  func handleWatchdog(_ id: String, now: Double = Date().timeIntervalSince1970 * 1000) throws -> Bool { try locked { var r = try readLocked(); guard r.version == excerlockPolicyVersion, r.state == "conditional", r.committedId == id, let m = r.registrations[id], m.committed, m.policyGeneration == r.policyGeneration, m.accountGeneration == r.accountGeneration, m.selectionVersion == r.selectionVersion, now >= m.end, now < m.eligibleUntil, now < r.eligibleUntil, (r.windows.isEmpty || r.windows.values.contains { windowActive($0, now: now) }) else { return false }; try apply(true, record: &r); try writeLocked(r); return true } }
  func handleWindow(_ id: String, started: Bool, now: Double = Date().timeIntervalSince1970 * 1000) throws -> Bool { try locked { var r = try readLocked(); guard let w = r.windows[id], w.revision == r.revision, w.policyGeneration == r.policyGeneration, w.accountGeneration == r.accountGeneration, w.selectionVersion == r.selectionVersion else { return false }
    if started { guard r.futureEnforcementEligible, r.openReason == "outsideWindow", windowActive(w, now: now) else { return false }; try apply(true, record: &r) }
    else { let active = r.windows.values.contains { windowActive($0, now: now) }; guard !active, r.openReason != "earned", r.openReason != "lapsed", r.openReason != "disabled", r.openReason != "deleting" else { return false }; try apply(false, record: &r) }
    try writeLocked(r); return true
  }}
  private func windowActive(_ w: ExcerlockScheduledWindow, now: Double) -> Bool { let week = 7.0 * 24 * 60 * 60 * 1000; let offset = ((now - w.start).truncatingRemainder(dividingBy: week) + week).truncatingRemainder(dividingBy: week); let duration = w.end - w.start; return offset >= 0 && offset < duration }
}
