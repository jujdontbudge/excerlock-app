import CoreMotion
import Foundation

protocol MotionCaptureServiceDelegate: AnyObject {
    func motionCaptureDidReceiveActivity(raw: [String: Any], production: ProductionActivitySample, stamp: CaptureStamp)
    func motionCaptureDidReceiveCadence(raw: [String: Any], production: ProductionCadenceSample?, stamp: CaptureStamp)
    func motionCaptureDidReceiveInertial(raw: [String: Any], stream: String, sourceTimestampSeconds: TimeInterval, stamp: CaptureStamp)
    func motionCaptureDidReceiveDeviceMotion(raw: [String: Any], sourceTimestampSeconds: TimeInterval, stamp: CaptureStamp)
    func motionCaptureDidFail(stream: String, error: Error, stamp: CaptureStamp)
}

/// The capture surface the controller needs, so tests can drive linked-record
/// lifecycles (including write failures) without touching real Core Motion.
protocol MotionCaptureServicing: AnyObject {
    var delegate: MotionCaptureServiceDelegate? { get set }
    var availability: SensorAvailability { get }
    var permission: MotionPermission { get }
    func requestLiveAuthorization(completion: @escaping (MotionPermission) -> Void)
    func start() throws -> SensorAvailability
    func stop()
}

final class MotionCaptureService: MotionCaptureServicing {
    weak var delegate: MotionCaptureServiceDelegate?

    private let activityManager = CMMotionActivityManager()
    private let pedometer = CMPedometer()
    private let motionManager = CMMotionManager()
    private let clock: CaptureClock
    private let operationQueue: OperationQueue = {
        let queue = OperationQueue()
        queue.name = "com.johansardar.excerlock.lab.walkingrecorder.motion"
        queue.maxConcurrentOperationCount = 1
        queue.qualityOfService = .userInitiated
        return queue
    }()
    private var isRunning = false
    private var permissionRequestFinished = false

    init(clock: CaptureClock = SystemCaptureClock()) {
        self.clock = clock
    }

    var availability: SensorAvailability { .current }
    var permission: MotionPermission { .current }

    /// Requests only live Motion & Fitness access. It never queries activity or step history.
    func requestLiveAuthorization(completion: @escaping (MotionPermission) -> Void) {
        let current = permission
        guard current == .notDetermined else {
            completion(current)
            return
        }
        permissionRequestFinished = false
        activityManager.startActivityUpdates(to: operationQueue) { [weak self] _ in
            self?.completePermissionRequest(completion)
        }
        if CMPedometer.isStepCountingAvailable() {
            pedometer.startUpdates(from: Date()) { [weak self] _, _ in
                self?.completePermissionRequest(completion)
            }
        }
        pollAuthorization(attempt: 0, completion: completion)
    }

