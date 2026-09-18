import Foundation

/// The five ground-truth places. Exactly one is active at all times, and a tap
/// is one atomic boundary, the same way the walking recorder's scenario tap is.
enum GymPlaceLabel: String, CaseIterable, Codable, Identifiable {
    case inGym = "in_gym"
    case inCircleNotGym = "in_circle_not_gym"
    case onBoundary = "on_boundary"
    case passingBy = "passing_by"
    case away = "away"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .inGym: return "I'm in the gym"
        case .inCircleNotGym: return "In the circle, not in the gym"
        case .onBoundary: return "On the boundary line"
        case .passingBy: return "Passing by, not stopping"
        case .away: return "Away"
        }
    }

    var symbol: String {
        switch self {
        case .inGym: return "dumbbell.fill"
        case .inCircleNotGym: return "car.fill"
        case .onBoundary: return "circle.dashed"
        case .passingBy: return "figure.walk.motion"
        case .away: return "arrow.left"
        }
    }

    /// The two places the recording screen shows as giant buttons; the rest
    /// live under More.
    var isPrimaryPlace: Bool { self == .inGym || self == .away }

    var guidance: String {
        switch self {
        case .inGym: return "Inside the building, past the front desk"
        case .inCircleNotGym: return "Car park, entrance, café: inside the circle but not inside the gym"
        case .onBoundary: return "Standing on the edge of the circle"
        case .passingBy: return "Moving through the circle without stopping"
        case .away: return "Outside the circle"
        }
    }

    /// True for places the production model treats as "not present".
    var isExpectedAbsent: Bool {
        switch self {
        case .away, .passingBy, .inCircleNotGym: return true
        case .inGym, .onBoundary: return false
        }
    }
}

enum GymLabelReason: String {
    case userTap = "user_tap"
    case sessionStart = "session_start"
    case sessionEnd = "session_end"
    case backdatedCorrection = "backdated_correction"
}

enum GymLabelBasis: String {
    case live
    case backdatedEstimate = "backdated_estimate"
}

struct GymLabelTransition: Equatable {
    let from: GymPlaceLabel?
    let to: GymPlaceLabel?
    let boundary: CaptureStamp
    let receipt: CaptureStamp
    let reason: String
    let basis: String
    let declaredOffsetSeconds: Double?

    var dictionary: [String: Any] {
        [
            "fromPlace": from?.rawValue ?? NSNull(),
            "toPlace": to?.rawValue ?? NSNull(),
            "boundaryMonotonicNs": boundary.monotonicNs,
            "boundaryWallTimeMs": boundary.wallTimeMs,
            "boundaryWallTimeISO8601": boundary.wallTimeISO8601,
            "reason": reason,
            "basis": basis,
            "declaredOffsetSeconds": declaredOffsetSeconds ?? NSNull()
        ]
    }
}

/// One labeled window. The location sample counters belong to the window that
/// was open when the sample arrived, so the manifest can report coverage per
/// window, including the final window a process death leaves open.
struct GymLabelSegment: Equatable {
    let place: GymPlaceLabel
    let from: CaptureStamp
    fileprivate(set) var to: CaptureStamp?
    fileprivate(set) var locationSampleCount = 0
    fileprivate(set) var locationSampleStamps: [CaptureStamp] = []
    fileprivate(set) var regionEventsDuringWindow = 0
    let basis: String
    let declaredOffsetSeconds: Double?

    /// The window's uncertainty span. A live boundary carries the shared ±15 s
    /// human tolerance; a backdated boundary is uncertain over the whole span it
    /// could have been declared in.
    func uncertaintySeconds(toleranceSeconds: Double) -> Double {
        if basis == GymLabelBasis.backdatedEstimate.rawValue {
            return max(0, (declaredOffsetSeconds ?? 0) * 2)
        }
        return toleranceSeconds
    }
}

