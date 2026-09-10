import ExpoModulesCore
import DeviceActivity
import Foundation

struct EnforcementContextInput: Record { @Field var policyGeneration: Int = 0; @Field var accountGeneration: Int = 0; @Field var selectionVersion: String = "" }
struct EnforcementSnapshotInput: Record { @Field var revision: Int = 0; @Field var now: Double = 0; @Field var context = EnforcementContextInput(); @Field var state: String = "unknown"; @Field var relief: String?; @Field var eligibleUntil: Double = 0; @Field var openReason: String?; @Field var futureEnforcementEligible: Bool = false }
struct WatchdogInput: Record { @Field var start: Double = 0; @Field var end: Double = 0; @Field var registeredAt: Double = 0; @Field var eligibleUntil: Double = 0; @Field var policyGeneration: Int = 0; @Field var accountGeneration: Int = 0; @Field var selectionVersion: String = "" }
struct WindowInput: Record { @Field var id: String = ""; @Field var start: Double = 0; @Field var end: Double = 0 }

public final class ExcerlockEnforcementModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcerlockEnforcement")
    AsyncFunction("publish") { (input: EnforcementSnapshotInput) throws -> [String] in try self.publish(input: input) }
    AsyncFunction("shield") { (revision: Int) throws -> Bool in try self.shield(revision: revision) }
    AsyncFunction("unshield") { (revision: Int) throws -> Bool in try self.unshield(revision: revision) }
    AsyncFunction("stageWatchdog") { (plan: WatchdogInput, revision: Int) async throws -> String in try await self.stageWatchdog(plan: plan, revision: revision) }
    AsyncFunction("commitWatchdog") { (id: String, revision: Int) throws -> Bool in try self.commitWatchdog(id: id, revision: revision) }
    AsyncFunction("cancelWatchdogs") { (revision: Int) throws -> Void in try self.cancelWatchdogs(revision: revision) }
    AsyncFunction("replaceWindows") { (windows: [WindowInput], revision: Int) throws -> Void in try self.replaceWindows(windows: windows, revision: revision) }
    Function("getPolicyRevision") { () throws -> Int in try self.getPolicyRevision() }
  }
  private func getPolicyRevision() throws -> Int { try ExcerlockPolicyStore.shared.locked { try ExcerlockPolicyStore.shared.readIfPresentLocked()?.revision ?? -1 } }
  private func publish(input: EnforcementSnapshotInput) throws -> [String] {
    let store = ExcerlockPolicyStore.shared
      var stale: [String] = []
      try store.locked {
        let revision = input.revision; let state = input.state; let now = input.now; let eligibleUntil = input.eligibleUntil
        let policyGeneration = input.context.policyGeneration; let accountGeneration = input.context.accountGeneration; let selectionVersion = input.context.selectionVersion
        guard revision >= 0, !selectionVersion.isEmpty else { throw ExcerlockPolicyError.invalidSnapshot }
        let prior = try store.readIfPresentLocked()
        if let prior, revision < prior.revision { throw ExcerlockPolicyError.staleRevision }
        if let prior, revision == prior.revision {
          guard prior.state == state, prior.policyGeneration == policyGeneration,
                prior.accountGeneration == accountGeneration,
                prior.selectionVersion == selectionVersion,
                prior.eligibleUntil == eligibleUntil else { throw ExcerlockPolicyError.staleRevision }
        }
        var registrations = prior?.registrations ?? [:]
        let sameContext: (ExcerlockMonitorRegistration) -> Bool = {
          $0.policyGeneration == policyGeneration && $0.accountGeneration == accountGeneration && $0.selectionVersion == selectionVersion
        }
        let staleIds = registrations.filter { !$0.value.committed && $0.value.revision != revision }.map(\.key)
        stale.append(contentsOf: staleIds); staleIds.forEach { registrations.removeValue(forKey: $0) }
        var committedId: String? = nil
        if let id = prior?.committedId, state == "conditional", let registration = registrations[id], sameContext(registration), registration.end > now { committedId = id }
        if let old = prior?.committedId, committedId == nil { registrations.removeValue(forKey: old) }
        let record = ExcerlockPolicyRecord(
          version: excerlockPolicyVersion, revision: revision, publishedAt: now, state: state,
          relief: input.relief, eligibleUntil: eligibleUntil,
          openReason: input.openReason,
          futureEnforcementEligible: input.futureEnforcementEligible,
          policyGeneration: policyGeneration, accountGeneration: accountGeneration,
          selectionVersion: selectionVersion, selectionPayload: store.currentSelectionPayload(),
          registrations: registrations, committedId: committedId,
          windows: prior?.windows.filter { $0.value.policyGeneration == policyGeneration && $0.value.accountGeneration == accountGeneration && $0.value.selectionVersion == selectionVersion } ?? [:],
          shielded: prior?.shielded ?? false)
        try store.writeLocked(record)
      }
      if !stale.isEmpty { DeviceActivityCenter().stopMonitoring(stale.map { DeviceActivityName($0) }) }
      return stale
  }

  private func shield(revision: Int) throws -> Bool {
    try ExcerlockPolicyStore.shared.apply(shield: true, revision: revision)
  }

  private func unshield(revision: Int) throws -> Bool {
    try ExcerlockPolicyStore.shared.apply(shield: false, revision: revision)
  }

  private func stageWatchdog(plan: WatchdogInput, revision: Int) async throws -> String {
    let start = plan.start; let end = plan.end; let registeredAt = plan.registeredAt; let eligibleUntil = plan.eligibleUntil
      let policyGeneration = plan.policyGeneration; let accountGeneration = plan.accountGeneration; let selectionVersion = plan.selectionVersion
      guard end - start >= 15 * 60 * 1000, end > Date().timeIntervalSince1970 * 1000,
            end <= eligibleUntil else { throw ExcerlockPolicyError.invalidSnapshot }
      let id = excerlockWatchdogPrefix + "stage." + UUID().uuidString
      let registration = ExcerlockMonitorRegistration(id: id, revision: revision,
        policyGeneration: policyGeneration, accountGeneration: accountGeneration,
        selectionVersion: selectionVersion, start: start, end: end,
        registeredAt: registeredAt, eligibleUntil: eligibleUntil, committed: false)
      try ExcerlockPolicyStore.shared.locked {
        var record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision, record.state == "conditional", record.policyGeneration == policyGeneration, record.accountGeneration == accountGeneration, record.selectionVersion == selectionVersion else { throw ExcerlockPolicyError.staleRevision }
        guard DeviceActivityCenter().activities.count < 20 else { throw ExcerlockPolicyError.invalidSnapshot }
        record.registrations[id] = registration
        try ExcerlockPolicyStore.shared.writeLocked(record)
      }
      do {
        let calendar = Calendar.autoupdatingCurrent
        let schedule = DeviceActivitySchedule(
          intervalStart: calendar.dateComponents([.era,.year,.month,.day,.hour,.minute,.second], from: Date(timeIntervalSince1970: start / 1000)),
          intervalEnd: calendar.dateComponents([.era,.year,.month,.day,.hour,.minute,.second], from: Date(timeIntervalSince1970: end / 1000)), repeats: false)
        try DeviceActivityCenter().startMonitoring(DeviceActivityName(id), during: schedule)
        let stillCurrent = try ExcerlockPolicyStore.shared.locked { () -> Bool in
          let record = try ExcerlockPolicyStore.shared.readLocked()
          return record.revision == revision && record.state == "conditional" &&
            record.policyGeneration == policyGeneration && record.accountGeneration == accountGeneration &&
            record.selectionVersion == selectionVersion && record.registrations[id] != nil
        }
        if !stillCurrent {
          DeviceActivityCenter().stopMonitoring([DeviceActivityName(id)])
          throw ExcerlockPolicyError.staleRevision
        }
      } catch {
        try? ExcerlockPolicyStore.shared.locked {
          var record = try ExcerlockPolicyStore.shared.readLocked(); record.registrations.removeValue(forKey: id); try ExcerlockPolicyStore.shared.writeLocked(record)
        }
        throw error
      }
      return id
  }

  private func commitWatchdog(id: String, revision: Int) throws -> Bool {
    var retire: [String] = []
      let committed = try ExcerlockPolicyStore.shared.locked {
        var record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision, record.state == "conditional", var staged = record.registrations[id], !staged.committed,
              staged.end > Date().timeIntervalSince1970 * 1000,
              DeviceActivityCenter().activities.contains(DeviceActivityName(id)) else {
          record.registrations.removeValue(forKey: id); try ExcerlockPolicyStore.shared.writeLocked(record)
          DeviceActivityCenter().stopMonitoring([DeviceActivityName(id)])
          return false
        }
        staged.committed = true; record.registrations[id] = staged
        if let old = record.committedId, old != id { retire.append(old); record.registrations.removeValue(forKey: old) }
        record.committedId = id; try ExcerlockPolicyStore.shared.writeLocked(record); return true
      }
      if committed && !retire.isEmpty { DeviceActivityCenter().stopMonitoring(retire.map { DeviceActivityName($0) }) }
      return committed
  }

  private func cancelWatchdogs(revision: Int) throws -> Void {
    var names: [String] = []
      try ExcerlockPolicyStore.shared.locked {
        var record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision else { throw ExcerlockPolicyError.staleRevision }
        names = Array(record.registrations.keys); record.registrations = [:]; record.committedId = nil
        try ExcerlockPolicyStore.shared.writeLocked(record)
      }
      if !names.isEmpty { DeviceActivityCenter().stopMonitoring(names.map { DeviceActivityName($0) }) }
  }

  private func replaceWindows(windows: [WindowInput], revision: Int) throws -> Void {
    guard windows.count <= 7 else { throw ExcerlockPolicyError.invalidSnapshot }
      let now = Date().timeIntervalSince1970 * 1000
      var staged: [ExcerlockScheduledWindow] = []
      let context = try ExcerlockPolicyStore.shared.locked { () -> (Int, Int, String) in
        let record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision else { throw ExcerlockPolicyError.staleRevision }
        return (record.policyGeneration, record.accountGeneration, record.selectionVersion)
      }
      for window in windows {
        let domainId = window.id; let start = window.start; let end = window.end
        guard !domainId.isEmpty,
              start.isFinite, end.isFinite, end > start, end - start >= 15 * 60 * 1000,
              end > now else { throw ExcerlockPolicyError.invalidSnapshot }
        staged.append(ExcerlockScheduledWindow(monitorId: excerlockWindowPrefix + UUID().uuidString,
          id: domainId, revision: revision, policyGeneration: context.0, accountGeneration: context.1,
          selectionVersion: context.2, start: start, end: end))
      }
      var started: [String] = []
      do {
        let calendar = Calendar.autoupdatingCurrent
        for window in staged {
          let schedule = DeviceActivitySchedule(
            intervalStart: calendar.dateComponents([.weekday,.hour,.minute,.second], from: Date(timeIntervalSince1970: window.start / 1000)),
            intervalEnd: calendar.dateComponents([.weekday,.hour,.minute,.second], from: Date(timeIntervalSince1970: window.end / 1000)), repeats: true)
          try DeviceActivityCenter().startMonitoring(DeviceActivityName(window.monitorId), during: schedule)
          started.append(window.monitorId)
        }
      } catch { if !started.isEmpty { DeviceActivityCenter().stopMonitoring(started.map { DeviceActivityName($0) }) }; throw error }
      var retire: [String] = []
      do {
        try ExcerlockPolicyStore.shared.locked {
          var record = try ExcerlockPolicyStore.shared.readLocked()
          guard record.revision == revision, record.policyGeneration == context.0,
                record.accountGeneration == context.1, record.selectionVersion == context.2 else { throw ExcerlockPolicyError.staleRevision }
          retire = Array(record.windows.keys)
          record.windows = Dictionary(uniqueKeysWithValues: staged.map { ($0.monitorId, $0) })
          try ExcerlockPolicyStore.shared.writeLocked(record)
        }
      } catch { if !started.isEmpty { DeviceActivityCenter().stopMonitoring(started.map { DeviceActivityName($0) }) }; throw error }
      if !retire.isEmpty { DeviceActivityCenter().stopMonitoring(retire.map { DeviceActivityName($0) }) }
  }
}
