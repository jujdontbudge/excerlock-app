import Foundation

let excerlockProductionAppGroup = "group.com.johansardar.excerlock"

func excerlockConfiguredAppGroup(bundle: Bundle = .main) -> String? {
  let keys = ["EXCERLOCK_ENFORCEMENT_APP_GROUP", "REACT_NATIVE_DEVICE_ACTIVITY_APP_GROUP"]
  for key in keys {
    guard let configured = bundle.object(forInfoDictionaryKey: key) as? String else { continue }
    if configured.hasPrefix("group."), !configured.contains("$(") { return configured }
  }
  return nil
}

#if EXCERLOCK_LINKED_RECORDER_TRACE
// Never fall back to production storage in a misconfigured research binary.
// This deliberately invalid suite name makes container access fail closed.
let excerlockAppGroup = excerlockConfiguredAppGroup() ?? "invalid-linked-recorder-app-group"
#else
let excerlockAppGroup = excerlockProductionAppGroup
#endif
