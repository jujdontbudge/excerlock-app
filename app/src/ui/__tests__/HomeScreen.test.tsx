import { fireEvent, render, screen } from "@testing-library/react-native";

import { HomeScreen } from "..";

describe("HomeScreen", () => {
  it("starts empty — no condition exists until the user builds one", async () => {
    await render(<HomeScreen />);

    expect(screen.getByRole("header", { name: "No conditions yet" })).toBeOnTheScreen();
    expect(screen.queryByTestId("condition-card")).toBeNull();
  });

  it("offers the create-your-first-condition affordance", async () => {
    const onCreateFirstCondition = jest.fn();
    await render(<HomeScreen onCreateFirstCondition={onCreateFirstCondition} />);

    fireEvent.press(screen.getByRole("button", { name: "Create your first condition" }));

    expect(onCreateFirstCondition).toHaveBeenCalledTimes(1);
  });
});
