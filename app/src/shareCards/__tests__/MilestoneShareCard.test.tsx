import { render, screen } from "@testing-library/react-native";

import {
  createMilestoneShareCardInput,
  MilestoneShareCard,
  type ShareCardRatio,
} from "..";

const input = createMilestoneShareCardInput({
  milestoneName: "30-Day Streak",
  achievementNumber: 30,
  unlockMonth: "July 2026",
});

function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (all, part) => ({ ...all, ...flatten(part) }),
      {},
    );
  }
  return (style ?? {}) as Record<string, unknown>;
}

describe("MilestoneShareCard", () => {
  it.each<[ShareCardRatio, number]>([
    ["story", 9 / 16],
    ["feed", 1],
  ])("renders only the decided milestone content in %s ratio", async (ratio, aspectRatio) => {
    await render(
      <MilestoneShareCard
        input={input}
        ratio={ratio}
        badgeArt={{ uri: "test://approved-badge.png" }}
      />,
    );

    expect(flatten(screen.getByTestId("share-card-canvas").props.style).aspectRatio).toBe(
      aspectRatio,
    );
    expect(screen.getByTestId("milestone-badge-art")).toBeOnTheScreen();
    expect(screen.getByText("30-Day Streak")).toBeOnTheScreen();
    expect(screen.getByText(/^30$/)).toBeOnTheScreen();
    expect(screen.getByText("July 2026")).toBeOnTheScreen();
    expect(screen.getByText("ExcerLock")).toBeOnTheScreen();
    expect(screen.queryByText(/user|gym|location|app|health/i)).toBeNull();
  });
});
