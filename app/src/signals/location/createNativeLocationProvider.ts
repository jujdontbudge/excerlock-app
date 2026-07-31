import { createExpoLocationClient } from "./createExpoLocationClient";
import { NativeLocationProvider } from "./NativeLocationProvider";

export function createNativeLocationProvider(): NativeLocationProvider {
  return new NativeLocationProvider(createExpoLocationClient());
}
