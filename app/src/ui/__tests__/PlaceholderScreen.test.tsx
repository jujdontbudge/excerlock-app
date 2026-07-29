import { render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";

import { PlaceholderScreen } from "..";
import { gradients } from "../theme";

describe("PlaceholderScreen", () => {
  it("scaffolds a titled surface on the brand gradient", async () => {
    await render(<PlaceholderScreen title="Manage" summary="Conditions live here." />);

    expect(screen.getByRole("header", { name: "Manage" })).toBeOnTheScreen();
    expect(screen.getByText("Conditions live here.")).toBeOnTheScreen();
    expect(screen.getByTestId("placeholder-screen").props.colors).toEqual(
      gradients.screen.colors.map((hex) => processColor(hex)),
    );
  });
});
