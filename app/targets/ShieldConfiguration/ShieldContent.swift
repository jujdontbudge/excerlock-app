import Foundation

enum ShieldCause: String, CaseIterable {
  case balanceEmpty
  case fullLock
  case lockWindow
  case walkAndScrollEnded
}

struct ShieldVariant: Decodable, Equatable {
  var deepLink: String
  var primaryActionLabel: String
  var secondaryActionLabel: String
  var subtitle: String
  var title: String
}

struct ResolvedShieldContent {
  let cause: ShieldCause
  let variant: ShieldVariant
}

/// Reads fixed copy from ShieldContent.plist, then overlays app-group values.
///
/// The host's PostHog flag rail may write copy overrides. A separate runtime
/// context holds only the policy-produced cause, cheapest real offer, and route.
/// No selected-app metadata crosses this store.
struct ShieldContentCatalog {
  static let currentCauseKey = "excerlock.shield.current-cause.v1"
  static let runtimeContextKey = "excerlock.shield.runtime-context.v1"
  static let copyOverridesKey = "excerlock.shield.copy-overrides.v1"

  private let defaults: [String: ShieldVariant]
  private let sharedDefaults: UserDefaults?

  init(bundle: Bundle = .main, sharedDefaults: UserDefaults? = Self.appGroupDefaults()) {
    defaults = Self.loadDefaults(from: bundle)
    self.sharedDefaults = sharedDefaults
  }

  func current() -> ResolvedShieldContent {
    let cause = currentCause()
    let fallback = defaults[cause.rawValue] ?? Self.emergencyDefaults[cause.rawValue]!
    let copyOverridden = applyingCopyOverride(to: fallback, cause: cause)
    let contextual = applyingRuntimeContext(to: copyOverridden, cause: cause)
    return ResolvedShieldContent(cause: cause, variant: contextual)
  }

  private func currentCause() -> ShieldCause {
    guard
      let rawValue = sharedDefaults?.string(forKey: Self.currentCauseKey),
      let cause = ShieldCause(rawValue: rawValue)
    else {
      return .balanceEmpty
    }
    return cause
  }

  private func applyingCopyOverride(
    to variant: ShieldVariant,
    cause: ShieldCause
  ) -> ShieldVariant {
    guard
      let overrides = sharedDefaults?.dictionary(forKey: Self.copyOverridesKey),
      let override = overrides[cause.rawValue] as? [String: Any]
    else {
      return variant
    }

    var resolved = variant
    resolved.title = nonEmptyString(override["title"]) ?? resolved.title
    resolved.subtitle = safeSubtitle(override["subtitle"]) ?? resolved.subtitle
    return resolved
  }

  private func applyingRuntimeContext(
    to variant: ShieldVariant,
    cause: ShieldCause
  ) -> ShieldVariant {
    guard
      let context = sharedDefaults?.dictionary(forKey: Self.runtimeContextKey),
      context["cause"] as? String == cause.rawValue
    else {
      return variant
    }

    var resolved = variant
    resolved.subtitle = safeSubtitle(context["offerSubtitle"]) ?? resolved.subtitle
    return resolved
  }

  private func nonEmptyString(_ value: Any?) -> String? {
    guard let text = value as? String else { return nil }
    let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }

  /// Rejects the numerical contexts §3.15 forbids. Offer and schedule numbers
  /// remain allowed; balance countdown, spent-time, and streak copy do not.
  private func safeSubtitle(_ value: Any?) -> String? {
    guard let text = nonEmptyString(value) else { return nil }
    let normalized = text.lowercased()
    let forbidden = ["balance", "countdown", "remaining", "spent", "streak"]
    return forbidden.contains(where: normalized.contains) ? nil : text
  }

  private static func appGroupDefaults() -> UserDefaults? {
    guard
      let appGroup = Bundle.main.object(
        forInfoDictionaryKey: "REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP"
      ) as? String
    else {
      return nil
    }
    return UserDefaults(suiteName: appGroup)
  }

  private static func loadDefaults(from bundle: Bundle) -> [String: ShieldVariant] {
    guard
      let url = bundle.url(forResource: "ShieldContent", withExtension: "plist"),
      let data = try? Data(contentsOf: url),
      let catalog = try? PropertyListDecoder().decode(
        [String: ShieldVariant].self,
        from: data
      )
    else {
      return emergencyDefaults
    }
    return catalog
  }

  private static let emergencyDefaults: [String: ShieldVariant] = [
    ShieldCause.balanceEmpty.rawValue: ShieldVariant(
      deepLink: "excerlock://",
      primaryActionLabel: "Open ExcerLock",
      secondaryActionLabel: "Close",
      subtitle: "A 20-min walk gets you 30 more minutes.",
      title: "Time’s up — for now."
    ),
    ShieldCause.fullLock.rawValue: ShieldVariant(
      deepLink: "excerlock://locked-apps",
      primaryActionLabel: "Open ExcerLock",
      secondaryActionLabel: "Close",
      subtitle: "A 20-min walk gets you 30 more minutes.",
      title: "Move first, scroll after."
    ),
    ShieldCause.lockWindow.rawValue: ShieldVariant(
      deepLink: "excerlock://locked-apps",
      primaryActionLabel: "Open ExcerLock",
      secondaryActionLabel: "Close",
      subtitle: "Back at 7:00 AM.",
      title: "Apps are asleep."
    ),
    ShieldCause.walkAndScrollEnded.rawValue: ShieldVariant(
      deepLink: "excerlock://",
      primaryActionLabel: "Open ExcerLock",
      secondaryActionLabel: "Close",
      subtitle: "Start walking again to pick up where you left off.",
      title: "You stopped walking."
    ),
  ]
}
