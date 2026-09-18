import XCTest
@testable import PhoneGymRecorder

/// The port is only allowed to differ from the production reducer by being a
/// Swift file. These tests replay the shared fixtures through
/// `GymFixtureReplay` and compare the result byte for byte with the files
/// `scripts/verify-production-parity.ts` wrote from the real
/// `app-next/src/domain/gymMachine.ts`.
final class ProductionGymDetectorTests: XCTestCase {
    private func fixtureNames() -> [String] {
        ["gym-enter-exit", "region-blip", "quiet", "gym-oscillation", "gym-passby", "gym-coverage-lost"]
    }

    private func url(_ name: String, _ ext: String) throws -> URL {
        try XCTUnwrap(
            Bundle(for: Self.self).url(forResource: name, withExtension: ext),
            "missing fixture \(name).\(ext) from the test bundle"
        )
    }

    func testFixtureParityIsByteEqualWithTheProductionReducer() throws {
        for name in fixtureNames() {
            let fixture = try JSONDecoder().decode(GymFixtureReplay.Fixture.self, from: Data(contentsOf: try url(name, "json")))
            let produced = GymCanonical.json(GymFixtureReplay.replay(fixture))
            let expected = try String(contentsOf: try url("expected-\(name)", "json"), encoding: .utf8)
                .trimmingCharacters(in: .whitespacesAndNewlines)
            XCTAssertEqual(produced, expected, "port diverged from the production reducer on \(name)")
        }
    }

    func testBlipNeverConfirmsAndOscillationResetsPending() throws {
        let blip = try JSONDecoder().decode(GymFixtureReplay.Fixture.self, from: Data(contentsOf: try url("region-blip", "json")))
        let blipResult = GymFixtureReplay.replay(blip)
        XCTAssertEqual((blipResult["intervals"] as? [[String: Any]])?.count, 0)

        let oscillation = try JSONDecoder().decode(GymFixtureReplay.Fixture.self, from: Data(contentsOf: try url("gym-oscillation", "json")))
        let result = GymFixtureReplay.replay(oscillation)
        let transitions = (result["transitions"] as? [[String: Any]])?.compactMap { $0["transition"] as? String } ?? []
        XCTAssertEqual(
            transitions,
            [
                "enter_received", "confirm_due", "exit_received",
                "enter_received", "confirm_due", "exit_received",
                "enter_received", "confirm_due", "exit_received",
            ]
        )
    }

