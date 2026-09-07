import ExpoModulesCore

private let gaitSampleEvent = "onGaitSample"

public final class ExcerlockGaitVisionModule: Module {
  private let vision = GaitVisionService()

  public func definition() -> ModuleDefinition {
    Name("ExcerlockGaitVision")
    Events(gaitSampleEvent)

    View(GaitVisionPreviewView.self) {
      Prop("active") { (view: GaitVisionPreviewView, active: Bool) in
        self.vision.setPreview(view, active: active)
      }
    }

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

    AsyncFunction("beginHarnessCapture") { (captureId: String, promise: Promise) in
      self.vision.beginHarnessCapture(id: captureId) { result in
        switch result {
        case .success(let fileUri):
          promise.resolve(fileUri)
        case .failure(let error):
          promise.reject(error)
        }
      }
    }

    AsyncFunction("endHarnessCapture") { (promise: Promise) in
      self.vision.endHarnessCapture {
        promise.resolve()
      }
    }

    AsyncFunction("deleteHarnessCaptures") { (promise: Promise) in
      self.vision.deleteHarnessCaptures { result in
        switch result {
        case .success:
          promise.resolve()
        case .failure(let error):
          promise.reject(error)
        }
      }
    }

    OnDestroy {
      self.vision.stop()
      self.vision.endHarnessCapture {}
    }
  }
}
