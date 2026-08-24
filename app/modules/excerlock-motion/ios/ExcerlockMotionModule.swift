import ExpoModulesCore

private let activityEvent = "onActivityChange"
private let cadenceEvent = "onCadence"
private let deviceMotionEvent = "onDeviceMotion"

public final class ExcerlockMotionModule: Module {
  private let motion = CoreMotionService()

  public func definition() -> ModuleDefinition {
    Name("ExcerlockMotion")
    Events(activityEvent, cadenceEvent, deviceMotionEvent)

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

    AsyncFunction("startDeviceMotion") { () throws -> Void in
      try self.motion.startDeviceMotion { [weak self] payload in
        self?.sendEvent(deviceMotionEvent, payload)
      }
    }

    AsyncFunction("stopDeviceMotion") {
      self.motion.stopDeviceMotion()
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
      self.motion.stop()
      self.motion.stopDeviceMotion()
    }
  }
}
