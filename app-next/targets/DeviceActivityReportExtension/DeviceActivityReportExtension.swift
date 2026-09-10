import DeviceActivity
import ExtensionKit
import SwiftUI

/// Display-only Device Activity report host. The system instantiates this
/// scene; report data is never written back into the main ExcerLock ledger.
@main
struct ExcerLockDeviceActivityReportExtension: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    // Create a report for each DeviceActivityReport.Context this app supports.
    TotalActivityReport { totalActivity in
      TotalActivityView(totalActivity: totalActivity)
    }
  }
}
