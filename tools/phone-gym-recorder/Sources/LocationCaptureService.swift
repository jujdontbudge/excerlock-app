import CoreLocation
import Foundation

#if canImport(UIKit)
import UIKit
#endif

protocol LocationCaptureServiceDelegate: AnyObject {
    /// One delivered CLLocation plus its per-gym distance/accuracy bands.
    func locationCaptureDidDeliver(payload: [String: Any], stamp: CaptureStamp)
    /// A non-location event: monitoring lifecycle, region events, authorization,
    /// errors, pauses and Low Power Mode changes.
    func locationCaptureDidEmit(type: String, payload: [String: Any], stamp: CaptureStamp)
    /// The one-shot fix a manual check-in probe asked for.
    func locationCaptureDidProbe(distanceM: Double?, accuracyM: Double?, inside: Bool?, stamp: CaptureStamp)
}

/// Owns the one CLLocationManager. It mirrors the production provider's
/// configuration and adds nothing but observation: every delivered fix, every
/// region lifecycle callback, every authorization change and every error is
/// written to the archive with receipt time, and each region event payload says
/// out loud that Core Location gives no crossing time.
final class LocationCaptureService: NSObject, CLLocationManagerDelegate {
    weak var delegate: LocationCaptureServiceDelegate?

    private let manager = CLLocationManager()
    private let clock: CaptureClock
    private var gyms: [SavedGym] = []
    private var monitoring: Set<String> = []
    private var probeContinuation: ((CLLocation?) -> Void)?
    private var isRunning = false

    init(clock: CaptureClock = SystemCaptureClock()) {
        self.clock = clock
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = kCLDistanceFilterNone
        manager.activityType = .fitness
        manager.pausesLocationUpdatesAutomatically = false
        manager.allowsBackgroundLocationUpdates = true
        manager.showsBackgroundLocationIndicator = true
    }

    var permission: LocationPermission {
        switch manager.authorizationStatus {
        case .notDetermined: return .notDetermined
        case .restricted: return .restricted
        case .denied: return .denied
        case .authorizedWhenInUse: return .whenInUse
        case .authorizedAlways: return .always
        @unknown default: return .notDetermined
        }
    }

    var accuracyAuthorization: LocationAccuracyAuthorization {
        manager.accuracyAuthorization == .fullAccuracy ? .fullAccuracy : .reducedAccuracy
    }

    var locationServicesEnabled: Bool { CLLocationManager.locationServicesEnabled() }

    static var statusName: String {
        switch CLLocationManager().authorizationStatus {
        case .notDetermined: return "notDetermined"
        case .restricted: return "restricted"
        case .denied: return "denied"
        case .authorizedWhenInUse: return "authorizedWhenInUse"
        case .authorizedAlways: return "authorizedAlways"
        @unknown default: return "notDetermined"
        }
    }

    func requestWhenInUse() {
        manager.requestWhenInUseAuthorization()
    }

    /// Starts updates and registers one circular region per saved gym, exactly
    /// as the production provider does: notify on entry and exit, then ask iOS
    /// for the current state so a start inside the circle is not invisible.
    func start(gyms: [SavedGym]) {
        self.gyms = gyms
        guard !isRunning else {
            updateRegions()
            return
        }
        isRunning = true
        manager.startUpdatingLocation()
        updateRegions()
        delegate?.locationCaptureDidEmit(
            type: "location_updates_resumed",
            payload: ["reason": "start", "desiredAccuracy": "best", "distanceFilterMeters": 0],
            stamp: clock.now()
        )
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        manager.stopUpdatingLocation()
        for identifier in monitoring { manager.stopMonitoring(for: CLCircularRegion(center: CLLocationCoordinate2D(), radius: 1, identifier: identifier)) }
        monitoring.removeAll()
        probeContinuation = nil
        delegate?.locationCaptureDidEmit(
            type: "location_updates_paused",
            payload: ["reason": "stop"],
            stamp: clock.now()
        )
    }

    /// Re-registers every circle: the operator's Probe re-register button for
    /// the "permission granted after arrival" scenario.
    func reregister(gyms: [SavedGym]) {
        self.gyms = gyms
        for gym in gyms where monitoring.contains(gym.id) {
            // Stop first so iOS treats this as a fresh registration and answers
            // with a state determination instead of ignoring the duplicate.
            manager.stopMonitoring(for: region(for: gym))
            monitoring.remove(gym.id)
        }
        updateRegions()
    }

