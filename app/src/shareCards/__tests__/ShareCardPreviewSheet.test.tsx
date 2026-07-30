import { fireEvent, render, screen } from "@testing-library/react-native";

import { ShareCardPreviewSheet } from "..";

const input = {
  reclaimedMinutes: 1_306,
  activeDays: 6,
  scheduledActiveDays: 7,
  earnCount: 7,
  weekDateRange: "20–26 Jul",
} as const;

function aspectRatio(): unknown {
  const style = screen.getByTestId("share-card-canvas").props.style as unknown[];
  return Object.assign({}, ...style).aspectRatio;
}

describe("ShareCardPreviewSheet", () => {
  it("toggles the preview from Story 9:16 to Feed 1:1", async () => {
    await render(
      <ShareCardPreviewSheet visible input={input} onClose={jest.fn()} />,
    );

    expect(aspectRatio()).toBe(9 / 16);
    await fireEvent.press(screen.getByRole("button", { name: "Feed · 1:1" }));
    expect(aspectRatio()).toBe(1);
    expect(screen.getByTestId("share-reclaimed")).toHaveTextContent(/^21h 46m$/);
  });

  it("closes from the sheet control", async () => {
    const onClose = jest.fn();
    await render(<ShareCardPreviewSheet visible input={input} onClose={onClose} />);

    await fireEvent.press(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
