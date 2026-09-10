import DeviceActivity
import Foundation

final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) { super.intervalDidStart(for: activity); handle(activity, started: true) }
  override func intervalDidEnd(for activity: DeviceActivityName) { super.intervalDidEnd(for: activity); handle(activity, started: false) }
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) { super.eventDidReachThreshold(event, activity: activity); guard activity.rawValue.hasPrefix(excerlockWatchdogPrefix) else { return }; _ = try? ExcerlockPolicyStore.shared.handleWatchdog(activity.rawValue) }
  private func handle(_ activity: DeviceActivityName, started: Bool) {
    if activity.rawValue.hasPrefix(excerlockWatchdogPrefix) { if started { _ = try? ExcerlockPolicyStore.shared.handleWatchdog(activity.rawValue) } }
    else if activity.rawValue.hasPrefix(excerlockWindowPrefix) { _ = try? ExcerlockPolicyStore.shared.handleWindow(activity.rawValue, started: started) }
  }
}
