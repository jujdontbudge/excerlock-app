jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { HarnessBuildRoot } from "../HarnessBuildRoot";

describe("HarnessBuildRoot", () => {
  it("lands on the task list, so a test build is never one mistaken tap from the product", async () => {
    const productMounted = jest.fn();
    function ProductRuntime() {
      productMounted();
      return <Text>Product runtime</Text>;
    }

    await render(<HarnessBuildRoot productRuntime={<ProductRuntime />} />);

    expect(screen.getByText("Physical test tasks")).toBeOnTheScreen();
    expect(screen.getAllByText("Open ›").length).toBeGreaterThan(0);
    expect(productMounted).not.toHaveBeenCalled();
  });

  it("can still enter the product without rebuilding", async () => {
    await render(
      <HarnessBuildRoot productRuntime={<Text>Product runtime</Text>} />,
    );

    await fireEvent.press(screen.getByText("Real app"));

    expect(screen.getByText("Product runtime")).toBeOnTheScreen();
  });

  it("returns to the harness from the product", async () => {
    await render(
      <HarnessBuildRoot productRuntime={<Text>Product runtime</Text>} />,
    );

    await fireEvent.press(screen.getByText("Real app"));
    await fireEvent.press(screen.getByText("Test harness"));

    expect(screen.getByText("Physical test tasks")).toBeOnTheScreen();
    expect(screen.queryByText("Product runtime")).not.toBeOnTheScreen();
  });
});
