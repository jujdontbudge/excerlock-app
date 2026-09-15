import Foundation

/// When the native Trace Lab module must (re)install its UIApplication lifecycle
/// observers.
///
/// Observers exist only while a linked trace is active: they are installed when
/// a test starts and removed when it stops. A Trace Lab relaunch recreates the
/// native module with no observers while the durable trace is still active, so
/// the first status read after that relaunch must reinstall them — otherwise
/// every later background/foreground transition is missing from the trace. A
/// running test keeps polling its status, and a poll must never reinstall (or
/// reset) an observer set that already exists, or the evidence would record a
/// duplicate install anchor on every check.
///
/// Kept as a Foundation-only policy so the native writer harness can execute it.
enum LinkedTraceLifecyclePolicy {
  static func shouldInstallObservers(observerCount: Int, sessionActive: Bool) -> Bool {
    observerCount == 0 && sessionActive
  }
}
