import Foundation
import DeviceActivity
import FamilyControls
import ManagedSettings

let excerlockBankDrainPrefix = "excerlock.bank-drain.v1."
let excerlockBankDrainTickMinutes = 1
let excerlockBankDrainFallbackTickMinutes = 5
private let bankDrainIntervalSeconds: Double = 24 * 60 * 60
private let bankDrainRecentTickLimit = 32

struct BankDrainTick: Codable {
  let usedMinutes: Double
  let observedAt: Double
}

struct BankDrainRecord: Codable {
  let version: Int
  let armId: String
  let armedAt: Double
  let bankMinutes: Double
  let tickMinutes: Int
  let selectionPayload: String
  var monitorId: String
  var intervalStart: Double
  var intervalEnd: Double
  var completedMinutes: Double
  var intervalOffsetSeconds: Int
  var intervalReachedSeconds: Int
  var observedAt: Double
  var phase: String
  var failure: String?
  var ticks: [BankDrainTick]
  var usedMinutes: Double { min(bankMinutes, completedMinutes + Double(intervalReachedSeconds - intervalOffsetSeconds) / 60) }
}

enum BankDrainError: Error, LocalizedError {
  case invalidMinutes, invalidTick, monitorBudget, authorization, continuationGap
  var errorDescription: String? {
    switch self {
    case .invalidMinutes: return "Bank minutes must be finite and nonnegative"
    case .invalidTick: return "Bank ticks must be one or five minutes"
    case .monitorBudget: return "DeviceActivity monitor budget exceeds 20"
    case .authorization: return "Bank drain needs Screen Time authorization"
    case .continuationGap: return "Bank drain continuation arrived after its next interval"
    }
  }
}

final class BankDrainStore {
  static let shared = BankDrainStore()
  private let policy = ExcerlockPolicyStore.shared
  private let managed = ManagedSettingsStore(named: ManagedSettingsStore.Name("ExcerLockBankDrain"))

