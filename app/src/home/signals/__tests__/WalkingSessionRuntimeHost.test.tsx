jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { act, render, waitFor } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE } from "../../store/homeState";
import { useHomeStore } from "../../store/homeStore";
import { WalkingSessionRuntimeHost } from "../WalkingSessionRuntimeHost";

describe("WalkingSessionRuntimeHost", () => {
  beforeEach(() => {
    useHomeStore.setState(DEFAULT_HOME_STATE);
  });

  it("reconciles a running session when condition state changes", async () => {
    const reconcileCondition = jest.fn().mockResolvedValue(undefined);
    render(
      <WalkingSessionRuntimeHost controller={{ reconcileCondition }} />,
    );

    await waitFor(() => expect(reconcileCondition).toHaveBeenCalledTimes(1));

    await act(async () => {
      useHomeStore.setState({ disabledConditionIds: ["walking-condition"] });
    });

    await waitFor(() => expect(reconcileCondition).toHaveBeenCalledTimes(2));
  });
});
