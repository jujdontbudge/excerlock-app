# LocationProvider

Contract: geofence regions, presence checks, and walk-session keep-alive behavior behind one provider
interface. Consumers do not import Expo Location or Task Manager directly.

`FixtureLocationProvider` consumes `location.enterRegion`, `location.exitRegion`, `location.update`,
and `location.authChanged`. History establishes presence synchronously; future region events notify
only regions the caller is monitoring. Walk keep-alive is an explicit start/stop lifecycle.

Canonical fixtures: `gym-enter-exit`, `region-blip`, and `quiet`. Test with
`npm run test --workspace app -- signals/location`.
