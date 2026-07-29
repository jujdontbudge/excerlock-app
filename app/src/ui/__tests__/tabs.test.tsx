import { render, screen } from "@testing-library/react-native";

import { TAB_ROUTES, TabBarIcon, tabScreenOptions } from "../navigation";
import { colors } from "../theme";

describe("tab routes", () => {
  it("is exactly the four approved plain tabs, in order", () => {
    expect(TAB_ROUTES.map((route) => [route.name, route.title])).toEqual([
      ["index", "Home"],
      ["manage", "Manage"],
      ["analysis", "Analysis"],
      ["settings", "Settings"],
    ]);
  });

  it("gives every tab its own harvested glyph", () => {
    const glyphs = TAB_ROUTES.map((route) => route.icon);

    expect(new Set(glyphs).size).toBe(TAB_ROUTES.length);
    for (const glyph of glyphs) {
      expect(glyph).toBeDefined();
    }
  });
});

describe("tabScreenOptions", () => {
  it("floats a borderless bar so the screen gradient runs to the bottom edge", () => {
    const options = tabScreenOptions();

    expect(options.headerShown).toBe(false);
    expect(options.tabBarStyle).toMatchObject({
      backgroundColor: "transparent",
      borderTopWidth: 0,
      position: "absolute",
    });
    expect(options.sceneStyle).toMatchObject({ backgroundColor: "transparent" });
  });

  it("marks the active tab white and rests the others translucent", () => {
    const options = tabScreenOptions();

    expect(options.tabBarActiveTintColor).toBe(colors.textPrimary);
    expect(options.tabBarInactiveTintColor).toBe(colors.textSecondary);
  });
});

describe("TabBarIcon", () => {
  it("tints the white glyph at render instead of shipping a coloured asset", async () => {
    await render(<TabBarIcon testID="glyph" icon="home" color="#ABCDEF" size={30} />);

    expect(screen.getByTestId("glyph-image").props.tintColor).toBe("#ABCDEF");
  });
});
