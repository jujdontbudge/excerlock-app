import CoreMotion
import ExpoModulesCore
import Foundation
#if EXCERLOCK_LINKED_RECORDER_TRACE
import ExcerlockEnforcement
#endif

final class CoreMotionService {
  private let activityManager = CMMotionActivityManager()
  private let deviceMotionManager = CMMotionManager()
  private let pedometer = CMPedometer()
  private let operationQueue: OperationQueue = {
    let queue = OperationQueue()
    queue.name = "com.johansardar.excerlock.motion"
    queue.maxConcurrentOperationCount = 1
    queue.qualityOfService = .userInitiated
    return queue
  }()
  private let stateLock = NSLock()
  private var started = false
  private var deviceMotionStarted = false

  func availability() -> MotionPayload {
    motionAvailabilityPayload()
  }

  func authorizationStatus() -> String {
    motionAuthorizationStatus()
  }

  func requestAuthorization(completion: @escaping (String) -> Void) {
    let end = Date()
    activityManager.queryActivityStarting(
      from: end.addingTimeInterval(-1),
      to: end,
      to: operationQueue
    ) { _, _ in
      completion(motionAuthorizationStatus())
    }
  }

  func start(
    onActivity: @escaping (MotionPayload) -> Void,
    onCadence: @escaping (MotionPayload) -> Void
  ) throws {
    stateLock.lock()
    defer { stateLock.unlock() }
    if started {
      return
    }
    try assertUsable()
    started = true

    activityManager.startActivityUpdates(to: operationQueue) { [weak self] activity in
      guard let self, self.isStarted, let activity else { return }
      let payload = motionActivityPayload(activity)
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      self.traceMotionCallback(stream: "activity", payload: payload)
      #endif
      onActivity(payload)
    }
    pedometer.startUpdates(from: Date()) { [weak self] data, _ in
      guard let self, self.isStarted, let data else { return }
      let payload = cadencePayload(data)
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      self.traceMotionCallback(stream: "cadence", payload: payload)
      #endif
      onCadence(payload)
    }
  }

  func stop() {
    stateLock.lock()
    let wasStarted = started
    started = false
    stateLock.unlock()
    guard wasStarted else { return }

    activityManager.stopActivityUpdates()
    pedometer.stopUpdates()
  }

  func startDeviceMotion(
    onDeviceMotion: @escaping (MotionPayload) -> Void
  ) throws {
    stateLock.lock()
    defer { stateLock.unlock() }
    if deviceMotionStarted {
      return
    }
    guard deviceMotionManager.isDeviceMotionAvailable else {
      throw MotionUnavailableException()
    }
    deviceMotionStarted = true
    // 50 Hz: the stride discriminator needs the step waveform (band 0.8-3.5 Hz,
    // impact peaks); the placement classifier decimates back to 10 Hz in JS.
    deviceMotionManager.deviceMotionUpdateInterval = 0.02
    deviceMotionManager.startDeviceMotionUpdates(to: operationQueue) {
      [weak self] data, _ in
      guard let self, self.isDeviceMotionStarted, let data else { return }
      let payload = deviceMotionPayload(data)
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      self.traceMotionCallback(stream: "device_motion", payload: payload)
      #endif
      onDeviceMotion(payload)
    }
  }

  func stopDeviceMotion() {
    stateLock.lock()
    let wasStarted = deviceMotionStarted
    deviceMotionStarted = false
    stateLock.unlock()
    if wasStarted {
      deviceMotionManager.stopDeviceMotionUpdates()
    }
  }

  func queryActivity(
    fromMs: Double,
    toMs: Double,
    completion: @escaping (Result<[MotionPayload], Exception>) -> Void
  ) {
    do {
      try assertActivityUsable()
    } catch let error as Exception {
      completion(.failure(error))
      return
    } catch {
      completion(.failure(MotionQueryFailedException()))
      return
    }

    guard let range = historicalRange(fromMs: fromMs, toMs: toMs) else {
      completion(.success([]))
      return
    }
    activityManager.queryActivityStarting(
      from: range.start,
      to: range.end,
      to: operationQueue
    ) { activities, error in
      if error != nil {
        completion(.failure(self.currentException()))
        return
      }
      completion(.success((activities ?? []).map { motionActivityPayload($0) }))
    }
  }

