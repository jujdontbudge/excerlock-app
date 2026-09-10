import ExpoModulesCore
import OSLog

private enum StartupDiagnostics {
  static let signposter = OSSignposter(subsystem: "com.johansardar.excerlock.startup", category: .pointsOfInterest)
  static let signpostID = signposter.makeSignpostID()
  static let lock = NSLock()
  static var interval: OSSignpostIntervalState?
  static var delegateMarked = false
  static var contentMarked = false
  static var homeMarked = false

  static func markDelegate() {
    lock.lock(); defer { lock.unlock() }
    guard !delegateMarked else { return }
    delegateMarked = true
    interval = signposter.beginInterval("DelegateToInteractiveHome", id: signpostID)
    signposter.emitEvent("AppDelegateEntry", id: signpostID)
  }
  static func markContent() {
    lock.lock(); defer { lock.unlock() }
    guard delegateMarked, !contentMarked else { return }
    contentMarked = true
    signposter.emitEvent("FirstReactChildMount", id: signpostID)
  }
  static func markHome() -> Bool {
    lock.lock(); defer { lock.unlock() }
    if homeMarked { return true }
    guard delegateMarked, contentMarked else { return false }
    homeMarked = true
    signposter.emitEvent("InteractiveHome", id: signpostID)
    if let interval { signposter.endInterval("DelegateToInteractiveHome", interval) }
    interval = nil
    return true
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
  }
}