    func testEnterConfirmsOnlyOnALaterTickAfterTenSeconds() throws {
        var state = try createGymState(now: 0)
        state = try reduceGym(state, event: .records([GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 1_000)]), now: 1_000)
        XCTAssertEqual(confirmedGymRegions(state), [])
        state = try reduceGym(state, event: .tick, now: 10_999)
        XCTAssertEqual(confirmedGymRegions(state), [])
        state = try reduceGym(state, event: .tick, now: 11_000)
        XCTAssertEqual(confirmedGymRegions(state), ["a"])
        XCTAssertEqual(state.intervals.first?.confirmedAt, 11_000)
    }

    func testExitBeforeConfirmationPreventsPresenceAndExitAfterIsImmediate() throws {
        var state = try createGymState(now: 0)
        state = try reduceGym(state, event: .records([
            GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 1_000),
            GymTransitionRecord.regionEvent(gymId: "a", type: .exit, atMs: 10_000),
        ]), now: 10_000)
        state = try reduceGym(state, event: .tick, now: 40_000)
        XCTAssertEqual(confirmedGymRegions(state), [])

        var confirmed = try createGymState(now: 0)
        confirmed = try reduceGym(confirmed, event: .records([GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 1_000)]), now: 11_000)
        confirmed = try reduceGym(confirmed, event: .records([GymTransitionRecord.regionEvent(gymId: "a", type: .exit, atMs: 12_000)]), now: 12_000)
        XCTAssertEqual(confirmedGymRegions(confirmed), [])
        XCTAssertEqual(gymDwellMs(confirmed, regionId: "a", now: 99_999), 1_000)
    }

    func testDuplicatesOutOfOrderDeliveryAndOverlappingRegionsDoNotDoubleCredit() throws {
        let rows = [
            GymTransitionRecord.regionEvent(gymId: "b", type: .enter, atMs: 2_000),
            GymTransitionRecord.regionEvent(gymId: "a", type: .exit, atMs: 40_000),
            GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 1_000),
            GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 1_000),
        ]
        let once = try reduceGym(try createGymState(now: 0), event: .records(rows), now: 40_000)
        let twice = try reduceGym(once, event: .records(rows), now: 40_000)
        XCTAssertEqual(once, twice)
        XCTAssertEqual(confirmedGymRegions(once), ["b"])
        XCTAssertEqual(once.intervals.count, 2)
    }

    func testCoverageLossClosesTheOpenVisitAtMaxConfirmedAndLost() throws {
        var state = try createGymState(now: 0)
        state = try reduceGym(state, event: .records([GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 0)]), now: 30_000)
        state = try reduceGym(state, event: .coverageLost(regionId: nil), now: 60_000)
        XCTAssertEqual(confirmedGymRegions(state), [])
        XCTAssertEqual(state.intervals.first?.exitedAt, 60_000)
        XCTAssertEqual(gymDwellMs(state, regionId: "a", now: 99_999), 50_000)
        let ticked = try reduceGym(state, event: .tick, now: 90_000)
        XCTAssertEqual(confirmedGymRegions(ticked), [])
    }

    func testClockRewindCannotReplayAnOldEnterAfterCoverageLoss() throws {
        var expired = try createGymState(now: 10_000)
        expired = try reduceGym(expired, event: .coverageLost(regionId: "a"), now: 20_000)
        let replay = try reduceGym(expired, event: .records([GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 1_000)]), now: 5_000)
        XCTAssertEqual(replay.watermark, 20_000)
        XCTAssertEqual(confirmedGymRegions(replay), [])
    }

    func testPerRegionCoverageBoundaryClosesDwellAndCannotResurrectOnTick() throws {
        var state = try createGymState(now: 0)
        state = try reduceGym(state, event: .records([
            GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 0),
            GymTransitionRecord.regionEvent(gymId: "b", type: .enter, atMs: 0),
        ]), now: 30_000)
        state = try reduceGym(state, event: .coverageLost(regionId: "a"), now: 40_000)
        XCTAssertEqual(confirmedGymRegions(state), ["b"])
        XCTAssertEqual(gymDwellMs(state, regionId: "a", now: 100_000), 30_000)
        XCTAssertEqual(confirmedGymRegions(try reduceGym(state, event: .tick, now: 100_000)), ["b"])
    }

    func testExitDeterministicallyDominatesEnterAtTheSameTimestamp() throws {
        let state = try reduceGym(try createGymState(now: 0), event: .records([
            GymTransitionRecord.regionEvent(gymId: "a", type: .enter, atMs: 1_000),
            GymTransitionRecord.regionEvent(gymId: "a", type: .exit, atMs: 1_000),
        ]), now: 40_000)
        XCTAssertEqual(confirmedGymRegions(state), [])
    }

    func testPortRejectsAMalformedPersistedState() throws {
        let broken = GymDetectionState(version: 2, watermark: 0, records: [], regions: [:], intervals: [], coverageLostAt: [:])
        XCTAssertThrowsError(try reduceGym(broken, event: .tick, now: 1_000)) { error in
            XCTAssertEqual(error as? GymStateError, .invalidState)
        }
    }

    /// The distance function must be the production haversine, not an
    /// approximation: the sampled-distance presence depends on it.
    func testHaversineMatchesTheProductionRegionPresence() {
        // One degree of latitude at the equator is about 111.2 km with the same
        // 6 371 000 m earth radius.
        let oneDegree = GymGeometry.distanceMetres(latitude: 0, longitude: 0, toLatitude: 1, toLongitude: 0)
        XCTAssertEqual(oneDegree, 111_194.9, accuracy: 5)
        XCTAssertTrue(GymGeometry.isInside(latitude: 0, longitude: 0.0005, regionLatitude: 0, regionLongitude: 0, radiusMeters: 100))
        XCTAssertFalse(GymGeometry.isInside(latitude: 0, longitude: 0.0015, regionLatitude: 0, regionLongitude: 0, radiusMeters: 100))
        XCTAssertEqual(GymGeometry.accuracyBand(distanceMeters: 40, accuracyMeters: 10, radiusMeters: 100), "inside_certain")
        XCTAssertEqual(GymGeometry.accuracyBand(distanceMeters: 160, accuracyMeters: 10, radiusMeters: 100), "outside_certain")
        XCTAssertEqual(GymGeometry.accuracyBand(distanceMeters: 100, accuracyMeters: 20, radiusMeters: 100), "ambiguous")
        XCTAssertEqual(GymGeometry.accuracyBand(distanceMeters: 100, accuracyMeters: nil, radiusMeters: 100), "ambiguous")
    }
}
