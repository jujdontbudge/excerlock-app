import { userDefaultsSet } from "react-native-device-activity";

import {
  ShieldContentPublisher,
  type AppGroupWriter,
} from "../ShieldContentPublisher";

const nativeAppGroupWriter: AppGroupWriter = {
  set: userDefaultsSet,
};

export const nativeShieldContentPublisher = new ShieldContentPublisher(
  nativeAppGroupWriter,
);
