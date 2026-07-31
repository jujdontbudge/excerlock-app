import type { ScreenTimeModule } from "../ScreenTimeModule";
import { deviceActivityApi } from "./deviceActivityApi";
import { NativeScreenTimeModule } from "./NativeScreenTimeModule";
import { nativeScreenTimePicker } from "./NativeScreenTimePickerHost";

export function createNativeScreenTimeModule(): ScreenTimeModule {
  return new NativeScreenTimeModule({
    deviceActivity: deviceActivityApi,
    picker: nativeScreenTimePicker,
  });
}
