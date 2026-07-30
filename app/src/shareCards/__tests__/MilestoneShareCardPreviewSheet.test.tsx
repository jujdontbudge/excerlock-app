import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import {
  createMilestoneShareCardInput,
  MilestoneShareCardPreviewSheet,
  MockShareCardModule,
} from "..";

const input = createMilestoneShareCardInput({
  milestoneName: "30-Day Streak",
  achievementNumber: 30,
  unlockMonth: "July 2026",
});

describe("MilestoneShareCardPreviewSheet", () => {
  it("opens a milestone preview without automatically sharing it", async () => {
    const shareCards = new MockShareCardModule();

    await render(
      <MilestoneShareCardPreviewSheet
        visible
        badgeArt={1}
        input={input}
        shareCardModule={shareCards}
        onClose={jest.fn()}
      />,
    );

    expect(
      screen.getByRole("header", { name: "Share your milestone" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("30-Day Streak")).toBeOnTheScreen();
    expect(shareCards.getCapturedCards()).toEqual([]);
    expect(shareCards.getPresentedCards()).toEqual([]);

    await fireEvent.press(screen.getByRole("button", { name: "Feed · 1:1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Share card" }));

    await waitFor(() => {
      expect(shareCards.getCapturedCards()).toHaveLength(1);
      expect(shareCards.getPresentedCards()).toHaveLength(1);
    });
    expect(shareCards.getCapturedCards()[0]).toMatchObject({
      template: "milestone",
      ratio: "feed",
    });
  });
});
