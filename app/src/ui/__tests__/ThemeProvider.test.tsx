import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

import { ThemeProvider, theme, useTheme } from "../theme";

function ProbeTitleColor() {
  return <Text>{useTheme().colors.primary}</Text>;
}

describe("ThemeProvider", () => {
  it("serves the default theme to unwrapped consumers", async () => {
    await render(<ProbeTitleColor />);

    expect(screen.getByText(theme.colors.primary)).toBeOnTheScreen();
  });

  it("serves an overridden theme to wrapped consumers", async () => {
    const nightTheme = { ...theme, colors: { ...theme.colors, primary: "#123456" } };

    await render(
      <ThemeProvider value={nightTheme}>
        <ProbeTitleColor />
      </ThemeProvider>,
    );

    expect(screen.getByText("#123456")).toBeOnTheScreen();
  });
});
