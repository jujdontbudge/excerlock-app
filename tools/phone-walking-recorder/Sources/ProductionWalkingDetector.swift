import Foundation

struct ProductionActivitySample: Equatable {
    let classes: [String]
    let confidence: String
    let startedAtMs: Int64
    let receivedAtMs: Int64
}

struct ProductionCadenceSample: Equatable {
    let stepsPerSecond: Double?
    let cumulativeSteps: Int
    let asOfMs: Int64
}

enum ProductionQualification: Equatable {
    case qualifying
    case notQualifying
    case unknown

    var jsonValue: Any {
        switch self {
        case .qualifying: return true
        case .notQualifying: return false
        case .unknown: return "unknown"
        }
    }

    var isPositive: Bool { self == .qualifying }
}

struct ProductionMotionEvidence: Equatable {
    let qualifying: ProductionQualification
    let observedAtMs: Int64
    let activityAtMs: Int64?
    let cadenceAtMs: Int64?
    let cadencePerMinute: Double?

    var dictionary: [String: Any] {
        [
            "qualifying": qualifying.jsonValue,
            "observedAtMonotonicMs": observedAtMs,
            "activityAtMonotonicMs": activityAtMs ?? NSNull(),
            "cadenceAtMonotonicMs": cadenceAtMs ?? NSNull(),
            "cadencePerMinute": cadencePerMinute ?? NSNull(),
            "policy": [
                "fusion": "fresh medium/high walking or running activity OR fresh cadence >= 80 steps/min",
                "freshnessMs": productionMotionFreshnessMs,
                "minimumCadencePerMinute": productionMinimumWalkingCadencePerMinute
            ]
        ]
    }
}

struct ProductionMotionAdapterPort {
    private(set) var activity: ProductionActivitySample?
    private(set) var cadence: ProductionCadenceSample?

    mutating func acceptActivity(_ sample: ProductionActivitySample, nowMs: Int64) -> ProductionMotionEvidence? {
        guard sample.receivedAtMs >= sample.startedAtMs, sample.receivedAtMs <= nowMs else { return nil }
        if let activity, sample.receivedAtMs <= activity.receivedAtMs { return nil }
        activity = sample
        return reconcile(atMs: max(sample.receivedAtMs, nowMs))
    }

    mutating func acceptCadence(_ sample: ProductionCadenceSample, nowMs: Int64) -> ProductionMotionEvidence? {
        guard sample.asOfMs <= nowMs else { return nil }
        if let cadence = sample.stepsPerSecond, !cadence.isFinite || cadence < 0 { return nil }
        if let previousCadence = cadence, sample.asOfMs <= previousCadence.asOfMs { return nil }
        cadence = sample
        return reconcile(atMs: max(sample.asOfMs, nowMs))
    }

    func reconcile(atMs: Int64) -> ProductionMotionEvidence {
        let activityAge = activity.map { atMs - $0.receivedAtMs } ?? Int64.max
        let cadenceAge = cadence.map { atMs - $0.asOfMs } ?? Int64.max
        let activityFresh = activityAge >= 0 && activityAge < productionMotionFreshnessMs
        let cadenceFresh = cadenceAge >= 0 && cadenceAge < productionMotionFreshnessMs
        let activityQualifies = activityFresh
            && (activity?.confidence == "medium" || activity?.confidence == "high")
            && (activity?.classes.contains("walking") == true || activity?.classes.contains("running") == true)
        let cadencePerMinute: Double? = cadenceFresh ? cadence?.stepsPerSecond.map { $0 * 60 } : nil
        let cadenceQualifies = cadencePerMinute.map { $0 >= productionMinimumWalkingCadencePerMinute } ?? false
        let activityAt = activityFresh ? activity?.receivedAtMs : nil
        let cadenceAt = cadenceFresh ? cadence?.asOfMs : nil
        let supported = activityFresh || cadenceFresh
        let observedAt: Int64
        if supported {
            observedAt = max(activityAt ?? Int64.min, cadenceAt ?? Int64.min)
        } else {
            observedAt = atMs
        }
        return ProductionMotionEvidence(
            qualifying: supported ? (activityQualifies || cadenceQualifies ? .qualifying : .notQualifying) : .unknown,
            observedAtMs: observedAt,
            activityAtMs: activityAt,
            cadenceAtMs: cadenceAt,
            cadencePerMinute: cadencePerMinute
        )
    }
}

enum WalkingPhase: String, Codable {
    case inactive
    case verifying
    case active
    case grace
}

struct ProductionWalkingState: Codable, Equatable {
    let version: Int
    var phase: WalkingPhase
    var watermarkMs: Int64
    var qualifyingSinceMs: Int64?
    var activeSinceMs: Int64?
    var lastEvidenceAtMs: Int64?
    var lastQualifying: Bool?
    var graceEndsAtMs: Int64?

    init(nowMs: Int64) {
        version = 1
        phase = .inactive
        watermarkMs = nowMs
        qualifyingSinceMs = nil
        activeSinceMs = nil
        lastEvidenceAtMs = nil
        lastQualifying = nil
        graceEndsAtMs = nil
    }

    var reliefActive: Bool { phase == .active || phase == .grace }