/// Label boundaries for the gym harness, the same machinery as the walking
/// recorder's `LabelTimeline` with `GymPlaceLabel` and the two additions the
/// gym protocol needs: a reason/basis on every boundary and per-window region
/// event counting.
struct GymLabelTimeline {
    private(set) var active: GymPlaceLabel?
    private(set) var activeSince: CaptureStamp?
    private(set) var segmentCount = 0
    private(set) var placeCounts: [String: Int] = [:]
    private(set) var segments: [GymLabelSegment] = []

    mutating func transition(
        to next: GymPlaceLabel?,
        at stamp: CaptureStamp,
        reason: GymLabelReason,
        receipt: CaptureStamp? = nil,
        basis: GymLabelBasis = .live,
        declaredOffsetSeconds: Double? = nil
    ) -> GymLabelTransition? {
        guard next != active else { return nil }
        let previous = active
        if previous != nil, let index = segments.indices.last, segments[index].to == nil {
            segments[index].to = stamp
        }
        active = next
        activeSince = next == nil ? nil : stamp
        if let next {
            segmentCount += 1
            placeCounts[next.rawValue, default: 0] += 1
            segments.append(
                GymLabelSegment(
                    place: next,
                    from: stamp,
                    to: nil,
                    basis: basis.rawValue,
                    declaredOffsetSeconds: declaredOffsetSeconds
                )
            )
        }
        return GymLabelTransition(
            from: previous,
            to: next,
            boundary: stamp,
            receipt: receipt ?? stamp,
            reason: reason.rawValue,
            basis: basis.rawValue,
            declaredOffsetSeconds: declaredOffsetSeconds
        )
    }

    /// A boundary the operator missed and declared afterwards. The boundary is
    /// placed at receipt − offset, keeps the whole `[receipt − 2 × offset,
    /// receipt]` span as its uncertainty, and is marked approximate so the
    /// validator can score it without ever presenting it as a live tap.
    mutating func backdatedTransition(
        to next: GymPlaceLabel,
        receipt: CaptureStamp,
        offsetSeconds: Double,
        reason: GymLabelReason = .backdatedCorrection
    ) -> GymLabelTransition? {
        let boundary = receipt.offsetBy(seconds: -offsetSeconds)
        return transition(
            to: next,
            at: boundary,
            reason: reason,
            receipt: receipt,
            basis: .backdatedEstimate,
            declaredOffsetSeconds: offsetSeconds
        )
    }

    /// A sample counts only toward the labeled window that was open when it
    /// arrived. Samples outside every label are transition evidence and belong
    /// to no window.
    mutating func recordLocationSample(at stamp: CaptureStamp) {
        guard let index = segments.indices.last, segments[index].to == nil else { return }
        segments[index].locationSampleCount += 1
        segments[index].locationSampleStamps.append(stamp)
    }

    mutating func recordRegionEvent() {
        guard let index = segments.indices.last, segments[index].to == nil else { return }
        segments[index].regionEventsDuringWindow += 1
    }

    /// Closes the window that was still open when the session ended or failed.
    mutating func closeOpenSegment(at stamp: CaptureStamp) -> Bool {
        guard let index = segments.indices.last, segments[index].to == nil else { return false }
        segments[index].to = stamp.monotonicNs >= segments[index].from.monotonicNs ? stamp : segments[index].from
        return true
    }