  // This separate, additive App Group file never changes the shipped policy schema.
  // The policy flock serializes host arm/disarm and extension ticks.
  private func url() throws -> URL {
    guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: excerlockAppGroup)
    else { throw ExcerlockPolicyError.appGroupUnavailable }
    return container.appendingPathComponent("bank-drain-v1.json")
  }

  private func readLocked() throws -> BankDrainRecord? {
    let file = try url()
    guard FileManager.default.fileExists(atPath: file.path) else { return nil }
    return try JSONDecoder().decode(BankDrainRecord.self, from: Data(contentsOf: file))
  }

  private func writeLocked(_ record: BankDrainRecord) throws {
    try JSONEncoder().encode(record).write(to: url(), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }

  private func selection(_ record: BankDrainRecord) throws -> FamilyActivitySelection {
    try selection(record.selectionPayload)
  }

  private func selection(_ payload: String) throws -> FamilyActivitySelection {
    guard let data = FamilyActivitySelectionCodec.jsonData(fromPersistedPayload: payload)
    else { throw ExcerlockPolicyError.missingSelection }
    return try JSONDecoder().decode(FamilyActivitySelection.self, from: data)
  }

  private func shieldLocked(_ record: BankDrainRecord) throws {
    let selected = try selection(record)
    if record.usedMinutes >= record.bankMinutes {
      let defaults = UserDefaults(suiteName: excerlockAppGroup)
      defaults?.set("bankEmpty", forKey: "excerlock.shield.current-cause.v1")
      defaults?.set(["cause": "bankEmpty", "routeHomeAvailable": true],
                    forKey: "excerlock.shield.runtime-context.v1")
    } else {
      clearBankShieldContextLocked()
    }
    managed.shield.applications = selected.applicationTokens
    managed.shield.webDomains = selected.webDomainTokens
    managed.shield.applicationCategories = selected.categoryTokens.isEmpty ? nil : .specific(selected.categoryTokens)
    managed.shield.webDomainCategories = selected.categoryTokens.isEmpty ? nil : .specific(selected.categoryTokens)
  }

  private func monitorNames() -> [DeviceActivityName] {
    DeviceActivityCenter().activities.filter { $0.rawValue.hasPrefix(excerlockBankDrainPrefix) }
  }

  func disarm(baselineArmId: String? = nil, bookedMinutes: Double = 0) throws -> Bool {
    try policy.locked {
      if let baselineArmId, let record = try readLocked() {
        guard record.armId == baselineArmId, bookedMinutes.isFinite,
              bookedMinutes + 0.000_000_1 >= record.usedMinutes else { return false }
      }
      try disarmLocked()
      return true
    }
  }

  private func disarmLocked() throws {
    // Remove authority first, so a queued callback cannot resurrect the Bank.
    let file = try url()
    if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
    DeviceActivityCenter().stopMonitoring(monitorNames())
    managed.clearAllSettings()
    clearBankShieldContextLocked()
  }

  private func clearBankShieldContextLocked() {
    let defaults = UserDefaults(suiteName: excerlockAppGroup)
    if defaults?.string(forKey: "excerlock.shield.current-cause.v1") == "bankEmpty" {
      defaults?.removeObject(forKey: "excerlock.shield.current-cause.v1")
    }
    if defaults?.dictionary(forKey: "excerlock.shield.runtime-context.v1")?["cause"] as? String == "bankEmpty" {
      defaults?.removeObject(forKey: "excerlock.shield.runtime-context.v1")
    }
  }

  func arm(_ bankMinutes: Double, tickMinutes: Int = excerlockBankDrainTickMinutes, baselineArmId: String? = nil, bookedMinutes: Double = 0) throws {
    guard bankMinutes.isFinite, bankMinutes >= 0 else { throw BankDrainError.invalidMinutes }
    guard [1, excerlockBankDrainFallbackTickMinutes].contains(tickMinutes)
    else { throw BankDrainError.invalidTick }
    guard AuthorizationCenter.shared.authorizationStatus == .approved else { throw BankDrainError.authorization }
    try policy.locked {
      guard let payload = policy.currentSelectionPayload() else { throw ExcerlockPolicyError.missingSelection }
      let selected = try selection(payload)
      guard !selected.applicationTokens.isEmpty || !selected.categoryTokens.isEmpty || !selected.webDomainTokens.isEmpty
      else { throw ExcerlockPolicyError.missingSelection }
      let now = Date().timeIntervalSince1970
      let previous = try readLocked()
      // Keep the interval anchor on purchases. The offset excludes usage the
      // caller has already booked; includesPastActivity catches late ticks from
      // that same interval without charging the recorded usage twice.
      let continuous = previous.map {
        $0.version == 1 && $0.selectionPayload == payload && $0.intervalEnd > ceil(now) * 1000 &&
          $0.intervalReachedSeconds < Int(bankDrainIntervalSeconds)
      } ?? false
      let booked = previous?.armId == baselineArmId && baselineArmId != nil ? bookedMinutes : 0
      guard booked.isFinite, booked >= 0, booked <= (previous?.usedMinutes ?? 0) + 0.000_000_1
      else { throw BankDrainError.invalidMinutes }
      let start = continuous ? previous!.intervalStart / 1000 : ceil(now)
      let end = continuous ? previous!.intervalEnd / 1000 : start + bankDrainIntervalSeconds
      let currentBookedSeconds = Int(max(0, ceil((booked - (previous?.completedMinutes ?? 0)) * 60 - 0.000_000_1)))
      let offset = continuous ? min(previous!.intervalReachedSeconds, previous!.intervalOffsetSeconds + currentBookedSeconds) : 0
      let pending = max(0, (continuous ? previous!.completedMinutes : previous?.usedMinutes ?? 0) - booked)
      let armId = UUID().uuidString.lowercased()
      var record = BankDrainRecord(
        version: 1, armId: armId, armedAt: now * 1000, bankMinutes: bankMinutes,
        tickMinutes: tickMinutes, selectionPayload: payload,
        monitorId: excerlockBankDrainPrefix + armId + "." + UUID().uuidString.lowercased(),
        intervalStart: start * 1000, intervalEnd: end * 1000,
        completedMinutes: pending, intervalOffsetSeconds: offset, intervalReachedSeconds: offset, observedAt: now * 1000,
        phase: pending >= bankMinutes ? "exhausted" : "armed", failure: nil, ticks: [])
      // Re-arm consumes one slot, never a second staged Bank slot.
      DeviceActivityCenter().stopMonitoring(monitorNames())
      try writeLocked(record)
      if record.phase == "exhausted" { try shieldLocked(record); return }
      do {
        try startLocked(record)
        managed.clearAllSettings()
        clearBankShieldContextLocked()
      } catch {
        try failLocked(&record, error: error)
        throw error
      }
    }
  }

  private func maximumThresholdSeconds(_ record: BankDrainRecord) -> Int {
    Int(min(ceil(max(0, record.bankMinutes - record.completedMinutes) * 60) + Double(record.intervalOffsetSeconds),
            (record.intervalEnd - record.intervalStart) / 1000))
  }

  private func startLocked(_ record: BankDrainRecord) throws {
    let center = DeviceActivityCenter()
    guard center.activities.count < excerlockMaxDeviceActivityMonitors else { throw BankDrainError.monitorBudget }
    let selected = try selection(record)
    let calendar = Calendar.autoupdatingCurrent
    let components: Set<Calendar.Component> = [.era, .year, .month, .day, .hour, .minute, .second]
    let schedule = DeviceActivitySchedule(
      intervalStart: calendar.dateComponents(components, from: Date(timeIntervalSince1970: record.intervalStart / 1000)),
      intervalEnd: calendar.dateComponents(components, from: Date(timeIntervalSince1970: record.intervalEnd / 1000)),
      repeats: false)
    let last = maximumThresholdSeconds(record)
    let step = record.tickMinutes * 60
    var events: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
    func add(_ seconds: Int) {
      events[DeviceActivityEvent.Name("second.\(seconds)")] = DeviceActivityEvent(
        applications: selected.applicationTokens, categories: selected.categoryTokens,
        webDomains: selected.webDomainTokens,
        threshold: DateComponents(minute: seconds / 60, second: seconds % 60), includesPastActivity: true)
    }
    for seconds in stride(from: record.intervalOffsetSeconds + step, to: last, by: step) { add(seconds) }
    add(last)
    try center.startMonitoring(DeviceActivityName(record.monitorId), during: schedule, events: events)
  }

  private func failLocked(_ record: inout BankDrainRecord, error: Error) throws {
    DeviceActivityCenter().stopMonitoring(monitorNames())
    record.phase = "failed"
    record.failure = error is BankDrainError ? "bank_registration" : "native_registration"
    record.observedAt = Date().timeIntervalSince1970 * 1000
    try writeLocked(record)
    try shieldLocked(record)
  }

  @discardableResult
  func reached(_ event: String, monitorId: String) throws -> Bool {
    try policy.locked {
      guard var record = try readLocked(), record.version == 1, record.phase == "armed", record.monitorId == monitorId,
            event.hasPrefix("second."), let seconds = Int(event.dropFirst("second.".count)), seconds > record.intervalOffsetSeconds,
            seconds <= maximumThresholdSeconds(record),
            seconds == maximumThresholdSeconds(record) || (seconds - record.intervalOffsetSeconds) % (record.tickMinutes * 60) == 0
      else { return false }
      // Threshold callbacks may be duplicated or delivered out of order.
      guard seconds > record.intervalReachedSeconds || record.usedMinutes >= record.bankMinutes else { return false }
      if seconds > record.intervalReachedSeconds {
        record.intervalReachedSeconds = seconds
        record.observedAt = Date().timeIntervalSince1970 * 1000
        record.ticks.append(BankDrainTick(usedMinutes: record.usedMinutes, observedAt: record.observedAt))
        if record.ticks.count > bankDrainRecentTickLimit { record.ticks.removeFirst(record.ticks.count - bankDrainRecentTickLimit) }
      }
      if record.usedMinutes >= record.bankMinutes {
        // Write the durable spend before applying the OS shield. A replay can
        // recover a shield write interrupted by process death.
        try writeLocked(record)
        try shieldLocked(record)
        record.phase = "exhausted"
      }
      try writeLocked(record)
      if record.phase == "exhausted" { DeviceActivityCenter().stopMonitoring([DeviceActivityName(monitorId)]) }
      return true
    }
  }

  func intervalEnded(_ monitorId: String) throws {
    try policy.locked {
      guard var record = try readLocked(), record.version == 1, record.phase == "armed", record.monitorId == monitorId,
            Date().timeIntervalSince1970 * 1000 >= record.intervalEnd else { return }
      if record.usedMinutes >= record.bankMinutes {
        try shieldLocked(record)
        record.phase = "exhausted"
        try writeLocked(record)
        return
      }
      record.completedMinutes = record.usedMinutes
      record.intervalOffsetSeconds = 0
      record.intervalReachedSeconds = 0
      record.intervalStart = record.intervalEnd
      record.intervalEnd += bankDrainIntervalSeconds * 1000
      record.monitorId = excerlockBankDrainPrefix + record.armId + "." + UUID().uuidString.lowercased()
      record.observedAt = Date().timeIntervalSince1970 * 1000
      DeviceActivityCenter().stopMonitoring([DeviceActivityName(monitorId)])
      try writeLocked(record)
      do {
        guard record.intervalEnd > record.observedAt else { throw BankDrainError.continuationGap }
        try startLocked(record)
      } catch { try failLocked(&record, error: error); throw error }
    }
  }

  func usage() throws -> [String: Any] {
    try policy.locked {
      let record = try readLocked()
      return ["usedMinutes": record?.usedMinutes ?? 0, "observedAt": iso(record?.observedAt ?? 0), "armId": record?.armId as Any? ?? NSNull(), "failed": record?.phase == "failed"]
    }
  }

  func diagnostics() throws -> [String: Any] {
    try policy.locked {
      let record = try readLocked()
      return [
        "armId": record?.armId as Any? ?? NSNull(),
        "available": true, "phase": record?.phase ?? "disarmed",
        "bankMinutes": record?.bankMinutes ?? 0, "usedMinutes": record?.usedMinutes ?? 0,
        "observedAt": iso(record?.observedAt ?? 0), "armedAt": record.map { iso($0.armedAt) } as Any? ?? NSNull(),
        "tickMinutes": record?.tickMinutes ?? excerlockBankDrainTickMinutes,
        "eventCount": record.map { Int(ceil(Double(maximumThresholdSeconds($0) - $0.intervalOffsetSeconds) / Double($0.tickMinutes * 60))) } ?? 0,
        "monitorRegistered": record.map { DeviceActivityCenter().activities.contains(DeviceActivityName($0.monitorId)) } ?? false,
        "activeMonitorCount": DeviceActivityCenter().activities.count,
        "shieldConfigured": !(managed.shield.applications ?? []).isEmpty || !(managed.shield.webDomains ?? []).isEmpty ||
          managed.shield.applicationCategories != nil || managed.shield.webDomainCategories != nil,
        "failure": record?.failure as Any? ?? NSNull(),
        "ticks": record?.ticks.map { ["usedMinutes": $0.usedMinutes, "observedAt": iso($0.observedAt)] as [String: Any] } ?? []
      ]
    }
  }

  private func iso(_ milliseconds: Double) -> String {
    let format = ISO8601DateFormatter()
    format.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return format.string(from: Date(timeIntervalSince1970: milliseconds / 1000))
  }
}
