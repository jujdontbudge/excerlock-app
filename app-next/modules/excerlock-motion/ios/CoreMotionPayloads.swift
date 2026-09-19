import CoreMotion
import Foundation

typealias MotionPayload = [String: Any]

/// One flag per Core Motion capability a `start*` guard checks. Nothing is
/// inferred: each value is the framework's own availability answer.
func motionAvailabilityPayload(motionManager: CMMotionManager) -> MotionPayload {
  [
    "activity": CMMotionActivityManager.isActivityAvailable(),
    "cadence": CMPedometer.isCadenceAvailable(),
    "stepCounting": CMPedometer.isStepCountingAvailable(),
    "deviceMotion": motionManager.isDeviceMotionAvailable,
    "magnetometer": motionManager.isMagnetometerAvailable,
    "relativeAltitude": CMAltimeter.isRelativeAltitudeAvailable(),
    "floorCounting": CMPedometer.isFloorCountingAvailable(),
    "distance": CMPedometer.isDistanceAvailable(),
    "pace": CMPedometer.isPaceAvailable(),
    "pedometerEvents": CMPedometer.isPedometerEventTrackingAvailable(),
    // False on every iPhone to date; true only where the API is really backed.
    "sensorRecorder": CMSensorRecorder.isAccelerometerRecordingAvailable()
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
    "asOf": epochMilliseconds(data.endDate),
    "distanceMeters": data.distance?.doubleValue ?? NSNull(),
    "currentPaceSecondsPerMeter": data.currentPace?.doubleValue ?? NSNull(),
    "floorsAscended": data.floorsAscended?.intValue ?? NSNull(),
    "floorsDescended": data.floorsDescended?.intValue ?? NSNull()
  ]
}

func deviceMotionPayload(
  _ data: CMDeviceMotion,
  receivedAt: Date = Date()
) -> MotionPayload {
  let quaternion = data.attitude.quaternion
  let field = data.magneticField
  return [
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
    ),
    "attitude": [
      "roll": data.attitude.roll,
      "pitch": data.attitude.pitch,
      "yaw": data.attitude.yaw
    ],
    "quaternion": [
      "x": quaternion.x,
      "y": quaternion.y,
      "z": quaternion.z,
      "w": quaternion.w
    ],
    // CMDeviceMotion reports -1 when the reference frame carries no heading.
    "heading": data.heading >= 0 ? data.heading : NSNull(),
    "magneticField": [
      "x": field.field.x,
      "y": field.field.y,
      "z": field.field.z,
      "accuracy": magneticFieldAccuracy(field.accuracy)
    ]
  ]
}

func altitudePayload(_ data: CMAltitudeData, receivedAt: Date = Date()) -> MotionPayload {
  [
    "timestampMs": epochMilliseconds(receivedAt),
    "relativeAltitudeMeters": data.relativeAltitude.doubleValue,
    "pressureKilopascals": data.pressure.doubleValue
  ]
}

func magnetometerPayload(_ data: CMMagnetometerData, receivedAt: Date = Date()) -> MotionPayload {
  [
    "timestampMs": epochMilliseconds(receivedAt),
    "magneticField": vectorPayload(
      x: data.magneticField.x,
      y: data.magneticField.y,
      z: data.magneticField.z
    )
  ]
}

func pedometerEventPayload(_ event: CMPedometerEvent) -> MotionPayload {
  let type: String
  switch event.type {
  case .pause:
    type = "pause"
  case .resume:
    type = "resume"
  @unknown default:
    type = "pause"
  }
  return [
    "type": type,
    "atMs": epochMilliseconds(event.date)
  ]
}

func recordedAccelerometerPayload(_ datum: CMRecordedAccelerometerData) -> MotionPayload {
  [
    "timestampMs": epochMilliseconds(datum.startDate),
    "identifier": Int(datum.identifier),
    "acceleration": vectorPayload(
      x: datum.acceleration.x,
      y: datum.acceleration.y,
      z: datum.acceleration.z
    )
  ]
}

private func vectorPayload(x: Double, y: Double, z: Double) -> MotionPayload {
  ["x": x, "y": y, "z": z]
}

private func magneticFieldAccuracy(_ accuracy: CMMagneticFieldCalibrationAccuracy) -> String {
  switch accuracy {
  case .uncalibrated:
    return "uncalibrated"
  case .low:
    return "low"
  case .medium:
    return "medium"
  case .high:
    return "high"
  @unknown default:
    return "uncalibrated"
  }
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
