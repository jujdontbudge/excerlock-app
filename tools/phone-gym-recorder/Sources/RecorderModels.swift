import CoreMotion
import Darwin
import Foundation

let recorderSchemaVersion = 1
/// The production gym constants this harness mirrors. They are recorded in
/// every archive's metadata.json so a reader never has to guess which build of
/// the reducer the port tracked.
let gymConfirmMs: Int64 = 30_000
let gymRadiusMinimumMeters = 50.0
let gymRadiusMaximumMeters = 200.0
let gymRadiusStepMeters = 10.0
let gymRadiusDefaultMeters = 100.0
let maximumGyms = 5
let maximumSessionBytes: Int64 = 250 * 1_024 * 1_024
let minimumFreeBytesToStart: Int64 = 300 * 1_024 * 1_024
/// Core Location has no fixed rate, so a location gap is only a suspension once
/// the stream has been silent longer than this while updates are requested.
/// Activity and pedometer are event-driven and use their own, longer threshold.
let locationSuspensionThresholdSeconds = 15.0
let eventStreamSuspensionThresholdSeconds = 120.0
let gymStreamThresholdSeconds: [String: Double] = [
    "location": locationSuspensionThresholdSeconds,
    "activity": eventStreamSuspensionThresholdSeconds,
    "pedometer": eventStreamSuspensionThresholdSeconds
]
let gymExpectedStreams = ["location", "activity", "pedometer"]

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

enum MotionPermission: String, Codable {
    case notDetermined
    case authorized
    case denied
    case restricted

    static var current: MotionPermission {
        #if os(macOS)
        return .restricted
        #else
        switch CMMotionActivityManager.authorizationStatus() {
        case .notDetermined: return .notDetermined
        case .authorized: return .authorized
        case .denied: return .denied
        case .restricted: return .restricted
        @unknown default: return .restricted
        }
        #endif
    }
}

/// Only the two motion signals this harness records: activity classification
/// (arrived on foot vs by vehicle, seated vs walking) and pedometer cadence. The
/// walking recorder's 50 Hz inertial streams are deliberately absent.
struct SensorAvailability: Codable, Equatable {
    let activity: Bool
    let cadence: Bool
    let stepCounting: Bool

    static var current: SensorAvailability {
        #if os(macOS)
        return SensorAvailability(activity: false, cadence: false, stepCounting: false)
        #else
        return SensorAvailability(
            activity: CMMotionActivityManager.isActivityAvailable(),
            cadence: CMPedometer.isCadenceAvailable(),
            stepCounting: CMPedometer.isStepCountingAvailable()
        )
        #endif
    }

    var unavailableNames: [String] {
        var names: [String] = []
        if !activity { names.append("activity classification") }
        if !cadence { names.append("cadence") }
        if !stepCounting { names.append("step count") }
        return names
    }

    var canRunProductionPath: Bool { activity && cadence && stepCounting }
}

enum LocationPermission: String, Codable {
    case notDetermined
    case restricted
    case denied
    case whenInUse
    case always

    var isAuthorized: Bool { self == .whenInUse || self == .always }
}

enum LocationAccuracyAuthorization: String, Codable {
    case fullAccuracy
    case reducedAccuracy
}

/// The harness records under any permission state on purpose: the denial and
/// reduced-accuracy scenarios exist to be judged. This readiness value only
/// tells the operator what the current capture can prove.
enum CaptureReadiness: Equatable {
    case ready
    case locationNotDetermined
    case locationDenied
    case locationRestricted
    case reducedAccuracy
    case noGymConfigured
    case unsupported([String])
    case lowStorage

    var allowsRecording: Bool {
        switch self {
        case .ready, .reducedAccuracy, .locationDenied, .locationRestricted, .noGymConfigured:
            return true
        case .locationNotDetermined, .unsupported, .lowStorage:
            return false
        }
    }

