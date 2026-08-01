import Foundation

private let lockWindowContextsKey = "excerlock.shield.lock-window-contexts.v1"
private let currentShieldCauseKey = "excerlock.shield.current-cause.v1"
private let shieldRuntimeContextKey = "excerlock.shield.runtime-context.v1"

/// Commits the context before the cause so a newly selected lock-window shield
/// never reads runtime data belonging to the previous cause.
func publishLockWindowShieldContext(activityName: String) {
  guard
    let contexts = userDefaults?.dictionary(forKey: lockWindowContextsKey),
    let context = contexts[activityName] as? [String: Any],
    context["cause"] as? String == "lockWindow"
  else {
    return
  }

  userDefaults?.set(context, forKey: shieldRuntimeContextKey)
  userDefaults?.set("lockWindow", forKey: currentShieldCauseKey)
}
