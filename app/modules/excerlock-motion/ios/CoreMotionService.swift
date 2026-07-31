import CoreMotion
import ExpoModulesCore
import Foundation

final class CoreMotionService {
  private let activityManager = CMMotionActivityManager()
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
      onActivity(motionActivityPayload(activity))
    }
    pedometer.startUpdates(from: Date()) { [weak self] data, _ in
      guard let self, self.isStarted, let data else { return }
      onCadence(cadencePayload(data))
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
      completion(.success((activities ?? []).map(motionActivityPayload)))
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
