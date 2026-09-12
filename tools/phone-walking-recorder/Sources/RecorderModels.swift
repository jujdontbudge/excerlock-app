import CoreMotion
import Darwin
import Foundation

let recorderSchemaVersion = 1
let productionMotionFreshnessMs: Int64 = 5_000
let productionMinimumWalkingCadencePerMinute = 80.0
let productionWalkQualificationMs: Int64 = 3_000
let productionWalkSilenceMs: Int64 = 5_000
let productionWalkingGraceMs: Int64 = 30_000
let requestedDeviceMotionHz = 50.0
let maximumSessionBytes: Int64 = 250 * 1_024 * 1_024
let minimumFreeBytesToStart: Int64 = 300 * 1_024 * 1_024

struct CaptureStamp: Codable, Equatable {
    let monotonicNs: UInt64
    let wallTimeMs: Int64
    let wallTimeISO8601: String

    var monotonicMs: Int64 { Int64(monotonicNs / 1_000_000) }
}

protocol CaptureClock {
    func now() -> CaptureStamp
}

struct SystemCaptureClock: CaptureClock {
    private static let formatter = ISO8601DateFormatter()

    func now() -> CaptureStamp {
        var timebase = mach_timebase_info_data_t()
        mach_timebase_info(&timebase)
        let ticks = mach_continuous_time()
        let nanoseconds = ticks.multipliedReportingOverflow(by: UInt64(timebase.numer)).overflow
            ? UInt64(Double(ticks) * Double(timebase.numer) / Double(timebase.denom))
            : ticks * UInt64(timebase.numer) / UInt64(timebase.denom)
        let date = Date()
        return CaptureStamp(
            monotonicNs: nanoseconds,
            wallTimeMs: Int64((date.timeIntervalSince1970 * 1_000).rounded()),
            wallTimeISO8601: Self.formatter.string(from: date)
        )
    }

    static var timebaseMetadata: [String: Any] {
        var timebase = mach_timebase_info_data_t()
        mach_timebase_info(&timebase)
        return [
            "clock": "mach_continuous_time",
            "convertedUnit": "nanoseconds",
            "timebaseNumerator": Int(timebase.numer),
            "timebaseDenominator": Int(timebase.denom),
            "wallMapping": "Each event includes a receipt-time wall clock reading and monotonic timestamp."
        ]
    }
}

enum GroundTruthScenario: String, CaseIterable, Codable, Identifiable {
    case normalWalking = "normal_walking"
    case treadmillWalkingPhoneInHand = "treadmill_walking_phone_in_hand"
    case seatedShaking = "seated_shaking"
    case sittingNormallyWithPhone = "sitting_normally_with_phone"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .normalWalking: return "Walking normally"
        case .treadmillWalkingPhoneInHand: return "Treadmill, phone in hand"
        case .seatedShaking: return "Seated and shaking phone"
        case .sittingNormallyWithPhone: return "Sitting normally with phone"
        }
    }

    var startAction: String {
        switch self {
        case .normalWalking: return "I’m walking now"
        case .treadmillWalkingPhoneInHand: return "I’m on the treadmill"
        case .seatedShaking: return "I’m shaking the phone"
        case .sittingNormallyWithPhone: return "I’m sitting normally"
        }
    }

    var stopAction: String {
        switch self {
        case .normalWalking: return "I’m not walking anymore"
        case .treadmillWalkingPhoneInHand: return "I’m off the treadmill"
        case .seatedShaking: return "I stopped shaking"
        case .sittingNormallyWithPhone: return "I’m not sitting anymore"
        }
    }

    var guidance: String {
        switch self {
        case .normalWalking: return "Indoors or outdoors, held as you usually use it"
        case .treadmillWalkingPhoneInHand: return "Walk naturally and keep using the phone"
        case .seatedShaking: return "Stay seated while deliberately shaking the phone"
        case .sittingNormallyWithPhone: return "Use the phone as usual without walking"
        }
    }

    var symbol: String {
        switch self {
        case .normalWalking: return "figure.walk"
        case .treadmillWalkingPhoneInHand: return "figure.run.treadmill"
        case .seatedShaking: return "wave.3.right"
        case .sittingNormallyWithPhone: return "figure.seated.seatbelt"
        }
    }
}

