import Combine
import Foundation

struct GymFixSample: Equatable {
    let latitude: Double
    let longitude: Double
    let horizontalAccuracyM: Double
    let wallTimeMs: Int64
}

struct SavedGym: Codable, Equatable, Identifiable {
    let id: String
    var name: String
    let latitude: Double
    let longitude: Double
    var radiusMeters: Double
    /// `search`, `map_pin` or `current_fix_average`, so a reader knows how the centre was set.
    let setBy: String
    let setAtWallTimeMs: Int64
    let fixesAveraged: Int
    let averageAccuracyM: Double?
    var isUnderTest: Bool

    var dictionary: [String: Any] {
        [
            "id": id,
            "name": name,
            "latitude": latitude,
            "longitude": longitude,
            "radiusMeters": radiusMeters,
            "setBy": setBy,
            "setAtWallTimeMs": setAtWallTimeMs,
            "fixesAveraged": fixesAveraged,
            "averageAccuracyM": averageAccuracyM ?? NSNull(),
            "isUnderTest": isUnderTest
        ]
    }

    func contains(latitude otherLatitude: Double, longitude otherLongitude: Double) -> Bool {
        GymGeometry.isInside(
            latitude: otherLatitude,
            longitude: otherLongitude,
            regionLatitude: latitude,
            regionLongitude: longitude,
            radiusMeters: radiusMeters
        )
    }
}

/// The circle under test, saved locally. It deliberately mirrors the production
/// picker's clamp (50–200 m in 10 m steps, default 100) and its 5-gym ceiling,
/// because the harness must test the same circle geometry ExcerLock uses.
final class GymRegistry: ObservableObject {
    static let averagingWindowSeconds: Double = 20
    /// Fixes worse than this are rejected from the average: a 65 m fix cannot
    /// improve a 100 m circle's centre.
    static let maximumAcceptedAccuracyM: Double = 65
    static let minimumFixesForAverage = 3

    @Published private(set) var gyms: [SavedGym] = []
    let baseURL: URL

    init(baseURL: URL? = nil) {
        if let baseURL {
            self.baseURL = baseURL
        } else {
            let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            self.baseURL = support.appendingPathComponent("GymRecorder", isDirectory: true)
        }
        try? FileManager.default.createDirectory(at: self.baseURL, withIntermediateDirectories: true)
        load()
    }

    var gymUnderTest: SavedGym? {
        gyms.first { $0.isUnderTest } ?? gyms.first
    }

    var canAddMore: Bool { gyms.count < maximumGyms }

    static func clampRadius(_ value: Double) -> Double {
        let clamped = min(max(value, gymRadiusMinimumMeters), gymRadiusMaximumMeters)
        let steps = (clamped - gymRadiusMinimumMeters) / gymRadiusStepMeters
        return gymRadiusMinimumMeters + (steps.rounded() * gymRadiusStepMeters)
    }

    static func normalisedRadius(_ value: Double) -> Double {
        let clamped = min(max(value, gymRadiusMinimumMeters), gymRadiusMaximumMeters)
        return ((clamped / gymRadiusStepMeters).rounded()) * gymRadiusStepMeters
    }

    /// Accuracy-weighted average of the fixes taken while standing at the
    /// entrance. Returns nil when no usable fix arrived, so the caller never
    /// silently saves a bad centre.
    static func averagedLocation(from fixes: [GymFixSample]) -> (latitude: Double, longitude: Double, accuracyM: Double, count: Int)? {
        let usable = fixes.filter { $0.horizontalAccuracyM > 0 && $0.horizontalAccuracyM <= maximumAcceptedAccuracyM }
        guard usable.count >= minimumFixesForAverage else { return nil }
        var weightSum = 0.0
        var latitudeSum = 0.0
        var longitudeSum = 0.0
        for fix in usable {
            let weight = 1.0 / (fix.horizontalAccuracyM * fix.horizontalAccuracyM)
            weightSum += weight
            latitudeSum += fix.latitude * weight
            longitudeSum += fix.longitude * weight
        }
        guard weightSum > 0 else { return nil }
        return (
            latitude: latitudeSum / weightSum,
            longitude: longitudeSum / weightSum,
            accuracyM: Double(usable.map(\.horizontalAccuracyM).reduce(0, +)) / Double(usable.count),
            count: usable.count
        )
    }

    /// Saves the circle the picker settled on and makes it the one under test.
    /// `setBy` says how the centre was chosen: `search`, `map_pin` or
    /// `current_fix_average` (with the fixes averaged and their mean accuracy).
    /// Passing an existing `id` replaces that circle in place, so editing keeps
    /// the id the archive already refers to.
    @discardableResult
    func savePicked(
        id: String? = nil,
        name: String,
        latitude: Double,
        longitude: Double,
        radiusMeters: Double,
        setBy: String,
        fixesAveraged: Int = 0,
        averageAccuracyM: Double? = nil,
        clock: CaptureClock = SystemCaptureClock()
    ) -> SavedGym? {
        guard (-90...90).contains(latitude), (-180...180).contains(longitude) else { return nil }
        guard !(latitude == 0 && longitude == 0) else { return nil }
        let existingIndex = id.flatMap { id in gyms.firstIndex { $0.id == id } }
        guard existingIndex != nil || canAddMore else { return nil }
        let gym = SavedGym(
            id: existingIndex.map { gyms[$0].id } ?? "gym-\(UUID().uuidString.lowercased().prefix(8))",
            name: name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "Gym \(gyms.count + 1)" : name.trimmingCharacters(in: .whitespacesAndNewlines),
            latitude: latitude,
            longitude: longitude,
            radiusMeters: Self.normalisedRadius(radiusMeters),
            setBy: setBy,
            setAtWallTimeMs: clock.now().wallTimeMs,
            fixesAveraged: fixesAveraged,
            averageAccuracyM: averageAccuracyM,
            isUnderTest: true
        )
        if let existingIndex {
            gyms[existingIndex] = gym
        } else {
            gyms.append(gym)
        }
        for index in gyms.indices { gyms[index].isUnderTest = gyms[index].id == gym.id }
        save()
        return gym
    }

    func updateRadius(id: String, radiusMeters: Double) {
        guard let index = gyms.firstIndex(where: { $0.id == id }) else { return }
        gyms[index].radiusMeters = Self.normalisedRadius(radiusMeters)
        save()
    }

    func rename(id: String, name: String) {
        guard let index = gyms.firstIndex(where: { $0.id == id }) else { return }
        gyms[index].name = name
        save()
    }

    func markUnderTest(id: String) {
        for index in gyms.indices { gyms[index].isUnderTest = gyms[index].id == id }
        save()
    }

    func remove(id: String) {
        gyms.removeAll { $0.id == id }
        if !gyms.isEmpty, !gyms.contains(where: \.isUnderTest) { gyms[0].isUnderTest = true }
        save()
    }

    func gymsJSON() -> [[String: Any]] { gyms.map(\.dictionary) }

    private func load() {
        let url = baseURL.appendingPathComponent("gyms.json")
        guard let data = try? Data(contentsOf: url) else { return }
        gyms = (try? JSONDecoder().decode([SavedGym].self, from: data)) ?? []
    }

    private func save() {
        let url = baseURL.appendingPathComponent("gyms.json")
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        guard let data = try? encoder.encode(gyms) else { return }
        #if os(iOS)
        try? data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
        #else
        try? data.write(to: url, options: .atomic)
        #endif
    }
}
