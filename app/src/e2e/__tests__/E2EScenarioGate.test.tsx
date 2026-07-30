jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { E2EScenarioGate } from "../E2EScenarioGate";

describe("E2E scenario gate", () => {
  it("renders a loud named error instead of the app for an unknown scenario", async () => {
    await render(
      <E2EScenarioGate url="excerlock://e2e/scenario/not-bundled">
        <Text>Normal app</Text>
      </E2EScenarioGate>,
    );

    const errorScreen = await screen.findByTestId("screen-e2e-error");

    expect(errorScreen).toHaveTextContent(
      /scenario "not-bundled"/,
    );
    expect(errorScreen).toHaveTextContent(
      /Unknown E2E scenario "not-bundled"/,
    );
    expect(screen.queryByText("Normal app")).not.toBeOnTheScreen();
  });
});
