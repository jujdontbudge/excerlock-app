jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { act, render, waitFor } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE } from "../../store/homeState";
import { useHomeStore } from "../../store/homeStore";
import {
  DEFAULT_SETTINGS,
  useSettingsStore,
} from "@/settings/store/settingsStore";
import { GymPresenceRuntimeHost } from "../GymPresenceRuntimeHost";

describe("GymPresenceRuntimeHost", () => {
  beforeEach(() => {
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useSettingsStore.setState(DEFAULT_SETTINGS);
  });

  it("reconciles saved auto-detect state when its condition inputs change", async () => {
    const reconcileAutoDetect = jest.fn().mockResolvedValue(undefined);
    await render(
      <GymPresenceRuntimeHost controller={{ reconcileAutoDetect }} />,
    );

    await waitFor(() => expect(reconcileAutoDetect).toHaveBeenCalledTimes(1));

    await act(async () => {
      useSettingsStore.getState().setGymAutoDetectEnabled(true);
    });

    await waitFor(() => expect(reconcileAutoDetect).toHaveBeenCalledTimes(2));
  });
});
