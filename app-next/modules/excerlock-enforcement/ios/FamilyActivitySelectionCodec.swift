import Foundation

/// `react-native-device-activity` persists a FamilyControls selection as
/// `base64(JSONEncoder.encode(selection))` under `familyActivitySelectionIds`.
/// A raw UTF-8 JSON payload is accepted only as a fallback. `{` is not in the
/// base64 alphabet, so a JSON object string cannot collide with the base64 path.
enum FamilyActivitySelectionCodec {
  static func jsonData(fromPersistedPayload payload: String) -> Data? {
    if let data = Data(base64Encoded: payload), !data.isEmpty {
      return data
    }
    return payload.data(using: .utf8)
  }
}
