import ExpoModulesCore

final class GaitVisionUnavailableException: Exception, @unchecked Sendable {
  override var code: String { "ERR_GAIT_VISION_UNAVAILABLE" }
  override var reason: String { "The front camera is unavailable on this device" }
}

final class GaitVisionDeniedException: Exception, @unchecked Sendable {
  override var code: String { "ERR_GAIT_VISION_DENIED" }
  override var reason: String { "Camera access was denied" }
}

final class GaitVisionConfigurationException: Exception, @unchecked Sendable {
  override var code: String { "ERR_GAIT_VISION_CONFIGURATION" }
  override var reason: String {
    "The front-camera body-pose session could not be configured"
  }
}

final class GaitVisionCaptureException: Exception, @unchecked Sendable {
  override var code: String { "ERR_GAIT_VISION_CAPTURE" }
  override var reason: String {
    "Harness footage could not be recorded in the app sandbox"
  }
}