    /// Per-window location coverage. Uncovered time is the union of every
    /// declared suspension inside the window plus every delivery gap longer
    /// than the location threshold (before the first sample, between two
    /// samples, and after the last sample), so a window whose stream was
    /// suspended can never be read as evidence of being outside. A gap at or
    /// below the threshold is normal Core Location behaviour and is covered.
    func labelWindows(
        endedAt: CaptureStamp,
        suspensions: [RawSuspensionInterval],
        thresholdSeconds: Double
    ) -> [GymLabelWindow] {
        segments.map { segment in
            let end = segment.to ?? endedAt
            let duration = max(0, Double(end.monotonicNs - segment.from.monotonicNs) / 1_000_000_000)
            var uncovered: [(UInt64, UInt64)] = []
            // Only the location stream's gaps reduce a window's location
            // coverage. Motion suspensions stay in the manifest's suspension
            // list but never make a location window look uncovered.
            for suspension in suspensions where suspension.observedStreams.contains("location") {
                let low = max(suspension.fromReceiptMonotonicNs, segment.from.monotonicNs)
                let high = min(suspension.toReceiptMonotonicNs, end.monotonicNs)
                if high > low { uncovered.append((low, high)) }
            }
            func gapIsUncovered(_ from: UInt64, _ to: UInt64) -> Bool {
                to > from && Double(to - from) / 1_000_000_000 > thresholdSeconds
            }
            let stamps = segment.locationSampleStamps.map(\.monotonicNs).sorted()
            if let first = stamps.first {
                if gapIsUncovered(segment.from.monotonicNs, first) {
                    uncovered.append((segment.from.monotonicNs, min(first, end.monotonicNs)))
                }
                var previous = first
                for stamp in stamps.dropFirst() {
                    if gapIsUncovered(previous, stamp) { uncovered.append((previous, stamp)) }
                    previous = max(previous, stamp)
                }
                if let last = stamps.last, gapIsUncovered(last, end.monotonicNs) {
                    uncovered.append((last, end.monotonicNs))
                }
            } else {
                uncovered.append((segment.from.monotonicNs, end.monotonicNs))
            }
            let uncoveredSeconds = min(duration, MonotonicIntervalUnion.lengthSeconds(uncovered))
            let coverage: RawLabelWindowCoverage
            if segment.locationSampleCount == 0 {
                coverage = .none
            } else if uncoveredSeconds <= thresholdSeconds {
                coverage = .covered
            } else {
                coverage = .partial
            }
            return GymLabelWindow(
                place: segment.place.rawValue,
                fromReceiptMonotonicNs: segment.from.monotonicNs,
                toReceiptMonotonicNs: end.monotonicNs,
                fromReceiptWallTimeMs: segment.from.wallTimeMs,
                toReceiptWallTimeMs: end.wallTimeMs,
                durationSeconds: duration,
                locationSampleCount: segment.locationSampleCount,
                regionEventsDuringWindow: segment.regionEventsDuringWindow,
                uncoveredSeconds: uncoveredSeconds,
                coverageRatio: duration > 0 ? max(0, min(1, 1 - uncoveredSeconds / duration)) : 1,
                coverage: coverage,
                basis: segment.basis,
                declaredOffsetSeconds: segment.declaredOffsetSeconds
            )
        }
    }
}

extension CaptureStamp {
    /// Wall-clock arithmetic for a backdated boundary. The monotonic clock is
    /// only ever moved backwards inside a declared estimation window, which is
    /// exactly what the basis field says.
    func offsetBy(seconds: Double) -> CaptureStamp {
        let deltaMs = Int64((seconds * 1_000).rounded())
        let wall = wallTimeMs + deltaMs
        let monotonicDeltaNs = Int64((seconds * 1_000_000_000).rounded())
        let monotonic: UInt64
        if monotonicDeltaNs >= 0 {
            monotonic = monotonicNs + UInt64(monotonicDeltaNs)
        } else {
            let magnitude = UInt64(-monotonicDeltaNs)
            monotonic = magnitude > monotonicNs ? 0 : monotonicNs - magnitude
        }
        return CaptureStamp(
            monotonicNs: monotonic,
            wallTimeMs: wall,
            wallTimeISO8601: RawStreamManifest.iso8601(wallMilliseconds: wall)
        )
    }
}

// MARK: - The shared scenario catalogue

struct GymScenarioStep: Codable, Equatable, Identifiable {
    let id: String
    let text: String
    /// "place" expects one place tap; "ack" expects the Done button.
    let kind: String
    let place: GymPlaceLabel?
    let ack: String?

