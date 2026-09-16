import Foundation

/// App Group key the ShieldConfiguration extension reads as
/// `ShieldContentCatalog.copyOverridesKey` in
/// `targets/ShieldConfiguration/ShieldContent.swift`.
///
/// Keep the literal identical on all three sides (`ShieldContent.swift`, this
/// file, and `src/runtime/shield/shieldCopyOverrides.ts`);
/// `guardrails/shield-copy.test.ts` fails when they drift.
let excerlockShieldCopyOverridesDefaultsKey = "excerlock.shield.copy-overrides.v1"

enum ShieldCopyOverridesError: Error, LocalizedError {
  case appGroupUnavailable
  case invalidPayload

  var errorDescription: String? {
    switch self {
    case .appGroupUnavailable: return "Shield copy App Group is unavailable"
    case .invalidPayload: return "Shield copy overrides payload is invalid"
    }
  }
}

enum ShieldCopyOverrides {
  /// Parses the JSON produced by the host's `shield_copy` flag rail into the
  /// plist shape `UserDefaults.dictionary(forKey:)` must read back.
  ///
  /// Unknown causes and fields stay inert to the extension; native only
  /// guarantees the dictionary-of-string-dictionaries shape, while JS rejects
  /// unknown keys before calling this at all.
  static func parse(_ json: String) throws -> [String: [String: String]] {
    guard let data = json.data(using: .utf8) else { throw ShieldCopyOverridesError.invalidPayload }
    let object: Any
    do { object = try JSONSerialization.jsonObject(with: data) } catch { throw ShieldCopyOverridesError.invalidPayload }
    guard let raw = object as? [String: Any] else { throw ShieldCopyOverridesError.invalidPayload }
    var parsed: [String: [String: String]] = [:]
    for (cause, value) in raw {
      guard let entry = value as? [String: Any] else { throw ShieldCopyOverridesError.invalidPayload }
      var fields: [String: String] = [:]
      for (field, fieldValue) in entry {
        guard let text = fieldValue as? String else { throw ShieldCopyOverridesError.invalidPayload }
        fields[field] = text
      }
      parsed[cause] = fields
    }
    return parsed
  }

  /// Writes the parsed overrides to the App Group. The extension reads this key
  /// on every shield render, so the value must stay a dictionary; an empty
  /// dictionary falls back to the bundled plist copy per cause.
  static func write(_ json: String, defaults: UserDefaults) throws {
    let overrides = try parse(json)
    defaults.set(overrides, forKey: excerlockShieldCopyOverridesDefaultsKey)
  }
}
