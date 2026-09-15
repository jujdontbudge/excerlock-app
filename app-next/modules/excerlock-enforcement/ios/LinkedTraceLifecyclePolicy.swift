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

  /// One status read feeds both the screen payload and the observer
  /// reconciliation. Reading the writer again just to decide whether observers
  /// must be installed would repeat the same lock/prune work, and the two reads
  /// could disagree; this composition reads exactly once and passes that same
  /// status into the decision. The caller receives the identical value it just
  /// read, so the payload can never be built from a different snapshot than the
  /// one used for reconciliation.
  static func readStatusAndReconcile<Status>(
    observerCount: Int,
    readStatus: () -> Status,
    isActive: (Status) -> Bool,
    installObservers: () -> Void
  ) -> Status {
    let status = readStatus()
    if shouldInstallObservers(observerCount: observerCount, sessionActive: isActive(status)) {
      installObservers()
    }
    return status
  }
}
