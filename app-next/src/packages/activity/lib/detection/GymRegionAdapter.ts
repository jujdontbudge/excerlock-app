import type { LocationProvider, GeofenceRegion } from '../location/LocationProvider';
import { assertGymRegionsAllowed } from '../location/gymRegions';
import { resumeGymVisitLogWrites } from '../../AsyncStorageGymVisitLog';
import type { SavedPlace } from '../../../model/models';
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
    await resumeGymVisitLogWrites(regions.map(({ id }) => id));
  }
  async deleteSavedGym(regionId: string): Promise<void> {
    await this.location.stopMonitoringRegions([regionId]);
    await this.invalidate(regionId);
  }
  presence(regionId: string): boolean | null {
    return this.location.isInsideRegion(regionId);
  }
}
