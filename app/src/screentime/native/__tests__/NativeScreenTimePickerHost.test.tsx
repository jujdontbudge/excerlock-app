import { act, render, waitFor } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import type {
  DeviceActivitySelectionSheetViewPersisted,
} from "react-native-device-activity";

import type { ScreenTimeSelectionHandle } from "../../ScreenTimeModule";
import {
  NativeScreenTimePickerCoordinator,
  NativeScreenTimePickerHost,
} from "../NativeScreenTimePickerHost";

type PickerProps = ComponentProps<
  typeof DeviceActivitySelectionSheetViewPersisted
>;

let pickerProps: PickerProps | null = null;

jest.mock("react-native-device-activity", () => {
  const React = require("react");
  return {
    DeviceActivitySelectionSheetViewPersisted: (props: PickerProps) => {
      pickerProps = props;
      return React.createElement("NativeFamilyActivityPicker");
    },
  };
});

describe("NativeScreenTimePickerHost", () => {
  beforeEach(() => {
    pickerProps = null;
  });

  it("round-trips only a persisted selection id and count metadata", async () => {
    const picker = new NativeScreenTimePickerCoordinator();
    await render(<NativeScreenTimePickerHost picker={picker} />);
    const handle =
      "excerlock.selection.locked.v1" as ScreenTimeSelectionHandle;

    let picked!: ReturnType<NativeScreenTimePickerCoordinator["pick"]>;
    await act(() => {
      picked = picker.pick(handle);
    });

    await waitFor(() => {
      expect(pickerProps?.familyActivitySelectionId).toBe(handle);
      expect(pickerProps?.includeEntireCategory).toBe(false);
    });
    await act(() => {
      pickerProps!.onSelectionChange?.({
        nativeEvent: {
          applicationCount: 4,
          categoryCount: 2,
          webDomainCount: 0,
          includeEntireCategory: false,
        },
      } as Parameters<NonNullable<PickerProps["onSelectionChange"]>>[0]);
      pickerProps!.onDismissRequest?.({
        nativeEvent: {},
      } as Parameters<NonNullable<PickerProps["onDismissRequest"]>>[0]);
    });

    await expect(picked).resolves.toEqual({
      applicationCount: 4,
      categoryCount: 2,
    });
  });
});
