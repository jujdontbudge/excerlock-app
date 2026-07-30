import { render, screen } from "@testing-library/react-native";

import {
  createRecapShareCardInput,
  RecapShareCard,
  type ShareCardRatio,
} from "..";

const input = createRecapShareCardInput({
  reclaimedMinutes: 1_306,
  activeDays: 6,
  scheduledActiveDays: 7,
  earnCount: 7,
  weekDateRange: "20–26 Jul",
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

describe("RecapShareCard", () => {
  it.each<[ShareCardRatio, number]>([
    ["story", 9 / 16],
    ["feed", 1],
  ])("renders the three recap facts and branding in %s ratio", async (ratio, aspectRatio) => {
    await render(<RecapShareCard input={input} ratio={ratio} />);

    expect(flatten(screen.getByTestId("share-card-canvas").props.style).aspectRatio).toBe(
      aspectRatio,
    );
    expect(screen.getByTestId("share-reclaimed")).toHaveTextContent(/^21h 46m$/);
    expect(screen.getByTestId("share-active-days")).toHaveTextContent(/^6 of 7 active days$/);
    expect(screen.getByTestId("share-earn-count")).toHaveTextContent(/^7 earns$/);
    expect(screen.getByText("20–26 Jul")).toBeOnTheScreen();
    expect(screen.getByText("ExcerLock")).toBeOnTheScreen();
    expect(screen.queryByText(/most from|gym visit/i)).toBeNull();
  });

  it("calls a week with no scheduled active days a Rest week", async () => {
    await render(
      <RecapShareCard
        input={createRecapShareCardInput({
          reclaimedMinutes: 420,
          activeDays: 0,
          scheduledActiveDays: 0,
          earnCount: 0,
          weekDateRange: "20–26 Jul",
        })}
        ratio="feed"
      />,
    );

    expect(screen.getByTestId("share-active-days")).toHaveTextContent(/^Rest week$/);
    expect(screen.queryByText(/0 of 0/)).toBeNull();
  });
});
