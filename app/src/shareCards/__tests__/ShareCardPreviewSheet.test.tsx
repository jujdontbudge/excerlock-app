import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { createRecapShareCardInput, ShareCardPreviewSheet } from "..";
import { MockShareCardModule } from "../MockShareCardModule";

const input = createRecapShareCardInput({
  reclaimedMinutes: 1_306,
  activeDays: 6,
  scheduledActiveDays: 7,
  earnCount: 7,
  weekDateRange: "20–26 Jul",
});

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

  it("captures the selected format and hands its file to the mocked share seam", async () => {
    const module = new MockShareCardModule();
    await render(
      <ShareCardPreviewSheet
        visible
        input={input}
        module={module}
        onClose={jest.fn()}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Feed · 1:1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Share card" }));

    await waitFor(() => {
      expect(module.getCapturedCards()).toHaveLength(1);
      expect(module.getPresentedCards()).toHaveLength(1);
    });
    expect(module.getCapturedCards()[0]).toMatchObject({
      template: "recap",
      ratio: "feed",
      width: 1_080,
      height: 1_080,
    });
    expect(screen.getByText("Prepared with the local share mock.")).toBeOnTheScreen();
  });
});
