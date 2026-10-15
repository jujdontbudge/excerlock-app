import Foundation

struct ShieldActionRoute {
  static let causeDefaultsKey = "excerlock.shield.current-cause.v1"
  static let runtimeContextDefaultsKey = "excerlock.shield.runtime-context.v1"

  let cause: String
  let deepLink: String
  let routeHomeAvailable: Bool

  static func current(defaults: UserDefaults? = appGroupDefaults()) -> ShieldActionRoute {
    let cause = normalizedCause(defaults?.string(forKey: causeDefaultsKey))
    let context = defaults?.dictionary(forKey: runtimeContextDefaultsKey)
    let routeHomeAvailable =
      context?["cause"] as? String == cause &&
      context?["routeHomeAvailable"] as? Bool == true
    return ShieldActionRoute(
      cause: cause,
      deepLink: defaultDeepLink(for: cause),
      routeHomeAvailable: routeHomeAvailable
    )
  }

  private static func appGroupDefaults() -> UserDefaults? {
    guard
      let appGroup = Bundle.main.object(
        forInfoDictionaryKey: "REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP"
      ) as? String,
      !appGroup.isEmpty
    else {
      return nil
    }

    return UserDefaults(suiteName: appGroup)
  }

  private static func normalizedCause(_ value: String?) -> String {
    switch value {
    case "balanceEmpty", "bankEmpty", "fullLock", "lockWindow", "walkAndScrollEnded":
      return value!
    default:
      return "balanceEmpty"
    }
  }

  private static func defaultDeepLink(for cause: String) -> String {
    switch cause {
    case "bankEmpty":
      return "excerlock://shop"
    case "fullLock", "lockWindow":
      return "excerlock://home"
    default:
      return cause == "walkAndScrollEnded" ? "excerlock://unlock/propped" : "excerlock://home"
    }
  }
}
