jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ScheduleRulesCard } from "../components/ScheduleRulesCard";
import { ALL_DAYS_ACTIVE } from "../model/scheduleRules";
import { useScheduleStore } from "../store/scheduleStore";

describe("ScheduleRulesCard", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useScheduleStore.setState(ALL_DAYS_ACTIVE);
  });

  it("lets the user make Sunday a recurring rest day", async () => {
    await render(<ScheduleRulesCard />);

    expect(screen.getByTestId("schedule-weekday-status-0")).toHaveTextContent(
      "Active",
    );

    await fireEvent(
      screen.getByLabelText("Sunday rest day"),
      "valueChange",
      true,
    );

    expect(useScheduleStore.getState().recurringRestWeekdays).toEqual([0]);
    expect(screen.getByTestId("schedule-weekday-status-0")).toHaveTextContent(
      "Rest",
    );
  });
});
