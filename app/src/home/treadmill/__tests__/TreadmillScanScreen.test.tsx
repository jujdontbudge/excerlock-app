import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native";

import {
  TreadmillScanScreen,
  type TreadmillScanSource,
} from "../TreadmillScanScreen";
import type { TreadmillScanSnapshot } from "../TreadmillScanController";

function scanSource(initial: TreadmillScanSnapshot) {
  let snapshot = initial;
  let listener = () => {};
  const source: TreadmillScanSource = {
    getSnapshot: () => snapshot,
    subscribe: (next) => {
      listener = next;
      return () => {
        listener = () => {};
      };
    },
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
  };
  return {
    source,
    publish(next: TreadmillScanSnapshot) {
      snapshot = next;
      listener();
    },
  };
}

const Preview = () => <View testID="fixture-gait-preview" />;

describe("TreadmillScanScreen", () => {
  it("guides framing, shows the live preview and exposes confidence progress", async () => {
    const { source } = scanSource({ phase: "scanning", confidence: 0.25 });

    await render(
      <TreadmillScanScreen
        source={source}
        Preview={Preview}
        onContinueHandheld={() => {}}
      />,
    );

    expect(
      screen.getByRole("header", { name: "Prop your phone and walk" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Set it upright in front of you. Angle the camera until your shoulders and hips fit in frame.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("fixture-gait-preview")).toBeOnTheScreen();
    expect(screen.getByRole("progressbar")).toHaveAccessibilityValue({
      min: 0,
      max: 100,
      now: 25,
    });
    expect(
      screen.getByText(
        "Processed on this iPhone. Nothing is recorded or sent.",
      ),
    ).toBeOnTheScreen();
  });

  it("keeps the preview visible with the specified framing failure", async () => {
    const { source, publish } = scanSource({
      phase: "scanning",
      confidence: 0,
    });
    await render(
      <TreadmillScanScreen
        source={source}
        Preview={Preview}
        onContinueHandheld={() => {}}
      />,
    );

    await act(async () => {
      publish({ phase: "needsFraming", confidence: 0 });
    });

    expect(
      screen.getByText("Can't see you — step into frame"),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("fixture-gait-preview")).toBeOnTheScreen();
  });

  it("offers the already-started handheld fallback when camera access is denied", async () => {
    const onContinueHandheld = jest.fn();
    const { source } = scanSource({
      phase: "permissionDenied",
      confidence: 0,
    });
    await render(
      <TreadmillScanScreen
        source={source}
        Preview={Preview}
        onContinueHandheld={onContinueHandheld}
      />,
    );

    expect(screen.getByText("Camera access is off")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Keep your phone with you. Walk & Scroll will verify your steps instead.",
      ),
    ).toBeOnTheScreen();
    await act(async () => {
      fireEvent.press(
        screen.getByRole("button", { name: "Continue with phone in hand" }),
      );
    });
    expect(onContinueHandheld).toHaveBeenCalledTimes(1);
  });
});
