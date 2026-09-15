import ExpoModulesCore
import DeviceActivity
import Foundation
#if EXCERLOCK_LINKED_RECORDER_TRACE
import CoreMotion
import FamilyControls
import UIKit
#endif

struct EnforcementContextInput: Record { @Field var policyGeneration: Int = 0; @Field var accountGeneration: Int = 0; @Field var selectionVersion: String = "" }
struct EnforcementSnapshotInput: Record { @Field var revision: Int = 0; @Field var now: Double = 0; @Field var context = EnforcementContextInput(); @Field var state: String = "unknown"; @Field var relief: String?; @Field var eligibleUntil: Double = 0; @Field var openReason: String?; @Field var futureEnforcementEligible: Bool = false }
struct WatchdogInput: Record { @Field var start: Double = 0; @Field var end: Double = 0; @Field var registeredAt: Double = 0; @Field var eligibleUntil: Double = 0; @Field var policyGeneration: Int = 0; @Field var accountGeneration: Int = 0; @Field var selectionVersion: String = "" }
struct WindowInput: Record { @Field var id: String = ""; @Field var start: Double = 0; @Field var end: Double = 0 }

public final class ExcerlockEnforcementModule: Module {
  #if EXCERLOCK_LINKED_RECORDER_TRACE
  private var linkedTraceLifecycleObservers: [NSObjectProtocol] = []
  private var linkedTraceLifecycleState = "unknown"
  #endif

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
    #if EXCERLOCK_LINKED_RECORDER_TRACE
    Function("startLinkedTrace") { (sessionId: String, nonce: String) throws -> [String: Any] in
      let status = try LinkedTraceWriter.shared.startSession(sessionId: sessionId, nonce: nonce)
      self.installLinkedTraceLifecycleObserversOnMain()
      _ = LinkedTraceWriter.shared.record(producer: .hostNative, eventType: .clockAnchor, payload: ["label": "session_started"])
      return self.linkedTraceStatusPayload(status)
    }
    Function("linkedTraceStatus") { () -> [String: Any] in
      // The screen reads status on boot, which is exactly when a relaunch has to
      // recover the lifecycle observers for a session that survived it.
      self.ensureLinkedTraceLifecycleObserversOnMain()
      return self.linkedTraceStatusPayload(LinkedTraceWriter.shared.status())
    }
    Function("linkedTracePreflight") { () -> [String: Any] in
      self.linkedTracePreflightPayload()
    }
    Function("recordLinkedTrace") { (eventType: String, operationId: String?, payload: [String: Any]) throws -> Bool in
      guard let type = LinkedTraceEventType(rawValue: eventType) else { throw LinkedTraceError.invalidEvent }
      LinkedTraceWriter.shared.recordDeferred(producer: .hostJS, eventType: type, operationId: operationId, payload: payload)
      return true
    }
    Function("stopLinkedTrace") { (sessionId: String, nonce: String) throws -> String in
      let url = try LinkedTraceWriter.shared.stopSession(sessionId: sessionId, nonce: nonce)
      self.removeLinkedTraceLifecycleObservers()
      return url.absoluteString
    }
    Function("deleteLinkedTrace") { (sessionId: String) throws -> Void in
      try LinkedTraceWriter.shared.deleteSession(sessionId: sessionId)
    }
    Function("linkedTraceFinalizedSessions") { () -> [[String: Any]] in
      LinkedTraceWriter.shared.finalizedSessions().map { session in
        [
          "sessionId": session.sessionId,
          "byteCount": session.byteCount,
          "finalizedAtWallTimeMs": session.finalizedAtWallTimeMs
        ]
      }
    }
    Function("exportLinkedTrace") { (sessionId: String) throws -> String in
      try LinkedTraceWriter.shared.exportFinalizedSession(sessionId: sessionId).absoluteString
    }
    Function("abandonExpiredLinkedTrace") { (sessionId: String) throws -> Void in
      try LinkedTraceWriter.shared.abandonExpiredSession(sessionId: sessionId)
    }
    OnDestroy {
      self.removeLinkedTraceLifecycleObservers()
      LinkedTraceWriter.shared.flush()
    }
    #endif
  }

  #if EXCERLOCK_LINKED_RECORDER_TRACE
  // The co-installed Walking Recorder bundle identifier. Selecting it (or Trace
  // Lab itself) as the shield target would deadlock the test, so the operator is
  // told at the point of need never to pick either research app.
  //
  // iOS never hands the host app the bundle identifiers behind a
  // FamilyActivitySelection: `applications` carries opaque tokens, so this
  // preflight can prove the shape of the selection (one app, no categories, no
  // websites) but can never prove which app was picked. The one-path UI says so
  // plainly instead of pretending a native check covers it.
  private func linkedTraceStatusPayload(_ status: LinkedTraceStatus) -> [String: Any] {
    [
      "active": status.active,
      "sessionId": status.sessionId ?? NSNull(),
      "expiresAtWallTimeMs": status.expiresAtWallTimeMs ?? NSNull(),
      "truncated": status.truncated
    ]
  }

  private func linkedTracePreflightPayload() -> [String: Any] {
    let selection = ExcerlockPolicyStore.shared.currentSelection()
    let canarySelectionValid = selection?.applications.count == 1 && selection?.categories.count == 0
      && selection?.webDomains.count == 0
    let screenTimeAuthorized = AuthorizationCenter.shared.authorizationStatus == .approved
    let motionAuthorized = CMMotionActivityManager.authorizationStatus() == .authorized
    let motionAvailable = CMMotionActivityManager.isActivityAvailable() &&
      CMPedometer.isCadenceAvailable() && CMPedometer.isStepCountingAvailable()
    let bundleIdentifier = Bundle.main.bundleIdentifier ?? ""
    let labContainerAvailable = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: linkedTraceAppGroup
    ) != nil
    let labStorageIsolated = labContainerAvailable &&
      linkedTraceAppGroup != excerlockProductionAppGroup &&
      linkedTraceAppGroup.contains(".lab.") && bundleIdentifier.contains(".lab.")
    return [
      "labStorageIsolated": labStorageIsolated,
      "screenTimeAuthorized": screenTimeAuthorized,
      "motionReady": motionAuthorized && motionAvailable,
      "canarySelectionValid": canarySelectionValid,
      "canaryApplicationCount": selection?.applications.count ?? 0,
      "canaryCategoryCount": selection?.categories.count ?? 0,
      "canaryWebDomainCount": selection?.webDomains.count ?? 0
    ]
  }

  private func installLinkedTraceLifecycleObserversOnMain() {
    if Thread.isMainThread {
      installLinkedTraceLifecycleObservers()
    } else {
      DispatchQueue.main.sync { self.installLinkedTraceLifecycleObservers() }
    }
  }

  /// Recovery path: Trace Lab relaunch recreates this module while the durable
  /// session is still active, so the first status read reinstalls the observers.
  /// Idempotent: an existing observer set is never rebuilt or re-announced.
  private func ensureLinkedTraceLifecycleObserversOnMain() {
    guard LinkedTraceLifecyclePolicy.shouldInstallObservers(
      observerCount: linkedTraceLifecycleObservers.count,
      sessionActive: LinkedTraceWriter.shared.status().active
    ) else { return }
    installLinkedTraceLifecycleObserversOnMain()
  }

  private func installLinkedTraceLifecycleObservers() {
    removeLinkedTraceLifecycleObservers()
    let center = NotificationCenter.default
    let transitions: [(Notification.Name, String)] = [
      (UIApplication.didBecomeActiveNotification, "active"),
      (UIApplication.willResignActiveNotification, "inactive"),
      (UIApplication.didEnterBackgroundNotification, "background"),
      (UIApplication.willEnterForegroundNotification, "foreground")
    ]
    linkedTraceLifecycleObservers = transitions.map { name, state in
      center.addObserver(forName: name, object: nil, queue: nil) { [weak self] _ in
        guard let self else { return }
        let previous = self.linkedTraceLifecycleState
        self.linkedTraceLifecycleState = state
        LinkedTraceWriter.shared.recordDeferred(
          producer: .hostNative,
          eventType: .appLifecycle,
          payload: ["layer": "native", "state": state, "previous": previous]
        )
      }
    }
    let state: String
    switch UIApplication.shared.applicationState {
    case .active: state = "active"
    case .inactive: state = "inactive"
    case .background: state = "background"
    @unknown default: state = "unknown"
    }
    linkedTraceLifecycleState = state
    LinkedTraceWriter.shared.recordDeferred(
      producer: .hostNative,
      eventType: .appLifecycle,
      payload: ["layer": "native", "state": state, "previous": "observer_installed"]
    )
  }

  private func removeLinkedTraceLifecycleObservers() {
    let center = NotificationCenter.default
    linkedTraceLifecycleObservers.forEach(center.removeObserver)
    linkedTraceLifecycleObservers = []
  }

  private func tracePolicy(_ input: EnforcementSnapshotInput, status: String, revision: Int?) {
    var payload: [String: Any] = [
      "layer": "native",
      // Only the writer's allowlisted policy_publish statuses; a suffixed
      // status would be rejected and silently drop the evidence.
      "status": status,
      "revision": revision ?? input.revision,
      "state": input.state,
      "eligibleUntilWallMs": input.eligibleUntil,
      "futureEnforcementEligible": input.futureEnforcementEligible,
      "policyGeneration": input.context.policyGeneration,
      "accountGeneration": input.context.accountGeneration,
      "selectionVersionHash": LinkedTraceWriter.shared.hashIdentifier(input.context.selectionVersion)
    ]
    if let relief = input.relief { payload["relief"] = relief }
    if let openReason = input.openReason { payload["openReason"] = openReason }
    LinkedTraceWriter.shared.recordDeferred(producer: .hostNative, eventType: .policyPublish, payload: payload)
  }

  private func traceWatchdog(
    operationId: String,
    operation: String,
    status: String,
    monitorId: String?,
    revision: Int,
    start: Double? = nil,
    end: Double? = nil,
    registeredAt: Double? = nil,
    eligibleUntil: Double? = nil,
    reason: String? = nil
  ) {
    var payload: [String: Any] = ["operation": operation, "status": status, "revision": revision]
    if let monitorId { payload["monitorIdHash"] = LinkedTraceWriter.shared.hashIdentifier(monitorId) }
    if let start { payload["startWallMs"] = start }
    if let end { payload["endWallMs"] = end }
    if let registeredAt { payload["registeredAtWallMs"] = registeredAt }
    if let eligibleUntil { payload["eligibleUntilWallMs"] = eligibleUntil }
    if let reason { payload["reason"] = reason }
    LinkedTraceWriter.shared.recordDeferred(
      producer: .hostNative,
      eventType: .watchdogOperation,
      operationId: operationId,
      payload: payload
    )
  }
  #endif

  private func getPolicyRevision() throws -> Int { try ExcerlockPolicyStore.shared.locked { try ExcerlockPolicyStore.shared.readIfPresentLocked()?.revision ?? -1 } }
  private func publish(input: EnforcementSnapshotInput) throws -> [String] {
    #if EXCERLOCK_LINKED_RECORDER_TRACE
    var linkedTraceStatus = "rejected"
    tracePolicy(input, status: "attempt", revision: input.revision)
    defer { tracePolicy(input, status: linkedTraceStatus, revision: input.revision) }
    #endif
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
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      linkedTraceStatus = "returned"
      #endif
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
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      let linkedTraceOperationId = UUID().uuidString.lowercased()
      var linkedTraceStatus = "failed"
      traceWatchdog(operationId: linkedTraceOperationId, operation: "stage", status: "attempt", monitorId: id,
                    revision: revision, start: start, end: end, registeredAt: registeredAt, eligibleUntil: eligibleUntil)
      defer { traceWatchdog(operationId: linkedTraceOperationId, operation: "stage", status: linkedTraceStatus,
                            monitorId: id, revision: revision, start: start, end: end,
                            registeredAt: registeredAt, eligibleUntil: eligibleUntil) }
      #endif
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
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      linkedTraceStatus = "returned"
      #endif
      return id
  }

  private func commitWatchdog(id: String, revision: Int) throws -> Bool {
    #if EXCERLOCK_LINKED_RECORDER_TRACE
    let linkedTraceOperationId = UUID().uuidString.lowercased()
    traceWatchdog(operationId: linkedTraceOperationId, operation: "commit", status: "attempt", monitorId: id, revision: revision)
    #endif
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
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      traceWatchdog(operationId: linkedTraceOperationId, operation: "commit", status: committed ? "returned" : "rejected", monitorId: id, revision: revision)
      #endif
      return committed
  }

  private func cancelWatchdogs(revision: Int) throws -> Void {
    #if EXCERLOCK_LINKED_RECORDER_TRACE
    let linkedTraceOperationId = UUID().uuidString.lowercased()
    traceWatchdog(operationId: linkedTraceOperationId, operation: "cancel", status: "attempt", monitorId: nil, revision: revision)
    var linkedTraceStatus = "failed"
    defer { traceWatchdog(operationId: linkedTraceOperationId, operation: "cancel", status: linkedTraceStatus, monitorId: nil, revision: revision) }
    #endif
    var names: [String] = []
      try ExcerlockPolicyStore.shared.locked {
        var record = try ExcerlockPolicyStore.shared.readLocked()
        guard record.revision == revision else { throw ExcerlockPolicyError.staleRevision }
        names = Array(record.registrations.keys); record.registrations = [:]; record.committedId = nil
        try ExcerlockPolicyStore.shared.writeLocked(record)
      }
      if !names.isEmpty { DeviceActivityCenter().stopMonitoring(names.map { DeviceActivityName($0) }) }
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      linkedTraceStatus = "returned"
      #endif
  }

  private func replaceWindows(windows: [WindowInput], revision: Int) throws -> Void {
    guard windows.count <= 7 else { throw ExcerlockPolicyError.invalidSnapshot }
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
              end - start <= 8 * 24 * 60 * 60 * 1000 else { throw ExcerlockPolicyError.invalidSnapshot }
        staged.append(ExcerlockScheduledWindow(monitorId: excerlockWindowPrefix + UUID().uuidString,
          id: domainId, revision: revision, policyGeneration: context.0, accountGeneration: context.1,
          selectionVersion: context.2, start: start, end: end))
      }
      var started: [String] = []
      do {
        let calendar = Calendar.autoupdatingCurrent
        for window in staged {
          let startComponents = calendar.dateComponents([.weekday,.hour,.minute,.second], from: Date(timeIntervalSince1970: window.start / 1000))
          let endComponents = calendar.dateComponents([.weekday,.hour,.minute,.second], from: Date(timeIntervalSince1970: window.end / 1000))
          guard startComponents != endComponents else { throw ExcerlockPolicyError.invalidSnapshot }
          let schedule = DeviceActivitySchedule(
            intervalStart: startComponents, intervalEnd: endComponents, repeats: true)
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