    var expectsPlaceTap: Bool { kind == "place" }
}

struct GymScenario: Codable, Equatable, Identifiable {
    let id: String
    let title: String
    let captainWords: String?
    let mode: String
    let requireExcerLockDeclaration: Bool
    let requiredLabels: [GymPlaceLabel]
    let requiredAcks: [String]
    let cannotBeJudged: [String]
    let refExpectation: String
    let prodExpectation: String
    let expectNoConfirmation: Bool?
    let minimumWindowSeconds: Double?
    let allowBackdatedLabel: Bool?
    let requiresTwoGyms: Bool?
    let steps: [GymScenarioStep]

    var isSetupOnly: Bool { mode == "setup" }
    var isDescriptive: Bool { mode == "descriptive" }
}

struct GymThresholds: Codable, Equatable {
    let confidenceToleranceSeconds: Double
    let confirmMs: Int64
    let confirmToleranceMs: Int64
    let slowDetectionSeconds: Double
    let slowReleaseSeconds: Double
    let falseNegativeMinimumInGymSeconds: Double
    let exitNeverDeliveredMinutes: Double
    let minimumOscillationBoundaries: Int
    let coveragePartialFloorRatio: Double
    let foregroundReturnAttributionSeconds: Double
    let radiusMinMeters: Double
    let radiusMaxMeters: Double
    let radiusStepMeters: Double
    let radiusDefaultMeters: Double
    let maxGyms: Int
    let minimumFreeBytesToStart: Int64
}

struct GymExpectedTable: Codable, Equatable {
    let version: Int
    let scriptVersion: Int
    let expectedOutcomeVersion: Int
    let places: [GymPlaceLabel]
    let thresholds: GymThresholds
    let scenarios: [GymScenario]

    static func load(from data: Data) throws -> GymExpectedTable {
        try JSONDecoder().decode(GymExpectedTable.self, from: data)
    }

    /// The app bundle and the test bundle each carry the same EXPECTED.json, so
    /// Swift and Python always read one file.
    static func loadFromBundle(_ bundle: Bundle = .main) throws -> GymExpectedTable {
        guard let url = bundle.url(forResource: "EXPECTED", withExtension: "json") else {
            throw ScenarioCatalogError.missingTable
        }
        return try load(from: Data(contentsOf: url))
    }

    func scenario(id: String) -> GymScenario? { scenarios.first { $0.id == id } }

    /// The scripted steps shown while recording, in order.
    func steps(for scenarioId: String?) -> [GymScenarioStep] {
        guard let scenarioId, let scenario = scenario(id: scenarioId) else { return [] }
        return scenario.steps
    }
}

enum ScenarioCatalogError: LocalizedError, Equatable {
    case missingTable
    case unknownScenario(String)

    var errorDescription: String? {
        switch self {
        case .missingTable: return "EXPECTED.json is missing from the app bundle."
        case .unknownScenario(let id): return "The scenario catalogue has no entry for \(id)."
        }
    }
}

/// Loads the catalogue once for the whole app.
final class ScenarioCatalog {
    static let shared = ScenarioCatalog()

    private(set) var table: GymExpectedTable?
    private(set) var loadError: String?

    init(bundle: Bundle = .main) {
        do {
            table = try GymExpectedTable.loadFromBundle(bundle)
        } catch {
            loadError = error.localizedDescription
        }
    }

    var scenarios: [GymScenario] { table?.scenarios ?? [] }
    var thresholds: GymThresholds? { table?.thresholds }

    func scenario(id: String?) -> GymScenario? {
        guard let id else { return nil }
        return table?.scenario(id: id)
    }

    /// The scripted steps the recording strip shows, in order. Empty for a free
    /// session or an unknown id rather than a failure: a session must always be
    /// recordable even when the catalogue is missing.
    func steps(for scenarioId: String?) -> [GymScenarioStep] {
        table?.steps(for: scenarioId) ?? []
    }
}
