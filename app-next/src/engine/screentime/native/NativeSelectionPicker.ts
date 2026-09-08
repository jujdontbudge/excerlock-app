import type { ScreenTimeSelectionHandle } from "../ScreenTimeModule";
import type { SelectionContents } from "../selectionSummary";

export interface NativeSelectionPicker {
  pick(
    selection: ScreenTimeSelectionHandle,
  ): Promise<SelectionContents | null>;
}

export const MISSING_NATIVE_SELECTION_PICKER: NativeSelectionPicker = {
  async pick(): Promise<never> {
    throw new Error("The native Screen Time picker host is not configured");
  },
};
