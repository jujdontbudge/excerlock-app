import ExpoModulesCore

private let activityEvent = "onActivityChange"
private let cadenceEvent = "onCadence"
private let deviceMotionEvent = "onDeviceMotion"
private let altitudeEvent = "onAltitude"
private let magnetometerEvent = "onMagnetometer"
private let pedometerEventEvent = "onPedometerEvent"

public final class ExcerlockMotionModule: Module {
  private let motion = CoreMotionService()

  public func definition() -> ModuleDefinition {
    Name("ExcerlockMotion")
    Events(
      activityEvent, cadenceEvent, deviceMotionEvent,
      altitudeEvent, magnetometerEvent, pedometerEventEvent
    )

    Function("getAvailability") {
      motion.availability()
    }

    Function("getAuthorizationStatus") {
      motion.authorizationStatus()
    }

    AsyncFunction("requestAuthorization") { (promise: Promise) in
      self.motion.requestAuthorization { status in
        promise.resolve(status)
      }
    }

    AsyncFunction("start") { () throws -> Void in
      try self.motion.start(
        onActivity: { [weak self] payload in
          self?.sendEvent(activityEvent, payload)
        },
        onCadence: { [weak self] payload in
          self?.sendEvent(cadenceEvent, payload)
        }
      )
    }

    AsyncFunction("stop") {
      self.motion.stop()
    }

    AsyncFunction("startDeviceMotion") { (options: DeviceMotionOptions?) throws -> Void in
      try self.motion.startDeviceMotion(referenceFrame: options?.referenceFrame?.frame) { [weak self] payload in
        self?.sendEvent(deviceMotionEvent, payload)
      }
    }

    AsyncFunction("stopDeviceMotion") {
      self.motion.stopDeviceMotion()
    }

    AsyncFunction("startAltimeter") { () throws -> Void in
      try self.motion.startAltimeter { [weak self] payload in
        self?.sendEvent(altitudeEvent, payload)
      }
    }

    AsyncFunction("stopAltimeter") {
      self.motion.stopAltimeter()
    }

    AsyncFunction("startMagnetometer") { (options: MagnetometerOptions?) throws -> Void in
      try self.motion.startMagnetometer(intervalMs: options?.intervalMs) { [weak self] payload in
        self?.sendEvent(magnetometerEvent, payload)
      }
    }

    AsyncFunction("stopMagnetometer") {
      self.motion.stopMagnetometer()
    }

    AsyncFunction("startPedometerEvents") { () throws -> Void in
      try self.motion.startPedometerEvents { [weak self] payload in
        self?.sendEvent(pedometerEventEvent, payload)
      }
    }

    AsyncFunction("stopPedometerEvents") {
      self.motion.stopPedometerEvents()
    }

    AsyncFunction("recordAccelerometer") { (durationSeconds: Double) throws -> Void in
      try self.motion.recordAccelerometer(durationSeconds: durationSeconds)
    }

    AsyncFunction("queryRecordedAccelerometer") { (fromMs: Double, toMs: Double) throws -> [MotionPayload] in
      try self.motion.queryRecordedAccelerometer(fromMs: fromMs, toMs: toMs)
    }

    AsyncFunction("queryActivity") {
      (fromMs: Double, toMs: Double, promise: Promise) in
      self.motion.queryActivity(fromMs: fromMs, toMs: toMs) { result in
        switch result {
        case .success(let activities):
          promise.resolve(activities)
        case .failure(let error):
          promise.reject(error)
        }
      }
    }

    AsyncFunction("querySteps") {
      (fromMs: Double, toMs: Double, promise: Promise) in
      self.motion.querySteps(fromMs: fromMs, toMs: toMs) { result in
        switch result {
        case .success(let steps):
          promise.resolve(steps)
        case .failure(let error):
          promise.reject(error)
        }
      }
    }

    OnDestroy {
      self.motion.stopAll()
    }
  }
}
