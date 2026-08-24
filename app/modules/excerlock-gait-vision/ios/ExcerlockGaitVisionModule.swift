import ExpoModulesCore

private let gaitSampleEvent = "onGaitSample"

public final class ExcerlockGaitVisionModule: Module {
  private let vision = GaitVisionService()

  public func definition() -> ModuleDefinition {
    Name("ExcerlockGaitVision")
    Events(gaitSampleEvent)

    AsyncFunction("start") { (promise: Promise) in
      self.vision.start(
        onSample: { [weak self] payload in
          self?.sendEvent(gaitSampleEvent, payload)
        },
        completion: { result in
          switch result {
          case .success:
            promise.resolve()
          case .failure(let error):
            promise.reject(error)
          }
        }
      )
    }

    AsyncFunction("stop") { (promise: Promise) in
      self.vision.stop {
        promise.resolve()
      }
    }

    OnDestroy {
      self.vision.stop()
    }
  }
}
