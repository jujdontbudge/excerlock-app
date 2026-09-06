import { SavedPlace } from '../ports/models';
export const gymPlace: SavedPlace = {
  id: 'gym-1',
  name: 'West Loop Fitness',
  address: '123 N Morgan St, Chicago',
  latitude: 41.884,
  longitude: -87.652,
  radiusMeters: 100,
};
export const places: SavedPlace[] = [
  gymPlace,
  {
    id: 'gym-2',
    name: 'River North Gym',
    address: '430 N Clark St, Chicago',
    latitude: 41.89,
    longitude: -87.631,
    radiusMeters: 100,
  },
  {
    id: 'gym-3',
    name: 'Lakeview Strength',
    address: '900 W Belmont Ave, Chicago',
    latitude: 41.94,
    longitude: -87.65,
    radiusMeters: 100,
  },
  {
    id: 'gym-4',
    name: 'South Loop Training',
    address: '1200 S Michigan Ave, Chicago',
    latitude: 41.866,
    longitude: -87.625,
    radiusMeters: 100,
  },
  {
    id: 'gym-5',
    name: 'Logan Square Fitness',
    address: '2500 N Milwaukee Ave, Chicago',
    latitude: 41.927,
    longitude: -87.705,
    radiusMeters: 100,
  },
  {
    id: 'gym-6',
    name: 'Hyde Park Movement',
    address: '1500 E 55th St, Chicago',
    latitude: 41.794,
    longitude: -87.589,
    radiusMeters: 100,
  },
];
