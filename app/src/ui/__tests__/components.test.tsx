import { fireEvent, render, screen } from "@testing-library/react-native";
import { processColor, Text } from "react-native";

import { Card, PillButton, Screen, SectionHeader } from "../components";
import { colors, gradients, radius } from "../theme";

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((all, part) => ({ ...all, ...flatten(part) }), {});
  }
  return (style ?? {}) as Record<string, unknown>;
}

/** `expo-linear-gradient` hands the native view processed colours, not hex. */
function processed(hexes: readonly string[]) {
  return hexes.map((hex) => processColor(hex));
}

describe("Screen", () => {
  it("paints the screen gradient behind its children", async () => {
    await render(
      <Screen testID="screen">
        <Text>Body</Text>
      </Screen>,
    );

    expect(screen.getByText("Body")).toBeOnTheScreen();
    expect(screen.getByTestId("screen").props.colors).toEqual(processed(gradients.screen.colors));
  });

  it("paints the dashboard gradient on request", async () => {
    await render(<Screen testID="screen" variant="dashboard" />);

    expect(screen.getByTestId("screen").props.colors).toEqual(
      processed(gradients.dashboard.colors),
    );
  });
});

describe("Card", () => {
  it("is translucent and borderless", async () => {
    await render(
      <Card testID="card">
        <Text>Inside</Text>
      </Card>,
    );

    const style = flatten(screen.getByTestId("card").props.style);
    expect(style.backgroundColor).toBe(colors.card);
    expect(style.borderRadius).toBe(radius.lg);
    expect(style.borderWidth).toBeUndefined();
    expect(screen.getByText("Inside")).toBeOnTheScreen();
  });

  it("lifts to the elevated fill", async () => {
    await render(<Card testID="card" variant="elevated" />);

    expect(flatten(screen.getByTestId("card").props.style).backgroundColor).toBe(colors.cardElevated);
  });
});

describe("PillButton", () => {
  it("presses through to its handler", async () => {
    const onPress = jest.fn();
    await render(<PillButton label="Create your first condition" onPress={onPress} />);

    fireEvent.press(screen.getByRole("button", { name: "Create your first condition" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("fills primary with the brand accent and white with ink", async () => {
    await render(
      <>
        <PillButton testID="primary" label="Primary" />
        <PillButton testID="white" label="White" variant="white" />
      </>,
    );

    expect(flatten(screen.getByTestId("primary").props.style).backgroundColor).toBe(colors.primary);
    expect(flatten(screen.getByTestId("white").props.style).backgroundColor).toBe(colors.pillScreenCta);
  });

  it("stays a stadium pill at every variant", async () => {
    await render(<PillButton testID="pill" label="Pill" variant="secondary" />);

    const style = flatten(screen.getByTestId("pill").props.style);
    expect(style.borderRadius).toBe(radius.pill);
    expect(style.height).toBe(50);
  });

  it("refuses to fire while disabled", async () => {
    const onPress = jest.fn();
    await render(<PillButton label="Disabled" onPress={onPress} disabled />);

    fireEvent.press(screen.getByRole("button", { name: "Disabled" }));

    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("SectionHeader", () => {
  it("announces an uppercase section label as a header", async () => {
    await render(<SectionHeader title="Conditions" subtitle="Nothing yet" />);

    const header = screen.getByRole("header", { name: "Conditions" });
    expect(flatten(header.props.style).textTransform).toBe("uppercase");
    expect(screen.getByText("Nothing yet")).toBeOnTheScreen();
  });
});
