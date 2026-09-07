import ExpoModulesCore
import MapKit
import CoreLocation
import Contacts

public class ExpoLocalSearchModule: Module {
  private let search = PlaceSearchService()
  private let location = PickerLocationService()

  public func definition() -> ModuleDefinition {
    Name("ExpoLocalSearch")
    AsyncFunction("locationPermission") { () -> String in
      switch CLLocationManager().authorizationStatus {
      case .authorizedAlways: return "always"
      case .authorizedWhenInUse: return "whenInUse"
      case .notDetermined: return "notDetermined"
      default: return "denied"
      }
    }.runOnQueue(.main)
    AsyncFunction("suggest") { (query: String, latitude: Double?, longitude: Double?, promise: Promise) in
      self.search.suggest(query, latitude: latitude, longitude: longitude, promise: promise)
    }.runOnQueue(.main)
    AsyncFunction("resolve") { (id: String, title: String, subtitle: String, promise: Promise) in
      self.search.resolve(id, title: title, subtitle: subtitle, promise: promise)
    }.runOnQueue(.main)
    AsyncFunction("nearbyGyms") { (latitude: Double, longitude: Double, promise: Promise) in
      self.search.nearby(latitude, longitude: longitude, promise: promise)
    }.runOnQueue(.main)
    AsyncFunction("reverseGeocode") { (latitude: Double, longitude: Double, promise: Promise) in
      let geocoder = CLGeocoder()
      geocoder.reverseGeocodeLocation(CLLocation(latitude: latitude, longitude: longitude)) { places, error in
        if let error = error { promise.reject("GEOCODE_FAILED", error.localizedDescription); return }
        guard let place = places?.first else { promise.resolve(nil as String?); return }
        if let address = place.postalAddress {
          promise.resolve(CNPostalAddressFormatter.string(from: address, style: .mailingAddress).replacingOccurrences(of: "\n", with: ", "))
        } else { promise.resolve(place.name) }
      }
    }.runOnQueue(.main)
    AsyncFunction("currentLocation") { (requestPermission: Bool, promise: Promise) in
      self.location.locate(requestPermission: requestPermission, promise: promise)
    }.runOnQueue(.main)
  }
}
