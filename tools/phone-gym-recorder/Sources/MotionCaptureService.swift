import CoreMotion
import Foundation

protocol MotionCaptureServiceDelegate: AnyObject {
    func motionCaptureDidReceiveActivity(raw: [String: Any], stamp: CaptureStamp)
    func motionCaptureDidReceivePedometer(raw: [String: Any], stamp: CaptureStamp)
    func motionCaptureDidFail(stream: String, error: Error, stamp: CaptureStamp)
}

protocol MotionCaptureServicing: AnyObject {
    var delegate: MotionCaptureServiceDelegate? { get set }
    var availability: SensorAvailability { get }
    var permission: MotionPermission { get }
    func requestLiveAuthorization(completion: @escaping (MotionPermission) -> Void)
    func start() throws -> SensorAvailability
    func stop()
}

/// The walking recorder's motion capture with the accelerometer, gyroscope and
/// fused device-motion subscriptions deleted. What remains is exactly what this
/// harness needs to tell "arrived by vehicle" from "walked in" and "seated in
/// the car park" from "walked into the building": activity classification and
/// pedometer cadence.
final class MotionCaptureService: MotionCaptureServicing {
    weak var delegate: MotionCaptureServiceDelegate?

    private let activityManager = CMMotionActivityManager()
    private let pedometer = CMPedometer()
    private let clock: CaptureClock
    private let operationQueue: OperationQueue = {
        let queue = OperationQueue()
        queue.name = "com.johansardar.excerlock.lab.gymrecorder.motion"
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

    /// Requests only live Motion & Fitness access. It never queries activity or
    /// step history.
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
            throw NSError(domain: "GymRecorder.Motion", code: 1, userInfo: [NSLocalizedDescriptionKey: "Motion & Fitness permission is not authorized."])
        }
        let available = availability
        guard available.activity || available.stepCounting else {
            throw NSError(domain: "GymRecorder.Motion", code: 2, userInfo: [NSLocalizedDescriptionKey: "Activity classification and step counting are both unavailable on this device."])
        }
        isRunning = true

        if available.activity {
            activityManager.startActivityUpdates(to: operationQueue) { [weak self] activity in
                guard let self, self.isRunning, let activity else { return }
                let stamp = self.clock.now()
                let startedWallMs = Int64((activity.startDate.timeIntervalSince1970 * 1_000).rounded())
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
                    "sourceWallTimeMs": startedWallMs,
                    "sourceClock": "CMMotionActivity.startDate",
                    "appState": "n/a"
                ]
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.motionCaptureDidReceiveActivity(raw: raw, stamp: stamp)
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
                    let error = NSError(domain: "GymRecorder.Motion", code: 3, userInfo: [NSLocalizedDescriptionKey: "Pedometer delivered no data."])
                    DispatchQueue.main.async { [weak self] in
                        self?.delegate?.motionCaptureDidFail(stream: "pedometer", error: error, stamp: stamp)
                    }
                    return
                }
                let cadence = data.currentCadence?.doubleValue
                let validCadence = cadence == nil || (cadence!.isFinite && cadence! >= 0)
                let sourceWallMs = Int64((data.endDate.timeIntervalSince1970 * 1_000).rounded())
                let raw: [String: Any] = [
                    "stream": "pedometer",
                    "valid": validCadence,
                    "invalidReason": validCadence ? NSNull() : "cadence was non-finite or negative",
                    "numberOfSteps": data.numberOfSteps.intValue,
                    "currentCadenceStepsPerSecond": validCadence ? Self.optionalDouble(cadence) : NSNull(),
                    "currentCadenceStepsPerMinute": validCadence ? Self.optionalDouble(cadence.map { $0 * 60 }) : NSNull(),
                    "currentPaceSecondsPerMeter": Self.finiteNumber(data.currentPace),
                    "distanceM": Self.finiteNumber(data.distance),
                    "sourceWallTimeMs": sourceWallMs,
                    "sourceClock": "CMPedometerData.endDate"
                ]
                DispatchQueue.main.async { [weak self] in
                    self?.delegate?.motionCaptureDidReceivePedometer(raw: raw, stamp: stamp)
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
    }

    private static func finiteNumber(_ value: NSNumber?) -> Any {
        guard let value, value.doubleValue.isFinite else { return NSNull() }
        return value.doubleValue
    }

    private static func optionalDouble(_ value: Double?) -> Any {
        guard let value, value.isFinite else { return NSNull() }
        return value
    }
}
