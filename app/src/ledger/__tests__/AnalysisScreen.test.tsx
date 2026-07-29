import { render, screen } from "@testing-library/react-native";

import { AnalysisScreen } from "..";

describe("AnalysisScreen", () => {
  it("scaffolds the Analysis surface", async () => {
    await render(<AnalysisScreen />);

    expect(screen.getByRole("header", { name: "Analysis" })).toBeOnTheScreen();
  });
});
