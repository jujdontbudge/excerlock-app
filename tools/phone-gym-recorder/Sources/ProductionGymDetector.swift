import Foundation

/// A faithful Swift port of `app-next/src/packages/activity/gymMachine.ts`.
///
/// The production reducer is the reference: `scripts/verify-production-parity.ts`
/// replays the shared fixtures through the real TypeScript reducer and
/// `ProductionGymDetectorTests` asserts this port produces byte-equal derived
/// state for the same inputs. If the two ever disagree, this file is wrong.
///
/// Two deliberate, documented deviations, both order-only:
/// - `coverageLostAt` and `regions` are iterated in sorted key order instead of
///   JavaScript object insertion order. The set of derived intervals is
///   identical; only the array order can differ when several regions resolve in
///   one step, which no shipped fixture does.
/// - string comparison uses Swift's `<` where the TypeScript uses
///   `localeCompare`. Record ids are lowercase ASCII, where the two agree.

enum GymTransitionType: String, Codable, Equatable {
    case enter
    case exit
}

struct GymTransitionRecord: Equatable {
    let id: String
    let regionId: String
    let type: GymTransitionType
    /// Observed transition/delivery time, not the exact boundary crossing.
    let atMs: Int64
    let receivedAtMs: Int64

    /// Exactly how `GeofenceEventProcessor.process` builds a production record.
    static func regionEvent(gymId: String, type: GymTransitionType, atMs: Int64) -> GymTransitionRecord {
        GymTransitionRecord(
            id: "\(gymId):\(type.rawValue):\(atMs)",
            regionId: gymId,
            type: type,
            atMs: atMs,
            receivedAtMs: atMs
        )
    }
}

struct GymInterval: Equatable {
    let id: String
    let regionId: String
    let enteredAt: Int64
    let confirmedAt: Int64
    var exitedAt: Int64?
}

struct GymRegionState: Equatable {
    var pendingEnterAt: Int64?
    var confirmedSince: Int64?
    var lastEventAt: Int64?
}

struct GymDetectionState: Equatable {
    let version: Int
    let watermark: Int64
    let records: [GymTransitionRecord]
    let regions: [String: GymRegionState]
    let intervals: [GymInterval]
    let coverageLostAt: [String: Int64]

    static func create(now: Int64) throws -> GymDetectionState {
        try validTimestamp(now)
        return GymDetectionState(version: 1, watermark: now, records: [], regions: [:], intervals: [], coverageLostAt: [:])
    }
}

enum GymEvent: Equatable {
    case records([GymTransitionRecord])
    case tick
    case coverageLost(regionId: String?)
}

enum GymStateError: Error, Equatable {
    case invalidTimestamp
    case invalidState
}

func validTimestamp(_ value: Int64) throws {
    // `Number.isFinite` in the production reducer. Int64 cannot be NaN, so the
    // only reachable rejection is a missing value, which Swift's type system
    // already prevents; the check exists so the port reads like the original.
}

func createGymState(now: Int64) throws -> GymDetectionState {
    try GymDetectionState.create(now: now)
}

func reduceGym(_ previous: GymDetectionState, event: GymEvent, now: Int64) throws -> GymDetectionState {
    try validTimestamp(now)
    try validateGymState(previous)
    let current = max(now, previous.watermark)
    var records = previous.records
    var coverageLostAt = previous.coverageLostAt

    switch event {
    case .records(let incoming):
        var byId: [String: GymTransitionRecord] = [:]
        var order: [String] = []
        for record in records where byId[record.id] == nil {
            byId[record.id] = record
            order.append(record.id)
        }
        for record in incoming where record.atMs <= now && byId[record.id] == nil {
            byId[record.id] = record
            order.append(record.id)
        }
        records = order.compactMap { byId[$0] }
    case .coverageLost(let regionId):
        let ids: [String]
        if let regionId {
            ids = [regionId]
        } else {
            var set = Set(previous.regions.keys)
            for record in records { set.insert(record.regionId) }
            ids = set.sorted()
        }
        for id in ids { coverageLostAt[id] = current }
    case .tick:
        break
    }

    let derived = deriveGym(
        records: records,
        now: current,
        coverageLostAt: coverageLostAt,
        knownIntervals: previous.intervals
    )
    return GymDetectionState(
        version: 1,
        watermark: current,
        records: records,
        regions: derived.regions,
        intervals: derived.intervals,
        coverageLostAt: coverageLostAt
    )
}

private struct GymDerivedState {
    var regions: [String: GymRegionState]
    var intervals: [GymInterval]
}

