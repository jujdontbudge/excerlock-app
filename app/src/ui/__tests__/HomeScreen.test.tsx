import { render, screen } from "@testing-library/react-native";

import { HomeScreen } from "..";

describe("HomeScreen", () => {
  it("identifies the scaffolded Home surface", async () => {
    await render(<HomeScreen />);

    expect(screen.getByText("Home")).toBeOnTheScreen();
  });
});
