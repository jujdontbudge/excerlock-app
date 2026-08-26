jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { HarnessBuildRoot } from "../HarnessBuildRoot";

describe("HarnessBuildRoot", () => {
  it("mounts neither runtime before selection and never mounts product runtime in harness mode", async () => {
    const productMounted = jest.fn();
    function ProductRuntime() {
      productMounted();
      return <Text>Product runtime</Text>;
    }

    await render(<HarnessBuildRoot productRuntime={<ProductRuntime />} />);

    expect(screen.getByText("Choose a mode")).toBeOnTheScreen();
    expect(productMounted).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Test harness"));

    expect(screen.getByText("Physical test tasks")).toBeOnTheScreen();
    expect(screen.getAllByText("declare-truth")).not.toHaveLength(0);
    expect(productMounted).not.toHaveBeenCalled();
  });

  it("can enter the product without rebuilding", async () => {
    await render(
      <HarnessBuildRoot productRuntime={<Text>Product runtime</Text>} />,
    );

    await fireEvent.press(screen.getByText("Real app"));

    expect(screen.getByText("Product runtime")).toBeOnTheScreen();
  });
});
