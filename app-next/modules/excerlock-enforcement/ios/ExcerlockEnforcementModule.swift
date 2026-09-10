import ExpoModulesCore
import DeviceActivity
import Foundation

public final class ExcerlockEnforcementModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcerlockEnforcement")

    AsyncFunction("publish") { (input: [String: Any]) throws -> [String] in
      let store = ExcerlockPolicyStore.shared
      var stale: [String] = []
      try store.locked {
        guard let revision = input["revision"] as? Int,
              let state = input["state"] as? String,
              let now = input["now"] as? Double,
              let eligibleUntil = input["eligibleUntil"] as? Double,
              let context = input["context"] as? [String: Any],
              let policyGeneration = context["policyGeneration"] as? Int,
              let accountGeneration = context["accountGeneration"] as? Int,
              let selectionVersion = context["selectionVersion"] as? String,
              revision >= 0, !selectionVersion.isEmpty else { throw ExcerlockPolicyError.invalidSnapshot }
        let prior = try store.readIfPresentLocked()
        if let prior, revision <= prior.revision { throw ExcerlockPolicyError.staleRevision }
        var registrations = prior?.registrations ?? [:]
        let sameContext: (ExcerlockMonitorRegistration) -> Bool = {
          $0.policyGeneration == policyGeneration && $0.accountGeneration == accountGeneration && $0.selectionVersion == selectionVersion
        }
        let staleIds = registrations.filter { !$0.value.committed && $0.value.revision != revision }.map(\.key)
        stale.append(contentsOf: staleIds); staleIds.forEach { registrations.removeValue(forKey: $0) }
        let committedId = prior?.committedId.flatMap { id in
          guard state == "conditional", let registration = registrations[id], sameContext(registration), registration.end > now else { return nil }
          return id
        }
        if let old = prior?.committedId, committedId == nil { registrations.removeValue(forKey: old) }
        let record = ExcerlockPolicyRecord(
          version: excerlockPolicyVersion, revision: revision, publishedAt: now, state: state,
          relief: input["relief"] as? String, eligibleUntil: eligibleUntil,
          openReason: input["openReason"] as? String,
          futureEnforcementEligible: input["futureEnforcementEligible"] as? Bool ?? false,
          policyGeneration: policyGeneration, accountGeneration: accountGeneration,
          selectionVersion: selectionVersion, selectionPayload: store.currentSelectionPayload(),
          registrations: registrations, committedId: committedId,
          windows: prior?.windows.filter { $0.value.policyGeneration == policyGeneration && $0.value.accountGeneration == accountGeneration && $0.value.selectionVersion == selectionVersion } ?? [:],
          shielded: prior?.shielded ?? false)
        try store.writeLocked(record)
      }
      if !stale.isEmpty { DeviceActivityCenter().stopMonitoring(stale.map(DeviceActivityName.init)) }
      return stale
    }

    AsyncFunction("shield") { (revision: Int) throws -> Bool in try ExcerlockPolicyStore.shared.apply(shield: true, revision: revision) }
    AsyncFunction("unshield") { (revision: Int) throws -> Bool in try ExcerlockPolicyStore.shared.apply(shield: false, revision: revision) }

    AsyncFunction("stageWatchdog") { (plan: [String: Any], revision: Int) async throws -> String in
      guard let start = plan["start"] as? Double, let end = plan["end"] as? Double,
            let registeredAt = plan["registeredAt"] as? Double, let eligibleUntil = plan["eligibleUntil"] as? Double,
            let policyGeneration = plan["policyGeneration"] as? Int,
            let accountGeneration = plan["accountGeneration"] as? Int,
            let selectionVersion = plan["selectionVersion"] as? String,
            end - start >= 15 * 60 * 1000, end > Date().timeIntervalSince1970 * 1000,
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
      } catch {
        try? ExcerlockPolicyStore.shared.locked {
          var record = try ExcerlockPolicyStore.shared.readLocked(); record.registrations.removeValue(forKey: id); try ExcerlockPolicyStore.shared.writeLocked(record)
        }
        throw error
      }
      return id
    }

    AsyncFunction("commitWatchdog") { (id: String, revision: Int) throws -> Bool in
      var retire: [String] = []
      let committed = try ExcerlockPolicyStore.shared.locked {
        var record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision, record.state == "conditional", var staged = record.registrations[id], !staged.committed else { return false }
        staged.committed = true; record.registrations[id] = staged
        if let old = record.committedId, old != id { retire.append(old); record.registrations.removeValue(forKey: old) }
        record.committedId = id; try ExcerlockPolicyStore.shared.writeLocked(record); return true
      }
      if committed && !retire.isEmpty { DeviceActivityCenter().stopMonitoring(retire.map(DeviceActivityName.init)) }
      return committed
    }

    AsyncFunction("cancelWatchdogs") { (revision: Int) throws -> Void in
      var names: [String] = []
      try ExcerlockPolicyStore.shared.locked {
        var record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision else { throw ExcerlockPolicyError.staleRevision }
        names = Array(record.registrations.keys); record.registrations = [:]; record.committedId = nil
        try ExcerlockPolicyStore.shared.writeLocked(record)
      }
      if !names.isEmpty { DeviceActivityCenter().stopMonitoring(names.map(DeviceActivityName.init)) }
    }

    AsyncFunction("replaceWindows") { (windows: [[String: Any]], revision: Int) throws -> Void in
      guard windows.count <= 7 else { throw ExcerlockPolicyError.invalidSnapshot }
      let now = Date().timeIntervalSince1970 * 1000
      var staged: [ExcerlockScheduledWindow] = []
      let context = try ExcerlockPolicyStore.shared.locked { () -> (Int, Int, String) in
        let record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision else { throw ExcerlockPolicyError.staleRevision }
        return (record.policyGeneration, record.accountGeneration, record.selectionVersion)
      }
      for window in windows {
        guard let domainId = window["id"] as? String, !domainId.isEmpty,
              let start = window["start"] as? Double, let end = window["end"] as? Double,
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
}
