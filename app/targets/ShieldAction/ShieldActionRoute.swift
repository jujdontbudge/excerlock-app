import Foundation

struct ShieldActionRoute {
  static let causeDefaultsKey = "excerlock.shield.current-cause.v1"

  let cause: String
  let deepLink: String

  static func current(defaults: UserDefaults? = appGroupDefaults()) -> ShieldActionRoute {
    let cause = normalizedCause(defaults?.string(forKey: causeDefaultsKey))
    return ShieldActionRoute(cause: cause, deepLink: defaultDeepLink(for: cause))
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
}