    static func evaluate(
        permission: LocationPermission,
        accuracy: LocationAccuracyAuthorization,
        hasGym: Bool,
        availability: SensorAvailability,
        freeBytes: Int64?,
        storageRejected: Bool = false
    ) -> CaptureReadiness {
        if storageRejected { return .lowStorage }
        if let freeBytes, freeBytes < minimumFreeBytesToStart { return .lowStorage }
        switch permission {
        case .notDetermined: return .locationNotDetermined
        case .denied: return .locationDenied
        case .restricted: return .locationRestricted
        case .whenInUse, .always: break
        }
        if accuracy == .reducedAccuracy { return .reducedAccuracy }
        guard hasGym else { return .noGymConfigured }
        guard availability.canRunProductionPath else { return .unsupported(availability.unavailableNames) }
        return .ready
    }
}

enum SessionCompletionStatus: String, Codable, Hashable {
    case completed
    case interrupted
    case storageLimit
    case sensorError
}

/// One labeled window with its Core Location coverage. The numbers carry the
/// exact story; the state is the coarse label. `none` means no location sample
/// at all arrived inside the window, so the window can never be read as
/// "outside" merely because the stream was silent.
struct GymLabelWindow: Codable, Equatable {
    let place: String
    let fromReceiptMonotonicNs: UInt64
    let toReceiptMonotonicNs: UInt64
    let fromReceiptWallTimeMs: Int64
    let toReceiptWallTimeMs: Int64
    let durationSeconds: Double
    let locationSampleCount: Int
    let regionEventsDuringWindow: Int
    let uncoveredSeconds: Double
    let coverageRatio: Double
    let coverage: RawLabelWindowCoverage
    let basis: String
    let declaredOffsetSeconds: Double?

    var dictionary: [String: Any] {
        [
            "place": place,
            "coverage": coverage.rawValue,
            "coverageRatio": coverageRatio,
            "uncoveredSeconds": uncoveredSeconds,
            "locationSampleCount": locationSampleCount,
            "regionEventsDuringWindow": regionEventsDuringWindow,
            "durationSeconds": durationSeconds,
            "basis": basis
        ]
    }
}

/// The reducer intervals the port held at finish, copied into the manifest so a
/// reader gets the verdict inputs without parsing decisions.ndjson.
struct GymIntervalSummary: Codable, Equatable {
    let id: String
    let regionId: String
    let enteredAtWallTimeMs: Int64
    let confirmedAtWallTimeMs: Int64
    let exitedAtWallTimeMs: Int64?
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
    let placeCounts: [String: Int]
    let directoryName: String
    /// The scenario the operator declared at start, if any.
    var scenarioId: String? = nil
    var gymIds: [String] = []
    var labelWindows: [GymLabelWindow] = []
    var reducerIntervals: [GymIntervalSummary] = []
    /// Explicit location/activity coverage evidence, the same shape the walking
    /// recorder uses. Optional so an archive finalized before the field existed
    /// still decodes.
    var streams: RawStreamManifest? = nil

    var durationSeconds: TimeInterval {
        Double(endedAt.monotonicNs - startedAt.monotonicNs) / 1_000_000_000
    }

    var placeCountsDescription: String {
        placeCounts.keys.sorted().map { "\($0) ×\(placeCounts[$0] ?? 0)" }.joined(separator: ", ")
    }
}

/// JSON-safe optionals. A nested dictionary literal has no contextual type, so
/// `value ?? NSNull()` cannot unify Int64 and NSNull there; these helpers make
/// the intent explicit and keep every nested payload writable as JSON.
func jsonOrNull(_ value: Int64?) -> Any { if let value { return value }; return NSNull() }
func jsonOrNull(_ value: Double?) -> Any { if let value { return value }; return NSNull() }
func jsonOrNull(_ value: String?) -> Any { if let value { return value }; return NSNull() }
func jsonOrNull(_ value: Bool?) -> Any { if let value { return value }; return NSNull() }

struct StoragePolicy {static func canStartSession(totalStoredBytes: Int64, freeBytes: Int64?) -> Bool {
        guard totalStoredBytes < 750 * 1_024 * 1_024 else { return false }
        guard let freeBytes else { return true }
        return freeBytes >= minimumFreeBytesToStart
    }
}
