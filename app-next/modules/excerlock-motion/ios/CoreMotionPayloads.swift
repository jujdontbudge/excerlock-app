import CoreMotion
import Foundation

typealias MotionPayload = [String: Any]

func motionAvailabilityPayload() -> MotionPayload {
  [
    "activity": CMMotionActivityManager.isActivityAvailable(),
    "cadence": CMPedometer.isCadenceAvailable(),
    "stepCounting": CMPedometer.isStepCountingAvailable()
  ]
}

func motionAuthorizationStatus() -> String {
  switch CMMotionActivityManager.authorizationStatus() {
  case .notDetermined:
    return "notDetermined"
  case .restricted:
    return "restricted"
  case .denied:
    return "denied"
  case .authorized:
    return "authorized"
  @unknown default:
    return "restricted"
  }
}

func motionActivityPayload(
  _ activity: CMMotionActivity,
  receivedAt: Date = Date()
) -> MotionPayload {
  var classes: [String] = []
  if activity.walking { classes.append("walking") }
  if activity.running { classes.append("running") }
  if activity.cycling { classes.append("cycling") }
  if activity.automotive { classes.append("automotive") }
  if activity.stationary { classes.append("stationary") }
  if activity.unknown { classes.append("unknown") }
  if classes.isEmpty { classes.append("unknown") }

  return [
    "classes": classes,
    "confidence": motionConfidence(activity.confidence),
    "startedAt": epochMilliseconds(activity.startDate),
    "receivedAt": epochMilliseconds(receivedAt)
  ]
}

func cadencePayload(_ data: CMPedometerData) -> MotionPayload {
  [
    "stepsPerSecond": data.currentCadence?.doubleValue ?? NSNull(),
    "cumulativeSteps": data.numberOfSteps.intValue,
    "asOf": epochMilliseconds(data.endDate)
  ]
}

func deviceMotionPayload(
  _ data: CMDeviceMotion,
  receivedAt: Date = Date()
) -> MotionPayload {
  [
    "timestampMs": epochMilliseconds(receivedAt),
    "gravity": vectorPayload(
      x: data.gravity.x,
      y: data.gravity.y,
      z: data.gravity.z
    ),
    "rotationRate": vectorPayload(
      x: data.rotationRate.x,
      y: data.rotationRate.y,
      z: data.rotationRate.z
    ),
    "userAcceleration": vectorPayload(
      x: data.userAcceleration.x,
      y: data.userAcceleration.y,
      z: data.userAcceleration.z
    )
  ]
}

private func vectorPayload(x: Double, y: Double, z: Double) -> MotionPayload {
  ["x": x, "y": y, "z": z]
}

private func motionConfidence(_ confidence: CMMotionActivityConfidence) -> String {
  switch confidence {
  case .low:
    return "low"
  case .medium:
    return "medium"
  case .high:
    return "high"
  @unknown default:
    return "low"
  }
}

private func epochMilliseconds(_ date: Date) -> Double {
  date.timeIntervalSince1970 * 1_000
}
