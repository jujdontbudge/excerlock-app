import DeviceActivityReport
import SwiftUI

// PENDING (T01): minimal display-only report view. Not linked into Xcode until
// the report target type is supported. Kept so the future target has a valid
// principal class without inventing behavior.
struct PendingReportView: DeviceActivityReportScene {
  func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> PendingReportConfiguration {
    PendingReportConfiguration()
  }
}

struct PendingReportConfiguration: DeviceActivityReportSceneConfiguration {
  func makeContent() -> PendingReportView_Content {
    PendingReportView_Content()
  }
}

struct PendingReportView_Content: View {
  var body: some View {
    Text("ExcerLock activity")
  }
}
