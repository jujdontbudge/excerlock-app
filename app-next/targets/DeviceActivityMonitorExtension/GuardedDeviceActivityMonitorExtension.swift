import DeviceActivity
import Foundation

final class DeviceActivityMonitorExtension: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    handle(activity, callback: "interval_started", started: true)
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    handle(activity, callback: "interval_ended", started: false)
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    guard activity.rawValue.hasPrefix(excerlockWatchdogPrefix) else { return }
    #if EXCERLOCK_LINKED_RECORDER_TRACE
    traceCallback(activity, callback: "threshold_reached", status: "received", reason: nil)
    do {
      let result = try ExcerlockPolicyStore.shared.handleWatchdogResult(activity.rawValue)
      traceCallback(activity, callback: "threshold_reached", status: result.applied ? "applied" : "rejected", reason: result.reason)
      LinkedTraceWriter.shared.flush()
    } catch {
      traceCallback(activity, callback: "threshold_reached", status: "failed", reason: "policy_error")
      LinkedTraceWriter.shared.flush()
    }
    #else
    _ = try? ExcerlockPolicyStore.shared.handleWatchdog(activity.rawValue)
    #endif
  }

  private func handle(_ activity: DeviceActivityName, callback: String, started: Bool) {
    if activity.rawValue.hasPrefix(excerlockWatchdogPrefix) {
      guard !started else {
        #if EXCERLOCK_LINKED_RECORDER_TRACE
        traceCallback(activity, callback: callback, status: "received", reason: "start_only")
        LinkedTraceWriter.shared.flush()
        #endif
        return
      }
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      traceCallback(activity, callback: callback, status: "received", reason: nil)
      do {
        let result = try ExcerlockPolicyStore.shared.handleWatchdogResult(activity.rawValue)
        traceCallback(activity, callback: callback, status: result.applied ? "applied" : "rejected", reason: result.reason)
      } catch {
        traceCallback(activity, callback: callback, status: "failed", reason: "policy_error")
      }
      LinkedTraceWriter.shared.flush()
      #else
      _ = try? ExcerlockPolicyStore.shared.handleWatchdog(activity.rawValue)
      #endif
    } else if activity.rawValue.hasPrefix(excerlockWindowPrefix) {
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      traceCallback(activity, callback: callback, status: "received", reason: nil)
      do {
        let result = try ExcerlockPolicyStore.shared.handleWindowResult(activity.rawValue, started: started)
        traceCallback(activity, callback: callback, status: result.applied ? "applied" : "rejected", reason: result.reason)
      } catch {
        traceCallback(activity, callback: callback, status: "failed", reason: "policy_error")
      }
      LinkedTraceWriter.shared.flush()
      #else
      _ = try? ExcerlockPolicyStore.shared.handleWindow(activity.rawValue, started: started)
      #endif
    }
  }

  #if EXCERLOCK_LINKED_RECORDER_TRACE
  private func traceCallback(_ activity: DeviceActivityName, callback: String, status: String, reason: String?) {
    var payload: [String: Any] = [
      "callback": callback,
      "status": status,
      "monitorIdHash": LinkedTraceWriter.shared.hashIdentifier(activity.rawValue)
    ]
    if let reason { payload["reason"] = reason }
    LinkedTraceWriter.shared.record(
      producer: .monitorExtension,
      eventType: .extensionCallback,
      payload: payload
    )
  }
  #endif
}