    var dictionary: [String: Any] {
        [
            "version": version,
            "phase": phase.rawValue,
            "watermarkMonotonicMs": watermarkMs,
            "qualifyingSinceMonotonicMs": qualifyingSinceMs ?? NSNull(),
            "activeSinceMonotonicMs": activeSinceMs ?? NSNull(),
            "lastEvidenceAtMonotonicMs": lastEvidenceAtMs ?? NSNull(),
            "lastQualifying": lastQualifying ?? NSNull(),
            "graceEndsAtMonotonicMs": graceEndsAtMs ?? NSNull(),
            "reliefIntendedByReducer": reliefActive,
            "actualOSShieldObserved": NSNull(),
            "actualOSShieldInstrumented": false,
            "qualificationMs": productionWalkQualificationMs,
            "silenceMs": productionWalkSilenceMs,
            "graceMs": productionWalkingGraceMs
        ]
    }

    mutating func reduceEvidence(atMs: Int64, qualification: ProductionQualification, nowMs: Int64, graceMs: Int64 = productionWalkingGraceMs) {
        let previousWatermark = watermarkMs
        let previousLastEvidence = lastEvidenceAtMs
        let previousLastQualifying = lastQualifying
        let current = max(nowMs, previousWatermark)
        let positive = qualification.isPositive
        let fresh = atMs >= previousWatermark
            && (previousLastEvidence == nil
                || atMs > previousLastEvidence!
                || (atMs == previousLastEvidence! && previousLastQualifying == true && !positive))
        if fresh {
            advance(toMs: atMs, graceMs: graceMs)
            lastEvidenceAtMs = atMs
            lastQualifying = positive
            if positive {
                if phase == .inactive {
                    phase = .verifying
                    qualifyingSinceMs = atMs
                } else if phase == .grace {
                    phase = .active
                    qualifyingSinceMs = atMs
                    graceEndsAtMs = nil
                }
            } else if phase == .verifying {
                deactivate()
            } else if phase == .active {
                phase = .grace
                qualifyingSinceMs = nil
                graceEndsAtMs = atMs + graceMs
            }
        }
        advance(toMs: current, graceMs: graceMs)
    }

    mutating func tick(nowMs: Int64, graceMs: Int64 = productionWalkingGraceMs) {
        advance(toMs: max(nowMs, watermarkMs), graceMs: graceMs)
    }

    private mutating func deactivate() {
        phase = .inactive
        qualifyingSinceMs = nil
        activeSinceMs = nil
        graceEndsAtMs = nil
    }

    private mutating func advance(toMs nowMs: Int64, graceMs: Int64) {
        if (phase == .verifying || phase == .active), let lastEvidenceAtMs,
           nowMs >= lastEvidenceAtMs + productionWalkSilenceMs {
            if phase == .verifying {
                deactivate()
            } else {
                phase = .grace
                qualifyingSinceMs = nil
                graceEndsAtMs = lastEvidenceAtMs + productionWalkSilenceMs + graceMs
            }
        }
        if phase == .grace, let graceEndsAtMs, nowMs >= graceEndsAtMs {
            deactivate()
        }
        if phase == .verifying, let qualifyingSinceMs,
           nowMs >= qualifyingSinceMs + productionWalkQualificationMs {
            phase = .active
            activeSinceMs = qualifyingSinceMs + productionWalkQualificationMs
        }
        watermarkMs = max(watermarkMs, nowMs)
    }
}

struct ProductionDetectorSnapshot {
    let trigger: String
    let evidence: ProductionMotionEvidence
    let state: ProductionWalkingState

    var dictionary: [String: Any] {
        ["trigger": trigger, "evidence": evidence.dictionary, "walkingState": state.dictionary]
    }
}

struct ProductionWalkingDetectorPort {
    private(set) var adapter = ProductionMotionAdapterPort()
    private(set) var state: ProductionWalkingState

    init(startMonotonicMs: Int64) {
        state = ProductionWalkingState(nowMs: startMonotonicMs)
    }

    mutating func acceptActivity(_ sample: ProductionActivitySample, nowMs: Int64) -> ProductionDetectorSnapshot? {
        guard let evidence = adapter.acceptActivity(sample, nowMs: nowMs) else { return nil }
        state.reduceEvidence(atMs: evidence.observedAtMs, qualification: evidence.qualifying, nowMs: evidence.observedAtMs)
        return ProductionDetectorSnapshot(trigger: "activity_callback", evidence: evidence, state: state)
    }

    mutating func acceptCadence(_ sample: ProductionCadenceSample, nowMs: Int64) -> ProductionDetectorSnapshot? {
        guard let evidence = adapter.acceptCadence(sample, nowMs: nowMs) else { return nil }
        state.reduceEvidence(atMs: evidence.observedAtMs, qualification: evidence.qualifying, nowMs: evidence.observedAtMs)
        return ProductionDetectorSnapshot(trigger: "cadence_callback", evidence: evidence, state: state)
    }

    mutating func tick(nowMs: Int64) -> ProductionDetectorSnapshot {
        let evidence = adapter.reconcile(atMs: nowMs)
        state.reduceEvidence(atMs: evidence.observedAtMs, qualification: evidence.qualifying, nowMs: nowMs)
        state.tick(nowMs: nowMs)
        return ProductionDetectorSnapshot(trigger: "foreground_1s_tick", evidence: evidence, state: state)
    }
}
