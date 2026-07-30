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

  it("lets the user add and remove a planned holiday date range", async () => {
    await render(<ScheduleRulesCard />);

    await fireEvent.changeText(
      screen.getByLabelText("Holiday start date"),
      "2026-12-30",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Holiday end date"),
      "2027-01-02",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Add holiday" }),
    );

    expect(useScheduleStore.getState().holidays).toEqual([
      { startDayIndex: 20_817, endDayIndex: 20_820 },
    ]);
    expect(screen.getByText("2026-12-30 – 2027-01-02")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", {
        name: "Remove holiday 2026-12-30 to 2027-01-02",
      }),
    );

    expect(useScheduleStore.getState().holidays).toEqual([]);
  });

  it("lets one date override its normal rule in either direction", async () => {
    await render(<ScheduleRulesCard />);

    await fireEvent.changeText(
      screen.getByLabelText("Override date"),
      "2026-12-31",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Make this date rest" }),
    );

    expect(useScheduleStore.getState().overrides).toEqual([
      { dayIndex: 20_818, direction: "rest" },
    ]);

    await fireEvent.changeText(
      screen.getByLabelText("Override date"),
      "2026-12-31",
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Make this date active" }),
    );

    expect(useScheduleStore.getState().overrides).toEqual([
      { dayIndex: 20_818, direction: "active" },
    ]);
    expect(screen.getByText("2026-12-31 · Active override")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", {
        name: "Remove override for 2026-12-31",
      }),
    );

    expect(useScheduleStore.getState().overrides).toEqual([]);
  });
});