private func gymTransitionRank(_ type: GymTransitionType) -> Int {
    type == .enter ? 0 : 1
}

private func deriveGym(
    records: [GymTransitionRecord],
    now: Int64,
    coverageLostAt: [String: Int64],
    knownIntervals: [GymInterval]
) -> GymDerivedState {
    var regions: [String: GymRegionState] = [:]
    var intervals: [GymInterval] = []
    let sorted = records.sorted { lhs, rhs in
        if lhs.atMs != rhs.atMs { return lhs.atMs < rhs.atMs }
        if gymTransitionRank(lhs.type) != gymTransitionRank(rhs.type) {
            return gymTransitionRank(lhs.type) < gymTransitionRank(rhs.type)
        }
        return lhs.id < rhs.id
    }

    for record in sorted {
        applyCoverageDue(
            regions: &regions,
            intervals: &intervals,
            coverageLostAt: coverageLostAt,
            knownIntervals: knownIntervals,
            at: record.atMs
        )
        confirmGymDue(regions: &regions, intervals: &intervals, at: record.atMs)
        var region = regions[record.regionId] ?? GymRegionState(pendingEnterAt: nil, confirmedSince: nil, lastEventAt: nil)
        if record.type == .enter {
            if region.confirmedSince == nil && region.pendingEnterAt == nil { region.pendingEnterAt = record.atMs }
        } else {
            if let confirmedSince = region.confirmedSince {
                if let index = intervals.lastIndex(where: { $0.regionId == record.regionId && $0.exitedAt == nil }) {
                    intervals[index].exitedAt = max(confirmedSince, record.atMs)
                }
            }
            region.pendingEnterAt = nil
            region.confirmedSince = nil
        }
        region.lastEventAt = max(region.lastEventAt ?? record.atMs, record.atMs)
        regions[record.regionId] = region
    }

    applyCoverageDue(regions: &regions, intervals: &intervals, coverageLostAt: coverageLostAt, knownIntervals: knownIntervals, at: now)
    confirmGymDue(regions: &regions, intervals: &intervals, at: now)
    return GymDerivedState(regions: regions, intervals: intervals)
}

private func applyCoverageDue(
    regions: inout [String: GymRegionState],
    intervals: inout [GymInterval],
    coverageLostAt: [String: Int64],
    knownIntervals: [GymInterval],
    at: Int64
) {
    for regionId in coverageLostAt.keys.sorted() {
        guard let lostAt = coverageLostAt[regionId] else { continue }
        if lostAt > at { continue }
        guard var region = regions[regionId] else { continue }
        if (region.lastEventAt ?? Int64.min) > lostAt { continue }
        if let index = intervals.lastIndex(where: { $0.regionId == regionId && $0.exitedAt == nil }) {
            intervals[index].exitedAt = max(intervals[index].confirmedAt, lostAt)
        } else if let known = knownIntervals.last(where: { $0.regionId == regionId && $0.exitedAt == nil }) {
            if !intervals.contains(where: { $0.id == known.id }) {
                var closed = known
                closed.exitedAt = max(known.confirmedAt, lostAt)
                intervals.append(closed)
            }
        }
        region.pendingEnterAt = nil
        region.confirmedSince = nil
        regions[regionId] = region
    }
}

private func confirmGymDue(regions: inout [String: GymRegionState], intervals: inout [GymInterval], at: Int64) {
    for regionId in regions.keys.sorted() {
        guard var region = regions[regionId] else { continue }
        guard let pendingEnterAt = region.pendingEnterAt else { continue }
        if at >= pendingEnterAt + gymConfirmMs {
            let confirmedAt = pendingEnterAt + gymConfirmMs
            region.confirmedSince = confirmedAt
            intervals.append(
                GymInterval(
                    id: "\(regionId):\(pendingEnterAt)",
                    regionId: regionId,
                    enteredAt: pendingEnterAt,
                    confirmedAt: confirmedAt,
                    exitedAt: nil
                )
            )
            region.pendingEnterAt = nil
            regions[regionId] = region
        }
    }
}

func confirmedGymRegions(_ state: GymDetectionState) -> [String] {
    state.regions.filter { $0.value.confirmedSince != nil }.map(\.key).sorted()
}

func gymDwellMs(_ state: GymDetectionState, regionId: String, now: Int64) -> Int64 {
    state.intervals
        .filter { $0.regionId == regionId }
        .reduce(0) { $0 + max(0, ($1.exitedAt ?? now) - $1.confirmedAt) }
}

