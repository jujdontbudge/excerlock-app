import * as Location from "expo-location";

import {
  ExpoGymSearchClient,
  type ExpoGeocodingModule,
} from "./ExpoGymSearchClient";

export function createExpoGymSearchClient(): ExpoGymSearchClient {
  return new ExpoGymSearchClient(Location as unknown as ExpoGeocodingModule);
}
