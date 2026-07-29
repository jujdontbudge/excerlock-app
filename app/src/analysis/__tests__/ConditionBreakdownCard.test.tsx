import { render, screen } from "@testing-library/react-native";

import { ConditionBreakdownCard } from "../components/ConditionBreakdownCard";

describe("ConditionBreakdownCard", () => {
  it("shows what each condition banked in the window", async () => {
    await render(
      <ConditionBreakdownCard
        caption="This week"
        items={[
          {
            conditionId: "gym",
            name: "Gym visit",
            status: "recorded",
            earnedMinutes: 135,
          },
          {
            conditionId: "standing",
            name: "Standing desk",
            status: "recorded",
            earnedMinutes: 0,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("condition-earning-gym")).toHaveTextContent(
      /^Gym visit2h 15m$/,
    );
    expect(screen.getByTestId("condition-earning-standing")).toHaveTextContent(
      /^Standing desk0m$/,
    );
  });

  it("renders missing historical attribution as not recorded, never as zero", async () => {
    await render(
      <ConditionBreakdownCard
        caption="This week"
        items={[
          {
            conditionId: "legacy-gym",
            name: "Gym visit",
            status: "notRecorded",
            earnedMinutes: null,
          },
          {
            conditionId: "walking",
            name: "While walking",
            status: "recorded",
            earnedMinutes: 0,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("condition-earning-legacy-gym")).toHaveTextContent(
      /^Gym visitnot recorded$/,
    );
    expect(screen.getByTestId("condition-earning-walking")).toHaveTextContent(
      /^While walking0m$/,
    );
  });

  it("has an honest empty state when no condition appears in the window", async () => {
    await render(<ConditionBreakdownCard caption="This week" items={[]} />);

    expect(
      screen.getByRole("header", { name: "No condition earnings yet" }),
    ).toBeOnTheScreen();
    expect(screen.getByText(/banks time/)).toBeOnTheScreen();
  });
});
