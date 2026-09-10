import type { LocationProvider, GeofenceRegion } from '../../engine/signals/location/LocationProvider';
import { assertGymRegionsAllowed } from '../../engine/signals/location/gymRegions';
import type { SavedPlace } from '../../ports/models';
export class GymRegionAdapter {
  constructor(
    private readonly location: LocationProvider,
    private readonly invalidate: (regionId: string) => Promise<void>,
  ) {}
  async registerSavedGyms(places: readonly SavedPlace[]): Promise<void> {
    const regions: GeofenceRegion[] = places.map((place) => ({
      id: place.id,
      latitude: place.latitude,
      longitude: place.longitude,
      radiusMeters: place.radiusMeters,
    }));
    assertGymRegionsAllowed(regions);
    await this.location.startMonitoringRegions(regions);
  }
  async deleteSavedGym(regionId: string): Promise<void> {
    await this.location.stopMonitoringRegions([regionId]);
    await this.invalidate(regionId);
  }
  presence(regionId: string): boolean | null {
    return this.location.isInsideRegion(regionId);
  }
}
