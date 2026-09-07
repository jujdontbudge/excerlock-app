import ExpoModulesCore
import CoreLocation

final class PickerLocationService: NSObject, CLLocationManagerDelegate {
  private var manager: CLLocationManager?
  private var pending: [Promise] = []
  private var timeout: DispatchWorkItem?
  func locate(requestPermission: Bool, promise: Promise) {
    if manager == nil {
      manager = CLLocationManager()
      manager?.delegate = self
      manager?.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    }
    guard let manager = manager else { promise.resolve(nil as String?); return }
    switch manager.authorizationStatus {
    case .authorizedAlways, .authorizedWhenInUse:
      pending.append(promise)
      manager.requestLocation()
      timeout?.cancel()
      let work = DispatchWorkItem { [weak self] in self?.finish(nil) }
      timeout = work
      DispatchQueue.main.asyncAfter(deadline: .now() + 12, execute: work)
    case .notDetermined where requestPermission:
      pending.append(promise)
      manager.requestWhenInUseAuthorization()
    default: promise.resolve(nil as String?)
    }
  }
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    guard !pending.isEmpty else { return }
    if manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways {
      manager.requestLocation()
      timeout?.cancel()
      let work = DispatchWorkItem { [weak self] in self?.finish(nil) }
      timeout = work
      DispatchQueue.main.asyncAfter(deadline: .now() + 12, execute: work)
    } else if manager.authorizationStatus != .notDetermined { finish(nil) }
  }
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    let coordinate = locations.last?.coordinate
    finish(coordinate.map { ["latitude": $0.latitude, "longitude": $0.longitude] })
  }
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) { finish(nil) }
  private func finish(_ coordinate: [String: Double]?) {
    timeout?.cancel()
    let callbacks = pending
    pending.removeAll()
    callbacks.forEach { $0.resolve(coordinate) }
  }
}