    private func pollAuthorization(attempt: Int, completion: @escaping (MotionPermission) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
            guard let self, !self.permissionRequestFinished else { return }
            if self.permission != .notDetermined || attempt >= 120 {
                self.completePermissionRequest(completion)
            } else {
                self.pollAuthorization(attempt: attempt + 1, completion: completion)
            }
        }
    }

    private func completePermissionRequest(_ completion: @escaping (MotionPermission) -> Void) {
        DispatchQueue.main.async { [weak self] in
            guard let self, !self.permissionRequestFinished else { return }
            self.permissionRequestFinished = true
            self.activityManager.stopActivityUpdates()
            self.pedometer.stopUpdates()
            completion(self.permission)
        }
    }

    func start() throws -> SensorAvailability {
        guard !isRunning else { return availability }
        guard permission == .authorized else {
            throw NSError(domain: "WalkingRecorder.Motion", code: 1, userInfo: [NSLocalizedDescriptionKey: "Motion & Fitness permission is not authorized."])
        }
        let available = availability
        guard available.canRunProductionPath else {
            throw NSError(domain: "WalkingRecorder.Motion", code: 2, userInfo: [NSLocalizedDescriptionKey: "Walking activity and cadence sensors are unavailable on this device."])
        }
        isRunning = true

        if available.activity {
            activityManager.startActivityUpdates(to: operationQueue) { [weak self] activity in
                guard let self, self.isRunning, let activity else { return }
                let stamp = self.clock.now()
                let startedWallMs = Int64((activity.startDate.timeIntervalSince1970 * 1_000).rounded())
                let startedMonotonicMs = max(0, stamp.monotonicMs + (startedWallMs - stamp.wallTimeMs))
                var classes: [String] = []
                if activity.walking { classes.append("walking") }
                if activity.running { classes.append("running") }
                if activity.cycling { classes.append("cycling") }
                if activity.automotive { classes.append("automotive") }
                if activity.stationary { classes.append("stationary") }
                if activity.unknown { classes.append("unknown") }
                if classes.isEmpty { classes.append("unknown") }
                let confidence: String
                switch activity.confidence {
                case .low: confidence = "low"
                case .medium: confidence = "medium"
                case .high: confidence = "high"
                @unknown default: confidence = "low"
                }
                let raw: [String: Any] = [
                    "stream": "activity",
                    "valid": true,
                    "classes": classes,
                    "confidence": confidence,
                    "sourceStartedWallTimeMs": startedWallMs,
                    "sourceStartedMonotonicMsMapped": startedMonotonicMs,
                    "sourceClock": "CMMotionActivity.startDate mapped from wall clock at callback receipt"
                ]
                let production = ProductionActivitySample(
                    classes: classes,
                    confidence: confidence,
                    startedAtMs: startedMonotonicMs,
                    receivedAtMs: stamp.monotonicMs
                )
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.motionCaptureDidReceiveActivity(raw: raw, production: production, stamp: stamp)
                }
            }
        }

        if available.stepCounting {
            pedometer.startUpdates(from: Date()) { [weak self] data, error in
                guard let self, self.isRunning else { return }
                let stamp = self.clock.now()
                if let error {
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "pedometer", error: error, stamp: stamp)
                    }
                    return
                }
                guard let data else {
                    let error = NSError(domain: "WalkingRecorder.Motion", code: 3, userInfo: [NSLocalizedDescriptionKey: "Pedometer delivered no data."])
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "pedometer", error: error, stamp: stamp)
                    }
                    return
                }
                let cadence = data.currentCadence?.doubleValue
                let validCadence = cadence == nil || (cadence!.isFinite && cadence! >= 0)
                let sourceWallMs = Int64((data.endDate.timeIntervalSince1970 * 1_000).rounded())
                let sourceMonotonicMs = stamp.monotonicMs + (sourceWallMs - stamp.wallTimeMs)
                let raw: [String: Any] = [
                    "stream": "pedometer",
                    "valid": validCadence,
                    "invalidReason": validCadence ? NSNull() : "cadence was non-finite or negative",
                    "sourceStartWallTimeMs": Int64((data.startDate.timeIntervalSince1970 * 1_000).rounded()),
                    "sourceEndWallTimeMs": sourceWallMs,
                    "sourceEndMonotonicMsMapped": sourceMonotonicMs,
                    "sourceClock": "CMPedometerData.endDate mapped from wall clock at callback receipt",
                    "stepsPerSecond": validCadence ? Self.optionalDouble(cadence) : NSNull(),
                    "stepsPerMinuteDerived": validCadence ? Self.optionalDouble(cadence.map { $0 * 60 }) : NSNull(),
                    "cumulativeSteps": data.numberOfSteps.intValue,
                    "distanceMeters": Self.finiteNumber(data.distance),
                    "currentPaceSecondsPerMeter": Self.finiteNumber(data.currentPace),
                    "averageActivePaceSecondsPerMeter": Self.finiteNumber(data.averageActivePace),
                    "floorsAscended": Self.optionalInt(data.floorsAscended?.intValue),
                    "floorsDescended": Self.optionalInt(data.floorsDescended?.intValue)
                ]
                let production = validCadence && sourceMonotonicMs <= stamp.monotonicMs
                    ? ProductionCadenceSample(
                        stepsPerSecond: cadence,
                        cumulativeSteps: data.numberOfSteps.intValue,
                        asOfMs: sourceMonotonicMs
                    )
                    : nil
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.motionCaptureDidReceiveCadence(raw: raw, production: production, stamp: stamp)
                }
            }
        }

        if available.accelerometer {
            motionManager.accelerometerUpdateInterval = 1.0 / requestedDeviceMotionHz
            motionManager.startAccelerometerUpdates(to: operationQueue) { [weak self] sample, error in
                guard let self, self.isRunning else { return }
                let stamp = self.clock.now()
                if let error {
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "accelerometer", error: error, stamp: stamp)
                    }
                    return
                }
                guard let sample else {
                    let error = NSError(domain: "WalkingRecorder.Motion", code: 5, userInfo: [NSLocalizedDescriptionKey: "Accelerometer delivered no data."])
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "accelerometer", error: error, stamp: stamp)
                    }
                    return
                }
                var invalidFields: [String] = []
                let acceleration = Self.vector(
                    x: sample.acceleration.x,
                    y: sample.acceleration.y,
                    z: sample.acceleration.z,
                    name: "acceleration",
                    invalidFields: &invalidFields
                )
                let raw: [String: Any] = [
                    "stream": "accelerometer",
                    "valid": invalidFields.isEmpty,
                    "invalidFields": invalidFields,
                    "sourceTimestampSecondsSinceBoot": sample.timestamp,
                    "sourceClock": "Core Motion boot-relative timestamp",
                    "configuredIntervalSeconds": self.motionManager.accelerometerUpdateInterval,
                    "configuredRateHz": 1.0 / self.motionManager.accelerometerUpdateInterval,
                    "accelerationG": acceleration
                ]
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.motionCaptureDidReceiveInertial(
                        raw: raw,
                        stream: "accelerometer",
                        sourceTimestampSeconds: sample.timestamp,
                        stamp: stamp
                    )
                }
            }
        }

        if available.gyroscope {
            motionManager.gyroUpdateInterval = 1.0 / requestedDeviceMotionHz
            motionManager.startGyroUpdates(to: operationQueue) { [weak self] sample, error in
                guard let self, self.isRunning else { return }
                let stamp = self.clock.now()
                if let error {
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "gyroscope", error: error, stamp: stamp)
                    }
                    return
                }
                guard let sample else {
                    let error = NSError(domain: "WalkingRecorder.Motion", code: 6, userInfo: [NSLocalizedDescriptionKey: "Gyroscope delivered no data."])
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "gyroscope", error: error, stamp: stamp)
                    }
                    return
                }
                var invalidFields: [String] = []
                let rotationRate = Self.vector(
                    x: sample.rotationRate.x,
                    y: sample.rotationRate.y,
                    z: sample.rotationRate.z,
                    name: "rotationRate",
                    invalidFields: &invalidFields
                )
                let raw: [String: Any] = [
                    "stream": "gyroscope",
                    "valid": invalidFields.isEmpty,
                    "invalidFields": invalidFields,
                    "sourceTimestampSecondsSinceBoot": sample.timestamp,
                    "sourceClock": "Core Motion boot-relative timestamp",
                    "configuredIntervalSeconds": self.motionManager.gyroUpdateInterval,
                    "configuredRateHz": 1.0 / self.motionManager.gyroUpdateInterval,
                    "rotationRateRadiansPerSecond": rotationRate
                ]
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.motionCaptureDidReceiveInertial(
                        raw: raw,
                        stream: "gyroscope",
                        sourceTimestampSeconds: sample.timestamp,
                        stamp: stamp
                    )
                }
            }
        }

        if available.deviceMotion {
            motionManager.deviceMotionUpdateInterval = 1.0 / requestedDeviceMotionHz
            motionManager.startDeviceMotionUpdates(to: operationQueue) { [weak self] motion, error in
                guard let self, self.isRunning else { return }
                let stamp = self.clock.now()
                if let error {
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "device_motion", error: error, stamp: stamp)
                    }
                    return
                }
                guard let motion else {
                    let error = NSError(domain: "WalkingRecorder.Motion", code: 4, userInfo: [NSLocalizedDescriptionKey: "Device motion delivered no data."])
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "device_motion", error: error, stamp: stamp)
                    }
                    return
                }
                var invalidFields: [String] = []
                func vector(_ value: CMAcceleration, name: String) -> [String: Any] {
                    Self.vector(x: value.x, y: value.y, z: value.z, name: name, invalidFields: &invalidFields)
                }
                func rotation(_ value: CMRotationRate, name: String) -> [String: Any] {
                    Self.vector(x: value.x, y: value.y, z: value.z, name: name, invalidFields: &invalidFields)
                }
                let attitude = motion.attitude
                let quaternionValues = [attitude.quaternion.x, attitude.quaternion.y, attitude.quaternion.z, attitude.quaternion.w]
                if quaternionValues.contains(where: { !$0.isFinite }) { invalidFields.append("attitudeQuaternion") }
                let eulerValues = [attitude.roll, attitude.pitch, attitude.yaw]
                if eulerValues.contains(where: { !$0.isFinite }) { invalidFields.append("attitudeEuler") }
                let totalAcceleration = Self.vector(
                    x: motion.gravity.x + motion.userAcceleration.x,
                    y: motion.gravity.y + motion.userAcceleration.y,
                    z: motion.gravity.z + motion.userAcceleration.z,
                    name: "totalAcceleration",
                    invalidFields: &invalidFields
                )
                let magnetic = motion.magneticField
                let magneticVector = Self.vector(
                    x: magnetic.field.x,
                    y: magnetic.field.y,
                    z: magnetic.field.z,
                    name: "magneticField",
                    invalidFields: &invalidFields
                )
                let raw: [String: Any] = [
                    "stream": "device_motion",
                    "valid": invalidFields.isEmpty,
                    "invalidFields": invalidFields,
                    "sourceTimestampSecondsSinceBoot": motion.timestamp,
                    "sourceClock": "Core Motion boot-relative timestamp",
                    "configuredIntervalSeconds": self.motionManager.deviceMotionUpdateInterval,
                    "configuredRateHz": 1.0 / self.motionManager.deviceMotionUpdateInterval,
                    "totalAccelerationG": totalAcceleration,
                    "gravityG": vector(motion.gravity, name: "gravity"),
                    "userAccelerationG": vector(motion.userAcceleration, name: "userAcceleration"),
                    "rotationRateRadiansPerSecond": rotation(motion.rotationRate, name: "rotationRate"),
                    "attitudeEulerRadians": [
                        "roll": Self.finiteOrNull(attitude.roll),
                        "pitch": Self.finiteOrNull(attitude.pitch),
                        "yaw": Self.finiteOrNull(attitude.yaw)
                    ],
                    "attitudeQuaternion": [
                        "x": Self.finiteOrNull(attitude.quaternion.x),
                        "y": Self.finiteOrNull(attitude.quaternion.y),
                        "z": Self.finiteOrNull(attitude.quaternion.z),
                        "w": Self.finiteOrNull(attitude.quaternion.w)
                    ],
                    "magneticFieldMicroteslas": magneticVector,
                    "magneticFieldAccuracy": Self.magneticAccuracy(magnetic.accuracy)
                ]
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.motionCaptureDidReceiveDeviceMotion(raw: raw, sourceTimestampSeconds: motion.timestamp, stamp: stamp)
                }
            }
        }
        return available
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        activityManager.stopActivityUpdates()
        pedometer.stopUpdates()
        motionManager.stopAccelerometerUpdates()
        motionManager.stopGyroUpdates()
        motionManager.stopDeviceMotionUpdates()
    }

    private static func vector(
        x: Double,
        y: Double,
        z: Double,
        name: String,
        invalidFields: inout [String]
    ) -> [String: Any] {
        let values = [x, y, z]
        if values.contains(where: { !$0.isFinite }) { invalidFields.append(name) }
        return ["x": finiteOrNull(x), "y": finiteOrNull(y), "z": finiteOrNull(z)]
    }

    private static func finiteOrNull(_ value: Double) -> Any { value.isFinite ? value : NSNull() }

    private static func optionalDouble(_ value: Double?) -> Any {
        guard let value else { return NSNull() }
        return value
    }

    private static func optionalInt(_ value: Int?) -> Any {
        guard let value else { return NSNull() }
        return value
    }

    private static func finiteNumber(_ value: NSNumber?) -> Any {
        guard let double = value?.doubleValue, double.isFinite else { return NSNull() }
        return double
    }

    private static func magneticAccuracy(_ accuracy: CMMagneticFieldCalibrationAccuracy) -> String {
        switch accuracy {
        case .uncalibrated: return "uncalibrated"
        case .low: return "low"
        case .medium: return "medium"
        case .high: return "high"
        @unknown default: return "unknown"
        }
    }
}
