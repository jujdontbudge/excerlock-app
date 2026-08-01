import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { AccountRuntimeRoot } from "../AccountRuntimeRoot";

describe("AccountRuntimeRoot keyless build", () => {
  it("renders without initializing Clerk", async () => {
    await render(
      <AccountRuntimeRoot publishableKey="  ">
        <Text>Keyless app content</Text>
      </AccountRuntimeRoot>,
    );

    expect(screen.getByText("Keyless app content")).toBeOnTheScreen();
  });
});
