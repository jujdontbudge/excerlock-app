import { render, screen } from "@testing-library/react-native";

import { ManageScreen } from "..";

describe("ManageScreen", () => {
  it("scaffolds the Manage surface", async () => {
    await render(<ManageScreen />);

    expect(screen.getByRole("header", { name: "Manage" })).toBeOnTheScreen();
  });
});