func validateGymState(_ state: GymDetectionState) throws {
    guard state.version == 1, state.watermark >= 0 else { throw GymStateError.invalidState }
    guard state.records.allSatisfy({ !$0.id.isEmpty && !$0.regionId.isEmpty }) else { throw GymStateError.invalidState }
}

// MARK: - Geometry mirror

/// Port of `app-next/src/packages/activity/lib/location/regionPresence.ts`, including
/// its single earth radius constant, so `sampled_presence` and the production
/// distance test cannot drift.
enum GymGeometry {
    static let earthRadiusMeters = 6_371_000.0

    static func distanceMetres(latitude: Double, longitude: Double, toLatitude: Double, toLongitude: Double) -> Double {
        let latitudeDelta = radians(toLatitude - latitude)
        let longitudeDelta = radians(toLongitude - longitude)
        let startLatitude = radians(latitude)
        let endLatitude = radians(toLatitude)
        let haversine =
            pow(sin(latitudeDelta / 2), 2) +
            cos(startLatitude) * cos(endLatitude) * pow(sin(longitudeDelta / 2), 2)
        return 2 * earthRadiusMeters * atan2(sqrt(haversine), sqrt(1 - haversine))
    }

    static func isInside(latitude: Double, longitude: Double, regionLatitude: Double, regionLongitude: Double, radiusMeters: Double) -> Bool {
        distanceMetres(latitude: latitude, longitude: longitude, toLatitude: regionLatitude, toLongitude: regionLongitude) <= radiusMeters
    }

    /// `inside_certain` when distance + accuracy is still inside, `outside_certain`
    /// when distance − accuracy is still outside, `ambiguous` otherwise. This is a
    /// reporting band only: the production model has no such test.
    static func accuracyBand(distanceMeters: Double, accuracyMeters: Double?, radiusMeters: Double) -> String {
        guard let accuracyMeters, accuracyMeters >= 0 else { return "ambiguous" }
        if distanceMeters + accuracyMeters <= radiusMeters { return "inside_certain" }
        if distanceMeters - accuracyMeters > radiusMeters { return "outside_certain" }
        return "ambiguous"
    }

    private static func radians(_ degrees: Double) -> Double { degrees * .pi / 180 }
}

// MARK: - The decision stream

struct GymDecision {
    let atWallTimeMs: Int64
    let gymId: String
    let transition: String
    let pendingEnterAtWallMs: Int64?
    let confirmedSinceWallMs: Int64?
    let intervalId: String?
    let intervalEnteredAt: Int64?
    let intervalConfirmedAt: Int64?
    let intervalExitedAt: Int64?
    let latencyFromRegionEventMs: Int64?
    let trigger: String

    var dictionary: [String: Any] {
        [
            "gymId": gymId,
            "transition": transition,
            "pendingEnterAtWallMs": jsonOrNull(pendingEnterAtWallMs),
            "confirmedSinceWallMs": jsonOrNull(confirmedSinceWallMs),
            "intervalId": jsonOrNull(intervalId),
            "intervalEnteredAt": jsonOrNull(intervalEnteredAt),
            "intervalConfirmedAt": jsonOrNull(intervalConfirmedAt),
            "intervalExitedAt": jsonOrNull(intervalExitedAt),
            "latencyFromRegionEventMs": jsonOrNull(latencyFromRegionEventMs),
            "trigger": trigger
        ]
    }
}

/// Drives the port exactly as the controller does: one region event, one
/// coverage loss or one tick at a time, emitting one decision per change.
final class ProductionGymDetector {
    private(set) var state: GymDetectionState
    /// Wall-clock ms of the most recent enter receipt per region, so a
    /// confirmation can report its latency from the event it followed.
    private var lastEnterWallMs: [String: Int64] = [:]

    init(startWallTimeMs: Int64) {
        state = (try? GymDetectionState.create(now: startWallTimeMs))
            ?? GymDetectionState(version: 1, watermark: startWallTimeMs, records: [], regions: [:], intervals: [], coverageLostAt: [:])
    }

    func receiveRegionEvent(gymId: String, type: GymTransitionType, atWallTimeMs: Int64) -> [GymDecision] {
        if type == .enter { lastEnterWallMs[gymId] = atWallTimeMs }
        let record = GymTransitionRecord.regionEvent(gymId: gymId, type: type, atMs: atWallTimeMs)
        return apply(.records([record]), at: atWallTimeMs, trigger: type == .enter ? "enter_region" : "exit_region")
    }

