import Foundation

struct ShieldActionRoute {
  static let causeDefaultsKey = "excerlock.shield.current-cause.v1"
  static let runtimeContextDefaultsKey = "excerlock.shield.runtime-context.v1"
  static let copyOverridesDefaultsKey = "excerlock.shield.copy-overrides.v1"

  let cause: String
  let deepLink: String

  static func current(defaults: UserDefaults? = appGroupDefaults()) -> ShieldActionRoute {
    let cause = normalizedCause(defaults?.string(forKey: causeDefaultsKey))
    var deepLink = defaultDeepLink(for: cause)

    if
      let overrides = defaults?.dictionary(forKey: copyOverridesDefaultsKey),
      let causeOverride = overrides[cause] as? [String: Any],
      let overrideDeepLink = safeDeepLink(causeOverride["deepLink"])
    {
      deepLink = overrideDeepLink
    }

    if
      let context = defaults?.dictionary(forKey: runtimeContextDefaultsKey),
      context["cause"] as? String == cause,
      let contextDeepLink = safeDeepLink(context["deepLink"])
    {
      deepLink = contextDeepLink
    }

    return ShieldActionRoute(cause: cause, deepLink: deepLink)
  }

  private static func appGroupDefaults() -> UserDefaults? {
    guard
      let appGroup = Bundle.main.object(forInfoDictionaryKey: "EXPO_APP_GROUP") as? String,
      !appGroup.isEmpty
    else {
      return nil
    }

    return UserDefaults(suiteName: appGroup)
  }

  private static func normalizedCause(_ value: String?) -> String {
    switch value {
    case "balanceEmpty", "fullLock", "lockWindow", "walkAndScrollEnded":
      return value!
    default:
      return "balanceEmpty"
    }
  }

  private static func defaultDeepLink(for cause: String) -> String {
    switch cause {
    case "fullLock", "lockWindow":
      return "excerlock://locked-apps"
    default:
      return "excerlock://"
    }
  }

  private static func safeDeepLink(_ value: Any?) -> String? {
    guard let deepLink = value as? String, deepLink.hasPrefix("excerlock://") else {
      return nil
    }

    return deepLink
  }
}