    /// Asks iOS for the current state of every monitored region. Called at start
    /// and on every foreground return, so a state change iOS did not deliver as
    /// an event is still visible in the archive as `region_state_determined`.
    func requestStateNow(reason: String) {
        for gym in gyms where monitoring.contains(gym.id) {
            manager.requestState(for: region(for: gym))
        }
        delegate?.locationCaptureDidEmit(
            type: "region_state_requested",
            payload: ["reason": reason, "gymIds": gyms.map(\.id)],
            stamp: clock.now()
        )
    }

    /// One High-accuracy fix, the mirror of the production manual check-in.
    func probeCurrentLocation(completion: @escaping (CLLocation?) -> Void) {
        probeContinuation = completion
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.requestLocation()
    }

    func currentDistance(to gym: SavedGym, location: CLLocation) -> Double {
        GymGeometry.distanceMetres(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude,
            toLatitude: gym.latitude,
            toLongitude: gym.longitude
        )
    }

    private func region(for gym: SavedGym) -> CLCircularRegion {
        let region = CLCircularRegion(
            center: CLLocationCoordinate2D(latitude: gym.latitude, longitude: gym.longitude),
            radius: gym.radiusMeters,
            identifier: gym.id
        )
        region.notifyOnEntry = true
        region.notifyOnExit = true
        return region
    }

    private func updateRegions() {
        let wanted = Set(gyms.map(\.id))
        for gym in gyms where !monitoring.contains(gym.id) {
            let region = region(for: gym)
            manager.startMonitoring(for: region)
            monitoring.insert(gym.id)
            delegate?.locationCaptureDidEmit(
                type: "region_monitoring_started",
                payload: [
                    "gymId": gym.id,
                    "radiusMeters": gym.radiusMeters,
                    "notifyOnEntry": true,
                    "notifyOnExit": true,
                    "authorizationStatus": Self.statusName
                ],
                stamp: clock.now()
            )
            manager.requestState(for: region)
        }
        for identifier in monitoring.subtracting(wanted) {
            manager.stopMonitoring(for: CLCircularRegion(center: CLLocationCoordinate2D(), radius: 1, identifier: identifier))
            monitoring.remove(identifier)
        }
    }

    private func appStateName() -> String {
        #if canImport(UIKit)
        switch UIApplication.shared.applicationState {
        case .active: return "active"
        case .inactive: return "inactive"
        case .background: return "background"
        @unknown default: return "unknown"
        }
        #else
        return "unknown"
        #endif
    }

    private func perGymPayload(location: CLLocation) -> [[String: Any]] {
        gyms.map { gym in
            let distance = currentDistance(to: gym, location: location)
            let accuracy = location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : nil
            return [
                "gymId": gym.id,
                "distanceM": distance,
                "insideByDistance": distance <= gym.radiusMeters,
                "accuracyBand": GymGeometry.accuracyBand(
                    distanceMeters: distance,
                    accuracyMeters: accuracy,
                    radiusMeters: gym.radiusMeters
                )
            ]
        }
    }

