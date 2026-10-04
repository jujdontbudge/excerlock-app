import type { GymPort } from '../ports/GymPort';
import { nativePlaceSearch } from './NativePlaceSearch';
export function foregroundGym(base: GymPort): GymPort {
  return { ...base, ...nativePlaceSearch, currentLocation: base.currentLocation };
}
