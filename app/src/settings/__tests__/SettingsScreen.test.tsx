import { render, screen } from "@testing-library/react-native";

import { SettingsScreen } from "..";

describe("SettingsScreen", () => {
  it("scaffolds the Settings surface", async () => {
    await render(<SettingsScreen />);

    expect(screen.getByRole("header", { name: "Settings" })).toBeOnTheScreen();
  });
});
