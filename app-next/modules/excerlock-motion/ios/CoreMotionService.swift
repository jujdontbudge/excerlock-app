import CoreMotion
import ExpoModulesCore
import Foundation
#if EXCERLOCK_LINKED_RECORDER_TRACE
import ExcerlockEnforcement
#endif

/// Swift enumeration of `CMAttitudeReferenceFrame` for the JS `referenceFrame` option.
enum AttitudeReferenceFrameOption: String, Enumerable {
  case xArbitraryZVertical
  case xArbitraryCorrectedZVertical
  case xMagneticNorthZVertical
  case xTrueNorthZVertical

  var frame: CMAttitudeReferenceFrame {
    switch self {
    case .xArbitraryZVertical: return .xArbitraryZVertical
    case .xArbitraryCorrectedZVertical: return .xArbitraryCorrectedZVertical
    case .xMagneticNorthZVertical: return .xMagneticNorthZVertical
    case .xTrueNorthZVertical: return .xTrueNorthZVertical
    }
  }
}

struct DeviceMotionOptions: Record {
  @Field var referenceFrame: AttitudeReferenceFrameOption? = nil
}

struct MagnetometerOptions: Record {
  @Field var intervalMs: Double? = nil
}

final class CoreMotionService {
  private let activityManager = CMMotionActivityManager()
  private let deviceMotionManager = CMMotionManager()
  private let pedometer = CMPedometer()
  private let altimeter = CMAltimeter()
  private let sensorRecorder = CMSensorRecorder()
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
  private var altimeterStarted = false
  private var magnetometerStarted = false
  private var pedometerEventsStarted = false

