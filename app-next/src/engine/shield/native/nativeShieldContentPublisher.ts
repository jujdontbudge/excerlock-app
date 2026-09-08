import { deviceActivityApi } from "../../screentime/native/deviceActivityApi";
import {
  ShieldContentPublisher,
  type AppGroupWriter,
} from "../ShieldContentPublisher";

/**
 * The app group is reached through `deviceActivityApi` rather than through the package directly,
 * so the claim that file makes about being the only translator stays true. Importing
 * `userDefaultsSet` here was the one thing that made it false.
 */
const nativeAppGroupWriter: AppGroupWriter = {
  set: (key, value) => deviceActivityApi.setSharedValue(key, value),
};

export const nativeShieldContentPublisher = new ShieldContentPublisher(
  nativeAppGroupWriter,
);