enum MotionPermission: String, Codable {
    case notDetermined
    case authorized
    case denied
    case restricted

    static var current: MotionPermission {
        switch CMMotionActivityManager.authorizationStatus() {
        case .notDetermined: return .notDetermined
        case .authorized: return .authorized
        case .denied: return .denied
        case .restricted: return .restricted
        @unknown default: return .restricted
        }
    }
}

struct SensorAvailability: Codable, Equatable {
    let activity: Bool
    let cadence: Bool
    let stepCounting: Bool
    let accelerometer: Bool
    let gyroscope: Bool
    let deviceMotion: Bool

    static var current: SensorAvailability {
        let manager = CMMotionManager()
        return SensorAvailability(
            activity: CMMotionActivityManager.isActivityAvailable(),
            cadence: CMPedometer.isCadenceAvailable(),
            stepCounting: CMPedometer.isStepCountingAvailable(),
            accelerometer: manager.isAccelerometerAvailable,
            gyroscope: manager.isGyroAvailable,
            deviceMotion: manager.isDeviceMotionAvailable
        )
    }

    var unavailableNames: [String] {
        var names: [String] = []
        if !activity { names.append("activity classification") }
        if !cadence { names.append("cadence") }
        if !stepCounting { names.append("step count") }
        if !accelerometer { names.append("raw accelerometer") }
        if !gyroscope { names.append("raw gyroscope") }
        if !deviceMotion { names.append("fused device motion") }
        return names
    }

    // The shipping CoreMotionService currently requires all three before starting,
    // even though MotionAdapter fuses activity OR cadence once running.
    var canRunProductionPath: Bool { activity && cadence && stepCounting }
    var isComplete: Bool { unavailableNames.isEmpty }
}

enum CaptureReadiness: Equatable {
    case ready
    case needsPermission
    case permissionDenied
    case permissionRestricted
    case unsupported([String])
    case lowStorage

    static func evaluate(permission: MotionPermission, availability: SensorAvailability, freeBytes: Int64?) -> CaptureReadiness {
        if let freeBytes, freeBytes < minimumFreeBytesToStart { return .lowStorage }
        switch permission {
        case .notDetermined: return .needsPermission
        case .denied: return .permissionDenied
        case .restricted: return .permissionRestricted
        case .authorized: break
        }
        guard availability.canRunProductionPath else {
            return .unsupported(availability.unavailableNames)
        }
        return .ready
    }
}

enum SessionCompletionStatus: String, Codable {
    case completed
    case interrupted
    case storageLimit
    case sensorError
}

struct SessionSummary: Codable, Identifiable, Equatable {
    let id: String
    let startedAt: CaptureStamp
    let endedAt: CaptureStamp
    let status: SessionCompletionStatus
    let eventCount: Int
    let segmentCount: Int
    let gapCount: Int
    let byteCount: Int64
    let scenarioCounts: [String: Int]
    let directoryName: String

    var durationSeconds: TimeInterval {
        Double(endedAt.monotonicNs - startedAt.monotonicNs) / 1_000_000_000
    }
}

struct LabelTransition: Equatable {
    let from: GroundTruthScenario?
    let to: GroundTruthScenario?
    let boundary: CaptureStamp
    let reason: String
}

struct LabelTimeline {
    private(set) var active: GroundTruthScenario?
    private(set) var activeSince: CaptureStamp?
    private(set) var segmentCount = 0
    private(set) var scenarioCounts: [String: Int] = [:]

    mutating func transition(to next: GroundTruthScenario?, at stamp: CaptureStamp, reason: String) -> LabelTransition? {
        guard next != active else { return nil }
        let previous = active
        active = next
        activeSince = next == nil ? nil : stamp
        if let next {
            segmentCount += 1
            scenarioCounts[next.rawValue, default: 0] += 1
        }
        return LabelTransition(from: previous, to: next, boundary: stamp, reason: reason)
    }
}

struct StoragePolicy {
    static func canStartSession(totalStoredBytes: Int64, freeBytes: Int64?) -> Bool {
        guard totalStoredBytes < 750 * 1_024 * 1_024 else { return false }
        guard let freeBytes else { return true }
        return freeBytes >= minimumFreeBytesToStart
    }
}