  func availability() -> MotionPayload {
    motionAvailabilityPayload(motionManager: deviceMotionManager)
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
    referenceFrame: CMAttitudeReferenceFrame?,
    onDeviceMotion: @escaping (MotionPayload) -> Void
  ) throws {
    stateLock.lock()
    defer { stateLock.unlock() }
    if deviceMotionStarted {
      return
    }
    guard deviceMotionManager.isDeviceMotionAvailable else {
      throw SensorUnavailableException(stream: "deviceMotion")
    }
    if let referenceFrame,
      !CMMotionManager.availableAttitudeReferenceFrames().contains(referenceFrame)
    {
      throw SensorUnavailableException(stream: "deviceMotion reference frame")
    }
    deviceMotionStarted = true
    // 50 Hz: the stride discriminator needs the step waveform (band 0.8-3.5 Hz,
    // impact peaks); the placement classifier decimates back to 10 Hz in JS.
    deviceMotionManager.deviceMotionUpdateInterval = 0.02
    let handler: CMDeviceMotionHandler = { [weak self] data, _ in
      guard let self, self.isDeviceMotionStarted, let data else { return }
      let payload = deviceMotionPayload(data)
      #if EXCERLOCK_LINKED_RECORDER_TRACE
      self.traceMotionCallback(stream: "device_motion", payload: payload)
      #endif
      onDeviceMotion(payload)
    }
    // No frame keeps the historical call and its default frame (no magnetometer).
    if let referenceFrame {
      deviceMotionManager.startDeviceMotionUpdates(
        using: referenceFrame, to: operationQueue, withHandler: handler)
    } else {
      deviceMotionManager.startDeviceMotionUpdates(to: operationQueue, withHandler: handler)
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

  /// CMAltimeter sits behind Motion & Fitness like the pedometer; the JS side
  /// only starts it once authorization is settled.
  func startAltimeter(onAltitude: @escaping (MotionPayload) -> Void) throws {
    stateLock.lock()
    defer { stateLock.unlock() }
    if altimeterStarted {
      return
    }
    try assertAuthorized()
    guard CMAltimeter.isRelativeAltitudeAvailable() else {
      throw SensorUnavailableException(stream: "relativeAltitude")
    }
    altimeterStarted = true
    altimeter.startRelativeAltitudeUpdates(to: operationQueue) { [weak self] data, _ in
      guard let self, self.isAltimeterStarted, let data else { return }
      onAltitude(altitudePayload(data))
    }
  }

  func stopAltimeter() {
    stateLock.lock()
    let wasStarted = altimeterStarted
    altimeterStarted = false
    stateLock.unlock()
    if wasStarted {
      altimeter.stopRelativeAltitudeUpdates()
    }
  }

  func startMagnetometer(
    intervalMs: Double?,
    onMagnetometer: @escaping (MotionPayload) -> Void
  ) throws {
    stateLock.lock()
    defer { stateLock.unlock() }
    if magnetometerStarted {
      return
    }
    guard deviceMotionManager.isMagnetometerAvailable else {
      throw SensorUnavailableException(stream: "magnetometer")
    }
    magnetometerStarted = true
    let interval = min(max(intervalMs ?? 100, 20), 1_000) / 1_000
    deviceMotionManager.magnetometerUpdateInterval = interval
    deviceMotionManager.startMagnetometerUpdates(to: operationQueue) { [weak self] data, _ in
      guard let self, self.isMagnetometerStarted, let data else { return }
      onMagnetometer(magnetometerPayload(data))
    }
  }

  func stopMagnetometer() {
    stateLock.lock()
    let wasStarted = magnetometerStarted
    magnetometerStarted = false
    stateLock.unlock()
    if wasStarted {
      deviceMotionManager.stopMagnetometerUpdates()
    }
  }

  func startPedometerEvents(onEvent: @escaping (MotionPayload) -> Void) throws {
    stateLock.lock()
    defer { stateLock.unlock() }
    if pedometerEventsStarted {
      return
    }
    try assertAuthorized()
    guard CMPedometer.isPedometerEventTrackingAvailable() else {
      throw SensorUnavailableException(stream: "pedometerEvents")
    }
    pedometerEventsStarted = true
    pedometer.startEventUpdates { [weak self] event, _ in
      guard let self, self.isPedometerEventsStarted, let event else { return }
      onEvent(pedometerEventPayload(event))
    }
  }

  func stopPedometerEvents() {
    stateLock.lock()
    let wasStarted = pedometerEventsStarted
    pedometerEventsStarted = false
    stateLock.unlock()
    if wasStarted {
      pedometer.stopEventUpdates()
    }
  }

  /// CMSensorRecorder is only usable where `isAccelerometerRecordingAvailable()`
  /// says so (no iPhone to date). The guard keeps the module honest: a device
  /// without the recorder gets `ERR_MOTION_UNAVAILABLE`, never an empty success.
  func recordAccelerometer(durationSeconds: Double) throws {
    try assertAuthorized()
    guard CMSensorRecorder.isAccelerometerRecordingAvailable() else {
      throw SensorUnavailableException(stream: "sensorRecorder")
    }
    guard durationSeconds.isFinite, durationSeconds > 0 else {
      throw MotionQueryFailedException()
    }
    sensorRecorder.recordAccelerometer(forDuration: durationSeconds)
  }

  func queryRecordedAccelerometer(fromMs: Double, toMs: Double) throws -> [MotionPayload] {
    try assertAuthorized()
    guard CMSensorRecorder.isAccelerometerRecordingAvailable() else {
      throw SensorUnavailableException(stream: "sensorRecorder")
    }
    guard let range = historicalRange(fromMs: fromMs, toMs: toMs),
      let list = sensorRecorder.accelerometerData(from: range.start, to: range.end)
    else {
      return []
    }
    var rows: [MotionPayload] = []
    for element in list {
      guard let datum = element as? CMRecordedAccelerometerData else { continue }
      rows.append(recordedAccelerometerPayload(datum))
    }
    return rows
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

  func stopAll() {
    stop()
    stopDeviceMotion()
    stopAltimeter()
    stopMagnetometer()
    stopPedometerEvents()
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

  private var isAltimeterStarted: Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    return altimeterStarted
  }

  private var isMagnetometerStarted: Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    return magnetometerStarted
  }

  private var isPedometerEventsStarted: Bool {
    stateLock.lock()
    defer { stateLock.unlock() }
    return pedometerEventsStarted
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

/// `CMSensorDataList` is an `NSFastEnumeration` container; Swift needs this to iterate it.
extension CMSensorDataList: Sequence {
  public func makeIterator() -> NSFastEnumerationIterator {
    NSFastEnumerationIterator(self)
  }
}