    func coverageLost(gymId: String?, atWallTimeMs: Int64) -> [GymDecision] {
        apply(.coverageLost(regionId: gymId), at: atWallTimeMs, trigger: "coverage_lost")
    }

    func tick(nowWallTimeMs: Int64) -> [GymDecision] {
        apply(.tick, at: nowWallTimeMs, trigger: "tick")
    }

    func intervalSummaries() -> [GymIntervalSummary] {
        state.intervals.map {
            GymIntervalSummary(
                id: $0.id,
                regionId: $0.regionId,
                enteredAtWallTimeMs: $0.enteredAt,
                confirmedAtWallTimeMs: $0.confirmedAt,
                exitedAtWallTimeMs: $0.exitedAt
            )
        }
    }

    func trajectoryStep(atWallTimeMs: Int64, trigger: String) -> [String: Any] {
        [
            "atMs": atWallTimeMs,
            "trigger": trigger,
            "regions": GymCanonical.regions(state.regions),
            "intervals": GymCanonical.intervals(state.intervals)
        ]
    }

    private func apply(_ event: GymEvent, at wallTimeMs: Int64, trigger: String) -> [GymDecision] {
        let beforeRegions = state.regions
        let beforeIntervals = state.intervals
        state = (try? reduceGym(state, event: event, now: wallTimeMs)) ?? state
        return decisionsFor(
            beforeRegions: beforeRegions,
            beforeIntervals: beforeIntervals,
            after: state,
            event: event,
            at: wallTimeMs,
            trigger: trigger
        )
    }

    private func decisionsFor(
        beforeRegions: [String: GymRegionState],
        beforeIntervals: [GymInterval],
        after: GymDetectionState,
        event: GymEvent,
        at: Int64,
        trigger: String
    ) -> [GymDecision] {
        let ids = Set(beforeRegions.keys).union(after.regions.keys).sorted()
        var decisions: [GymDecision] = []
        for gymId in ids {
            let before = beforeRegions[gymId]
            guard let now = after.regions[gymId] else { continue }
            let hadPresence = (before?.pendingEnterAt) != nil || (before?.confirmedSince) != nil
            let hasPresence = now.pendingEnterAt != nil || now.confirmedSince != nil
            var transition: String?
            if case .coverageLost = event, hadPresence, !hasPresence {
                transition = "coverage_lost"
            } else if before?.confirmedSince == nil, let confirmed = now.confirmedSince {
                _ = confirmed
                transition = "confirm_due"
            } else if before?.pendingEnterAt == nil, now.pendingEnterAt != nil {
                transition = "enter_received"
            } else if hadPresence, now.pendingEnterAt == nil, now.confirmedSince == nil {
                transition = "exit_received"
            }
            guard let transition else { continue }
            // The interval this decision concerns: for a confirmation, the one
            // that just opened; otherwise the newest interval for the region,
            // but only when this step is what changed it.
            let interval: GymInterval?
            switch transition {
            case "enter_received":
                interval = nil
            case "confirm_due":
                interval = after.intervals.last { $0.regionId == gymId && $0.confirmedAt == now.confirmedSince }
            default:
                let newest = after.intervals.last { $0.regionId == gymId }
                let unchanged = newest.map { candidate in
                    beforeIntervals.contains { $0.id == candidate.id && $0.exitedAt == candidate.exitedAt }
                } ?? true
                interval = unchanged ? nil : newest
            }
            var latency: Int64?
            if transition == "confirm_due" || transition == "enter_received", let enterAt = lastEnterWallMs[gymId] {
                latency = at - enterAt
            }
            decisions.append(
                GymDecision(
                    atWallTimeMs: at,
                    gymId: gymId,
                    transition: transition,
                    pendingEnterAtWallMs: now.pendingEnterAt,
                    confirmedSinceWallMs: now.confirmedSince,
                    intervalId: interval?.id,
                    intervalEnteredAt: interval?.enteredAt,
                    intervalConfirmedAt: interval?.confirmedAt,
                    intervalExitedAt: interval?.exitedAt,
                    latencyFromRegionEventMs: latency,
                    trigger: trigger
                )
            )
        }
        return decisions
    }
}

// MARK: - Canonical dictionaries shared with the parity replay

enum GymCanonical {
    static func regions(_ regions: [String: GymRegionState]) -> [String: Any] {
        var output: [String: Any] = [:]
        for regionId in regions.keys.sorted() {
            guard let region = regions[regionId] else { continue }
            output[regionId] = [
                "pendingEnterAt": jsonOrNull(region.pendingEnterAt),
                "confirmedSince": jsonOrNull(region.confirmedSince),
                "lastEventAt": jsonOrNull(region.lastEventAt)
            ] as [String: Any]
        }
        return output
    }

