import { SavedPlace } from '../ports/models';
export const gymPlace: SavedPlace = {
  id: 'gym-1',
  name: 'West Loop Fitness',
  address: '123 N Morgan St, Chicago',
  latitude: 41.884,
  longitude: -87.652,
  radiusMeters: 150,
};
export const places: SavedPlace[] = [
  gymPlace,
  {
    id: 'gym-2',
    name: 'River North Gym',
    address: '430 N Clark St, Chicago',
    latitude: 41.89,
    longitude: -87.631,
    radiusMeters: 150,
  },
];
