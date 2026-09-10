import DeviceActivity
import ExtensionKit
import SwiftUI

extension DeviceActivityReport.Context {
  /// The system uses this extension's corresponding DeviceActivityReportScene
  /// to render the report whenever the app initializes a
  /// DeviceActivityReport with this context.
  static let totalActivity = Self("Total Activity")
}

struct TotalActivityReport: DeviceActivityReportScene {
  /// Which context this scene represents.
  let context: DeviceActivityReport.Context = .totalActivity

  /// The custom configuration and the resulting view for this report.
  let content: (String) -> TotalActivityView

  func makeConfiguration(
    representing data: DeviceActivityResults<DeviceActivityData>
  ) async -> String {
    // Reformat the data into a configuration that can be used to create
    // the report's view.
    let formatter = DateComponentsFormatter()
    formatter.allowedUnits = [.day, .hour, .minute, .second]
    formatter.unitsStyle = .abbreviated
    formatter.zeroFormattingBehavior = .dropAll

    let totalActivityDuration = await data.flatMap { $0.activitySegments }.reduce(
      0
    ) { $0 + $1.totalActivityDuration }
    return formatter.string(from: totalActivityDuration) ?? "No activity data"
  }
}