    static func intervals(_ intervals: [GymInterval]) -> [[String: Any]] {
        intervals.map { interval -> [String: Any] in
            [
                "id": interval.id,
                "regionId": interval.regionId,
                "enteredAt": interval.enteredAt,
                "confirmedAt": interval.confirmedAt,
                "exitedAt": jsonOrNull(interval.exitedAt)
            ]
        }
    }

    static func json(_ value: Any) -> String {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys, .withoutEscapingSlashes])
        else { return "{}" }
        return String(decoding: data, as: UTF8.self)
    }
}

/// The Swift half of `scripts/verify-production-parity.ts`: replays one fixture
/// with the same 1 s tick and the same trajectory capture, so the two outputs
/// can be compared byte for byte.
enum GymFixtureReplay {
    static let tickMs: Int64 = 1_000
    static let tailMs: Int64 = 65_000

    struct TimelineEvent: Decodable {
        let atMs: Int64
        let event: String
        let payload: Payload

        struct Payload: Decodable {
            let regionId: String?
        }
    }

    struct Fixture: Decodable {
        let name: String
        let version: Int
        let timeline: [TimelineEvent]
    }

    static func replay(_ fixture: Fixture) -> [String: Any] {
        let detector = ProductionGymDetector(startWallTimeMs: 0)
        var steps: [[String: Any]] = []
        var transitions: [[String: Any]] = []
        var recordCount = 0
        var tickCursor: Int64 = 0

        func capture(at: Int64, trigger: String, decisions: [GymDecision], before: String) {
            for decision in decisions {
                transitions.append([
                    "atMs": decision.atWallTimeMs,
                    "regionId": decision.gymId,
                    "transition": decision.transition
                ])
            }
            let after = GymCanonical.json(
                GymCanonical.jsonObject(
                    regions: detector.state.regions,
                    intervals: detector.state.intervals
                )
            )
            if after != before {
                steps.append(detector.trajectoryStep(atWallTimeMs: at, trigger: trigger))
            }
        }

        func stateDigest() -> String {
            GymCanonical.json(GymCanonical.jsonObject(regions: detector.state.regions, intervals: detector.state.intervals))
        }

        let lastAt = fixture.timeline.map(\.atMs).max() ?? 0
        for entry in fixture.timeline {
            while tickCursor + tickMs <= entry.atMs {
                tickCursor += tickMs
                let before = stateDigest()
                let decisions = detector.tick(nowWallTimeMs: tickCursor)
                capture(at: tickCursor, trigger: "tick", decisions: decisions, before: before)
            }
            let at = max(entry.atMs, detector.state.watermark)
            let before = stateDigest()
            switch entry.event {
            case "location.enterRegion", "location.exitRegion":
                guard let regionId = entry.payload.regionId else { continue }
                let type: GymTransitionType = entry.event == "location.enterRegion" ? .enter : .exit
                recordCount += 1
                let decisions = detector.receiveRegionEvent(gymId: regionId, type: type, atWallTimeMs: at)
                capture(at: at, trigger: type == .enter ? "enter_region" : "exit_region", decisions: decisions, before: before)
            case "location.coverageLost":
                let decisions = detector.coverageLost(gymId: entry.payload.regionId, atWallTimeMs: at)
                capture(at: at, trigger: "coverage_lost", decisions: decisions, before: before)
            default:
                break
            }
        }
        while tickCursor + tickMs <= lastAt + tailMs {
            tickCursor += tickMs
            let before = stateDigest()
            let decisions = detector.tick(nowWallTimeMs: tickCursor)
            capture(at: tickCursor, trigger: "tick", decisions: decisions, before: before)
        }

        return [
            "fixture": fixture.name,
            "tickMs": tickMs,
            "tailMs": tailMs,
            "watermark": detector.state.watermark,
            "recordCount": recordCount,
            "regions": GymCanonical.regions(detector.state.regions),
            "intervals": GymCanonical.intervals(detector.state.intervals),
            "transitions": transitions,
            "steps": steps
        ]
    }
}

extension GymCanonical {
    static func jsonObject(regions: [String: GymRegionState], intervals: [GymInterval]) -> [String: Any] {
        ["regions": GymCanonical.regions(regions), "intervals": GymCanonical.intervals(intervals)]
    }
}