    // MARK: CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let stamp = clock.now()
        for location in locations {
            let horizontal = location.horizontalAccuracy >= 0 ? location.horizontalAccuracy : nil
            let payload: [String: Any] = [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "horizontalAccuracyM": horizontal ?? NSNull(),
                "invalid": horizontal == nil,
                "altitudeM": location.altitude,
                "verticalAccuracyM": location.verticalAccuracy >= 0 ? location.verticalAccuracy : NSNull(),
                "speedMps": location.speed >= 0 ? location.speed : NSNull(),
                "speedAccuracyMps": location.speedAccuracy >= 0 ? location.speedAccuracy : NSNull(),
                "courseDeg": location.course >= 0 ? location.course : NSNull(),
                "courseAccuracyDeg": location.courseAccuracy >= 0 ? location.courseAccuracy : NSNull(),
                "floorLevel": location.floor?.level ?? NSNull(),
                "sourceWallTimeMs": Int64((location.timestamp.timeIntervalSince1970 * 1_000).rounded()),
                "sourceClock": "CLLocation.timestamp",
                "isSimulatedBySoftware": location.sourceInformation?.isSimulatedBySoftware ?? NSNull(),
                "isProducedByAccessory": location.sourceInformation?.isProducedByAccessory ?? NSNull(),
                "appState": appStateName(),
                "deliveryBatchSize": locations.count,
                "perGym": perGymPayload(location: location)
            ]
            delegate?.locationCaptureDidDeliver(payload: payload, stamp: stamp)
        }
        if let probe = probeContinuation {
            probeContinuation = nil
            let location = locations.last
            let gym = gyms.first
            let distance = (location != nil && gym != nil) ? currentDistance(to: gym!, location: location!) : nil
            let accuracy = location.map { $0.horizontalAccuracy >= 0 ? $0.horizontalAccuracy : nil } ?? nil
            delegate?.locationCaptureDidProbe(
                distanceM: distance,
                accuracyM: accuracy,
                inside: (distance != nil && gym != nil) ? distance! <= gym!.radiusMeters : nil,
                stamp: stamp
            )
            probe(location)
        }
    }

    func locationManager(_ manager: CLLocationManager, didEnterRegion region: CLRegion) {
        emitRegionEvent(region: region, kind: "enter")
    }

    func locationManager(_ manager: CLLocationManager, didExitRegion region: CLRegion) {
        emitRegionEvent(region: region, kind: "exit")
    }

    func locationManager(_ manager: CLLocationManager, didDetermineState state: CLRegionState, for region: CLRegion) {
        let name: String
        switch state {
        case .inside: name = "inside"
        case .outside: name = "outside"
        case .unknown: name = "unknown"
        @unknown default: name = "unknown"
        }
        delegate?.locationCaptureDidEmit(
            type: "region_state_determined",
            payload: ["gymId": region.identifier, "state": name, "appState": appStateName()],
            stamp: clock.now()
        )
    }

    func locationManager(_ manager: CLLocationManager, didStartMonitoringFor region: CLRegion) {
        delegate?.locationCaptureDidEmit(
            type: "region_monitoring_confirmed",
            payload: ["gymId": region.identifier, "radiusMeters": (region as? CLCircularRegion)?.radius ?? NSNull()],
            stamp: clock.now()
        )
    }

    func locationManager(_ manager: CLLocationManager, monitoringDidFailFor region: CLRegion?, withError error: Error) {
        let nsError = error as NSError
        delegate?.locationCaptureDidEmit(
            type: "region_monitoring_failed",
            payload: [
                "gymId": region?.identifier ?? NSNull(),
                "errorCode": nsError.code,
                "errorDomain": nsError.domain,
                "description": nsError.localizedDescription
            ],
            stamp: clock.now()
        )
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        let nsError = error as NSError
        delegate?.locationCaptureDidEmit(
            type: "location_error",
            payload: [
                "errorCode": nsError.code,
                "errorDomain": nsError.domain,
                "description": nsError.localizedDescription,
                "kCLErrorDenied": nsError.code == CLError.denied.rawValue
            ],
            stamp: clock.now()
        )
        if let probe = probeContinuation {
            probeContinuation = nil
            delegate?.locationCaptureDidProbe(distanceM: nil, accuracyM: nil, inside: nil, stamp: clock.now())
            probe(nil)
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        delegate?.locationCaptureDidEmit(
            type: "authorization_changed",
            payload: [
                "status": Self.statusName,
                "accuracyAuthorization": manager.accuracyAuthorization == .fullAccuracy ? "fullAccuracy" : "reducedAccuracy",
                "locationServicesEnabled": CLLocationManager.locationServicesEnabled()
            ],
            stamp: clock.now()
        )
    }

    func locationManagerDidPauseLocationUpdates(_ manager: CLLocationManager) {
        delegate?.locationCaptureDidEmit(
            type: "location_updates_paused",
            payload: ["reason": "system_paused_updates"],
            stamp: clock.now()
        )
    }

    func locationManagerDidResumeLocationUpdates(_ manager: CLLocationManager) {
        delegate?.locationCaptureDidEmit(
            type: "location_updates_resumed",
            payload: ["reason": "system_resumed_updates"],
            stamp: clock.now()
        )
    }

    private func emitRegionEvent(region: CLRegion, kind: String) {
        delegate?.locationCaptureDidEmit(
            type: "region_event",
            payload: [
                "gymId": region.identifier,
                "kind": kind,
                "appState": appStateName(),
                // The same honesty as GymVisitLog.atMs: receipt time is the
                // only time Core Location gives a region event.
                "sourceTime": "unavailable_receipt_only"
            ],
            stamp: clock.now()
        )
    }
}