  func querySteps(
    fromMs: Double,
    toMs: Double,
    completion: @escaping (Result<MotionPayload, Exception>) -> Void
  ) {
    do {
      try assertStepCountingUsable()
    } catch let error as Exception {
      completion(.failure(error))
      return
    } catch {
      completion(.failure(MotionQueryFailedException()))
      return
    }

    guard let range = historicalRange(fromMs: fromMs, toMs: toMs) else {
      completion(.success(["steps": 0]))
      return
    }
    pedometer.queryPedometerData(from: range.start, to: range.end) { data, error in
      if error != nil {
        completion(.failure(self.currentException()))
        return
      }
      completion(.success(["steps": data?.numberOfSteps.intValue ?? 0]))
    }
  }

  private var isStarted: Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    return started
  }

  private var isDeviceMotionStarted: Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    return deviceMotionStarted
  }

  #if EXCERLOCK_LINKED_RECORDER_TRACE
  private func traceMotionCallback(stream: String, payload: MotionPayload) {
    var trace: [String: Any] = ["stream": stream, "bridgeAttempted": true]
    for key in ["classes", "confidence", "startedAt", "receivedAt", "stepsPerSecond", "cumulativeSteps", "asOf", "timestampMs"] {
      guard let value = payload[key] else { continue }
      let outputKey: String
      switch key {
      case "startedAt": outputKey = "startedAtWallMs"
      case "receivedAt": outputKey = "receivedAtWallMs"
      case "asOf": outputKey = "asOfWallMs"
      case "timestampMs": outputKey = "timestampWallMs"
      default: outputKey = key
      }
      trace[outputKey] = value
    }
    LinkedTraceWriter.shared.recordDeferred(producer: .hostNative, eventType: .motionCallbackNative, payload: trace)
  }
  #endif

  private func assertUsable() throws {
    try assertAuthorized()
    guard
      CMMotionActivityManager.isActivityAvailable(),
      CMPedometer.isCadenceAvailable(),
      CMPedometer.isStepCountingAvailable()
    else {
      throw MotionUnavailableException()
    }
  }

  private func assertActivityUsable() throws {
    try assertAuthorized()
    guard CMMotionActivityManager.isActivityAvailable() else {
      throw MotionUnavailableException()
    }
  }

  private func assertStepCountingUsable() throws {
    try assertAuthorized()
    guard CMPedometer.isStepCountingAvailable() else {
      throw MotionUnavailableException()
    }
  }

  private func assertAuthorized() throws {
    switch motionAuthorizationStatus() {
    case "denied":
      throw MotionDeniedException()
    case "restricted":
      throw MotionRestrictedException()
    default:
      return
    }
  }

  private func currentException() -> Exception {
    switch motionAuthorizationStatus() {
    case "denied":
      return MotionDeniedException()
    case "restricted":
      return MotionRestrictedException()
    default:
      return MotionQueryFailedException()
    }
  }

  private func historicalRange(
    fromMs: Double,
    toMs: Double,
    now: Date = Date()
  ) -> (start: Date, end: Date)? {
    let earliest = now.addingTimeInterval(-7 * 24 * 60 * 60)
    let requestedStart = fromMs.isFinite
      ? Date(timeIntervalSince1970: fromMs / 1_000)
      : earliest
    let requestedEnd = toMs.isFinite
      ? Date(timeIntervalSince1970: toMs / 1_000)
      : now
    let start = max(requestedStart, earliest)
    let end = min(requestedEnd, now)
    return start <= end ? (start, end) : nil
  }
}
