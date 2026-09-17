import ExpoModulesCore
import OSLog

/** Ordered cold-start stage boundaries shared with the JS callers.
 *
 * Raw values are both the names accepted by `markStartupStage` and the
 * os_signpost event names consumed by `scripts/startup-stage-medians.cjs`.
 * Keep them in sync with `STARTUP_STAGES` in `../index.ts`; the JS contract
 * test reads this file and fails on drift.
 */
private enum StartupStage: String, CaseIterable {
  case firstReactRender = "FirstReactRender"
  case hydrationDone = "HydrationDone"
  case runtimeReady = "RuntimeReady"
  case bootGateRedirect = "BootGateRedirect"
  case interactiveHome = "InteractiveHome"

  /// OSSignposter names must be compile-time constants; routing through a
  /// switch keeps them literal without a second lookup table.
  var signpostName: StaticString {
    switch self {
    case .firstReactRender: return "FirstReactRender"
    case .hydrationDone: return "HydrationDone"
    case .runtimeReady: return "RuntimeReady"
    case .bootGateRedirect: return "BootGateRedirect"
    case .interactiveHome: return "InteractiveHome"
    }
  }
}

private enum StartupDiagnostics {
  static let signposter = OSSignposter(subsystem: "com.johansardar.excerlock.startup", category: .pointsOfInterest)
  static let legacySignpostID = signposter.makeSignpostID()
  static let stageSignpostID = signposter.makeSignpostID()
  static let lock = NSLock()
  static var delegateMarked = false
  static var contentMarked = false
  static var legacyInterval: OSSignpostIntervalState?
  static var stageInterval: (name: StaticString, state: OSSignpostIntervalState)?
  static var markedStages: Set<StartupStage> = []
  /// Highest accepted stage index; stage events may skip a stage (a headless
  /// launch marks hydration/runtime before any React render) but never report
  /// an earlier boundary after a later one.
  static var highestStageIndex = -1

  static func markDelegate() {
    lock.lock(); defer { lock.unlock() }
    guard !delegateMarked else { return }
    delegateMarked = true
    signposter.emitEvent("AppDelegateEntry", id: stageSignpostID)
    if legacyInterval == nil {
      legacyInterval = signposter.beginInterval("DelegateToInteractiveHome", id: legacySignpostID)
    }
    beginStageIntervalLocked(name: "AppDelegateEntry")
  }

  /** React Native posts `RCTContentDidAppearNotification` after the root
   * component's first child mount. This is the native first-React-render
   * boundary; the legacy event name is preserved for existing trace consumers
   * and the JS `markStartupStage("FirstReactRender")` call is the same stage.
   */
  static func markContent() {
    lock.lock(); defer { lock.unlock() }
    if !contentMarked {
      contentMarked = true
      signposter.emitEvent("FirstReactChildMount", id: stageSignpostID)
    }
    _ = markStageLocked(.firstReactRender)
  }

  static func markHome() -> Bool {
    lock.lock(); defer { lock.unlock() }
    return markStageLocked(.interactiveHome)
  }

  static func mark(stageName: String) -> Bool {
    guard let stage = StartupStage(rawValue: stageName) else { return false }
    lock.lock(); defer { lock.unlock() }
    return markStageLocked(stage)
  }

  private static func markStageLocked(_ stage: StartupStage) -> Bool {
    if markedStages.contains(stage) { return true }
    guard let index = StartupStage.allCases.firstIndex(of: stage), index > highestStageIndex else { return false }
    // Home is the only stage with a semantic prerequisite: React must have
    // rendered for a laid-out Home boundary to mean anything.
    if stage == .interactiveHome && !markedStages.contains(.firstReactRender) { return false }
    markedStages.insert(stage)
    highestStageIndex = index
    endStageIntervalLocked()
    signposter.emitEvent(stage.signpostName, id: stageSignpostID)
    if stage == .interactiveHome {
      if let interval = legacyInterval {
        signposter.endInterval("DelegateToInteractiveHome", interval)
      }
      legacyInterval = nil
    } else {
      beginStageIntervalLocked(name: stage.signpostName)
    }
    return true
  }

  private static func endStageIntervalLocked() {
    guard let active = stageInterval else { return }
    signposter.endInterval(active.name, active.state)
    stageInterval = nil
  }

  private static func beginStageIntervalLocked(name: StaticString) {
    stageInterval = (name, signposter.beginInterval(name, id: stageSignpostID))
  }
}

@_cdecl("ExcerLockStartupMarkAppDelegateEntry")
public func ExcerLockStartupMarkAppDelegateEntry() { StartupDiagnostics.markDelegate() }
@_cdecl("ExcerLockStartupMarkFirstReactChildMount")
public func ExcerLockStartupMarkFirstReactChildMount() { StartupDiagnostics.markContent() }

public final class ExcerlockStartupModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcerlockStartup")
    Function("markInteractiveHome") { StartupDiagnostics.markHome() }
    Function("markStartupStage") { (stage: String) -> Bool in StartupDiagnostics.mark(stageName: stage) }
  }
}
