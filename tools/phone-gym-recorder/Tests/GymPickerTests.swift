import CoreLocation
import XCTest
@testable import PhoneGymRecorder

final class GymPickerTests: XCTestCase {
    private func makeRegistry() -> GymRegistry {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("gym-picker-tests-\(UUID().uuidString)", isDirectory: true)
        return GymRegistry(baseURL: url)
    }

    func testSavePickedClampsRadiusAndMarksUnderTest() {
        let registry = makeRegistry()
        let first = registry.savePicked(name: "  ", latitude: 59.33, longitude: 18.07, radiusMeters: 500, setBy: "search")
        XCTAssertEqual(first?.name, "Gym 1")
        XCTAssertEqual(first?.radiusMeters, gymRadiusMaximumMeters)
        let second = registry.savePicked(name: "Other", latitude: 59.34, longitude: 18.08, radiusMeters: 73, setBy: "map_pin")
        XCTAssertEqual(second?.radiusMeters, 70)
        XCTAssertEqual(registry.gymUnderTest?.id, second?.id)
        XCTAssertEqual(registry.gyms.filter(\.isUnderTest).count, 1)
    }

    func testSavePickedWithExistingIdReplacesInPlace() {
        let registry = makeRegistry()
        let original = registry.savePicked(name: "Gym", latitude: 59.33, longitude: 18.07, radiusMeters: 100, setBy: "search")!
        let moved = registry.savePicked(id: original.id, name: "Gym", latitude: 59.35, longitude: 18.09, radiusMeters: 120, setBy: "map_pin")
        XCTAssertEqual(moved?.id, original.id)
        XCTAssertEqual(registry.gyms.count, 1)
        XCTAssertEqual(registry.gyms.first?.latitude, 59.35)
        XCTAssertEqual(registry.gyms.first?.setBy, "map_pin")
    }

    func testSavePickedRejectsNullIslandAndOutOfRange() {
        let registry = makeRegistry()
        XCTAssertNil(registry.savePicked(name: "x", latitude: 0, longitude: 0, radiusMeters: 100, setBy: "map_pin"))
        XCTAssertNil(registry.savePicked(name: "x", latitude: 91, longitude: 0, radiusMeters: 100, setBy: "map_pin"))
        XCTAssertTrue(registry.gyms.isEmpty)
    }

    func testGeometryRoundTripsRadiusThroughFittedRegion() {
        let centre = CLLocationCoordinate2D(latitude: 59.33, longitude: 18.07)
        let size = CGSize(width: 360, height: 380)
        let region = GymPickerGeometry.region(centre: centre, radiusMeters: 100, size: size)
        // The fitted span is 2.7 radii across the shorter side, so the ring
        // covers width / 2.7 points and always fits inside the map.
        let points = GymPickerGeometry.metresToPoints(region: region, width: size.width, metres: 100)
        XCTAssertEqual(points, size.width / 2.7, accuracy: 0.5)
    }
}
