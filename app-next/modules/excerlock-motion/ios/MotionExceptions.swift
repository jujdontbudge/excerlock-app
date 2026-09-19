import ExpoModulesCore

final class MotionUnavailableException: Exception, @unchecked Sendable {
  override var code: String { "ERR_MOTION_UNAVAILABLE" }
  override var reason: String {
    "Motion activity, live cadence, or step counting is unavailable on this device"
  }
}

/// Same code as `MotionUnavailableException` so JS keeps one unavailable branch;
/// the reason names the stream so a smoke report reads honestly.
final class SensorUnavailableException: Exception, @unchecked Sendable {
  private let stream: String

  init(stream: String) {
    self.stream = stream
    super.init()
  }

  override var code: String { "ERR_MOTION_UNAVAILABLE" }
  override var reason: String { "\(stream) is unavailable on this device" }
}

final class MotionDeniedException: Exception, @unchecked Sendable {
  override var code: String { "ERR_MOTION_DENIED" }
  override var reason: String { "Motion & Fitness access was denied" }
}

final class MotionRestrictedException: Exception, @unchecked Sendable {
  override var code: String { "ERR_MOTION_RESTRICTED" }
  override var reason: String { "Motion & Fitness access is restricted" }
}

final class MotionQueryFailedException: Exception, @unchecked Sendable {
  override var code: String { "ERR_MOTION_QUERY_FAILED" }
  override var reason: String { "Core Motion could not complete the request" }
}
