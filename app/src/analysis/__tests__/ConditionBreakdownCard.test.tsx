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
});
