import XCTest
@testable import PhoneGymRecorder

/// `EXPECTED.json` is the single source both this app and `validate.py` read.
/// These tests are the contract that keeps it a real catalogue of the 25
/// design scenarios rather than a file that happens to parse.
final class ScenarioCatalogTests: XCTestCase {
    private func table() throws -> GymExpectedTable {
        let bundle = Bundle(for: Self.self)
        let url = try XCTUnwrap(
            bundle.url(forResource: "EXPECTED", withExtension: "json"),
            "EXPECTED.json must be in the test bundle"
        )
        return try GymExpectedTable.load(from: Data(contentsOf: url))
    }

    func testEveryDesignScenarioIsPresentExactlyOnce() throws {
        let table = try table()
        let ids = table.scenarios.map(\.id)
        let designed = (1...25).map { String(format: "S%02d", $0) }
        XCTAssertEqual(ids, designed, "the catalogue must carry S01…S25 in order")
        XCTAssertEqual(Set(ids).count, ids.count, "a scenario id must not repeat")
    }

    func testRequiredLabelsAreNonEmptyForEveryScoredScenarioOnly() throws {
        let table = try table()
        for scenario in table.scenarios {
            if scenario.isSetupOnly || scenario.isDescriptive {
                XCTAssertTrue(
                    scenario.requiredLabels.isEmpty,
                    "\(scenario.id) is \(scenario.mode) and must not require labels"
                )
            } else {
                XCTAssertFalse(
                    scenario.requiredLabels.isEmpty,
                    "\(scenario.id) is scored but requires no label, so nothing can be judged"
                )
            }
            XCTAssertTrue(
                scenario.steps.contains { $0.expectsPlaceTap } || scenario.requiredAcks.isEmpty,
                "\(scenario.id) declares acks that no step expects"
            )
        }
    }

    func testScriptedStepsUseRealPlacesAndEveryRequiredAckIsReachable() throws {
        let table = try table()
        var stepIds: Set<String> = []
        for scenario in table.scenarios {
            for step in scenario.steps {
                XCTAssertTrue(stepIds.insert(step.id).inserted, "step id \(step.id) repeats")
                XCTAssertFalse(step.text.isEmpty, "\(step.id) has no script text")
                switch step.kind {
                case "place":
                    XCTAssertNotNil(step.place, "\(step.id) is a place step with no place")
                case "ack":
                    // An ack step without an ack key is a plain Done step: the
                    // operator confirms an action the recorder cannot see.
                    break
                default:
                    XCTFail("\(step.id) has an unknown step kind \(step.kind)")
                }
            }
            // Every action a scenario declares as required must be reachable
            // from its own script, or the strip can never ask for it.
            let declared = Set(scenario.steps.compactMap(\.ack))
            for required in scenario.requiredAcks {
                XCTAssertTrue(
                    declared.contains(required),
                    "\(scenario.id) requires the \(required) action but no step declares it"
                )
            }
        }
    }

    func testScenarioModesMatchTheDesign() throws {
        let table = try table()
        XCTAssertEqual(table.scenario(id: "S01")?.mode, "setup")
        XCTAssertEqual(table.scenario(id: "S25")?.mode, "descriptive")
        for id in ["S13", "S20", "S24"] {
            XCTAssertEqual(table.scenario(id: id)?.mode, "finding", "\(id) is a finding in the design")
        }
        for scenario in table.scenarios {
            XCTAssertTrue(
                ["setup", "scored", "finding", "descriptive"].contains(scenario.mode),
                "\(scenario.id) has an unknown mode \(scenario.mode)"
            )
        }
    }

    func testThresholdsMatchTheProductionConstantsTheyMirror() throws {
        let table = try table()
        let thresholds = table.thresholds
        XCTAssertEqual(Int64(thresholds.confirmMs), gymConfirmMs, "the 30 s confirmation must be the reducer's own constant")
        XCTAssertEqual(thresholds.radiusMinMeters, gymRadiusMinimumMeters)
        XCTAssertEqual(thresholds.radiusMaxMeters, gymRadiusMaximumMeters)
        XCTAssertEqual(thresholds.radiusStepMeters, gymRadiusStepMeters)
        XCTAssertEqual(thresholds.radiusDefaultMeters, gymRadiusDefaultMeters)
        XCTAssertEqual(thresholds.maxGyms, maximumGyms)
        XCTAssertEqual(Int64(thresholds.minimumFreeBytesToStart), minimumFreeBytesToStart)
        XCTAssertEqual(thresholds.confidenceToleranceSeconds, 15, "the shared human-tap tolerance")
        XCTAssertGreaterThan(thresholds.falseNegativeMinimumInGymSeconds, 0)
        XCTAssertGreaterThan(thresholds.exitNeverDeliveredMinutes, 0)
        XCTAssertGreaterThanOrEqual(thresholds.minimumOscillationBoundaries, 4)
        XCTAssertTrue((0...1).contains(thresholds.coveragePartialFloorRatio))
    }

    func testEveryPlaceLabelAndCannotJudgeTriggerIsKnown() throws {
        let table = try table()
        XCTAssertEqual(Set(table.places), Set(GymPlaceLabel.allCases), "the catalogue must enumerate the five place labels")
        // The codes validate.py can print, plus the phrase the design uses for a
        // scenario whose judgement needs an operator note.
        let knownCodes = Set([
            "no_location_coverage", "region_monitoring_failed", "reduced_accuracy",
            "no_excerlock_declaration", "no_observation_in_window", "session_ended_open_window",
            "backdated_only", "descriptive_only", "partial_coverage"
        ])
        let knownPhrases = Set(["note missing"])
        for scenario in table.scenarios {
            for trigger in scenario.cannotBeJudged {
                if let colon = trigger.firstIndex(of: ":") {
                    let code = String(trigger[..<colon])
                    let value = String(trigger[trigger.index(after: colon)...])
                    XCTAssertTrue(
                        ["missing_label", "partial_coverage"].contains(code),
                        "\(scenario.id) declares an unknown trigger code \(trigger)"
                    )
                    XCTAssertFalse(value.isEmpty, "\(scenario.id) declares \(trigger) with no value")
                } else {
                    XCTAssertTrue(
                        knownCodes.contains(trigger) || knownPhrases.contains(trigger),
                        "\(scenario.id) declares an unknown cannot-be-judged trigger \(trigger)"
                    )
                }
            }
        }
    }

    func testCatalogLoadsFromTheAppBundleTheSameWayTheRecorderDoes() throws {
        let catalog = ScenarioCatalog(bundle: Bundle(for: Self.self))
        XCTAssertNil(catalog.loadError, "the app bundle carries EXPECTED.json: \(catalog.loadError ?? "")")
        XCTAssertEqual(catalog.scenarios.count, 25)
        XCTAssertEqual(catalog.steps(for: "S02").count, 3)
        XCTAssertEqual(catalog.steps(for: "S02").first?.place, .away)
        XCTAssertTrue(catalog.steps(for: "no-such-scenario").isEmpty)
        XCTAssertTrue(catalog.steps(for: nil).isEmpty)
        XCTAssertNil(catalog.scenario(id: nil))
    }
}
