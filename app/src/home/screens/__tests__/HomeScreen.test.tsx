jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { stubFeed } from "../../testing/stubFeed";
import { DEFAULT_HOME_STATE, useHomeStore } from "../../store/homeStore";
import { HomeScreen } from "../HomeScreen";

const NOON = 12 * 60 * 60 * 1_000;
const now = () => NOON;

const stepGoal: ConfiguredCondition = {
  id: "c-event",
  catalogId: "steps-goal",
  source: "appleHealth",
  settings: {
    kind: "event",
    threshold: 10_000,
    reward: { type: "fixedMinutes", minutes: 30 },
    repeatable: false,
    perDayCap: null,
    cooldownMs: 0,
  },
};

const walking: ConfiguredCondition = {
  id: "c-state",
  catalogId: "walking-state",
  source: "motion",
  settings: { kind: "state", reward: { type: "sustainedUnlock" }, exitGraceMs: 120_000 },
};

const stepsExchange: ConfiguredCondition = {
  id: "c-rate",
  catalogId: "steps-rate",
  source: "appleHealth",
  settings: { kind: "rate", reward: { type: "proportionalCredit", minutesPerUnit: 0.02 } },
};

function seed(...conditions: ConfiguredCondition[]): void {
  useHomeStore.setState({ ...DEFAULT_HOME_STATE, conditions });
}

/**
 * Wait for the button to exist and press it. `fireEvent.press` is async in
 * React Native Testing Library 14 — an un-awaited press leaves its `act` scope
 * open and every dispatch after it is dropped.
 */
async function press(name: string): Promise<void> {
  await fireEvent.press(await screen.findByRole("button", { name }));
}

describe("HomeScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
  });

  it("starts empty — no condition exists until the user builds one", async () => {
    await render(<HomeScreen feed={stubFeed()} now={now} />);

    expect(screen.getByRole("header", { name: "No conditions yet" })).toBeOnTheScreen();
    expect(screen.queryByTestId("condition-card")).toBeNull();
    expect(screen.queryByTestId("lock-hero-locked")).toBeNull();
  });

  it("opens the builder from the empty state", async () => {
    await render(<HomeScreen feed={stubFeed()} now={now} />);

    await press("Create your first condition");

    expect(screen.getByRole("header", { name: "Pick a condition" })).toBeOnTheScreen();
  });

  it("shows a locked hero at a zero balance once a condition exists", async () => {
    seed(stepGoal);
    useHomeStore.getState().setBaseAllowanceMinutes(0);
    await render(<HomeScreen feed={stubFeed()} now={now} />);

    expect(screen.getByTestId("lock-hero-locked")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Apps are locked" })).toBeOnTheScreen();
    expect(screen.getByTestId("lock-hero-balance")).toHaveTextContent("0");
    expect(screen.getByText("Earn time to unlock your apps")).toBeOnTheScreen();
  });

  it("unlocks the hero when a state condition is live", async () => {
    seed(walking);
    await render(
      <HomeScreen feed={stubFeed({ totals: {}, activeSignals: ["walking"] })} now={now} />,
    );

    expect(screen.getByTestId("lock-hero-unlocked")).toBeOnTheScreen();
    expect(screen.getByText("While walking is holding your apps open")).toBeOnTheScreen();
    expect(screen.getByText("Active · apps unlocked")).toBeOnTheScreen();
  });

  it("renders one card per condition in its kind's variant", async () => {
    seed(stepGoal, walking, stepsExchange);
    await render(
      <HomeScreen feed={stubFeed({ totals: { steps: 6_240 }, activeSignals: [] })} now={now} />,
    );

    expect(screen.getAllByTestId("condition-card")).toHaveLength(3);
    expect(screen.getByText("6,240 of 10,000 steps")).toBeOnTheScreen();
    expect(screen.getByText("Waiting to start")).toBeOnTheScreen();
    expect(screen.getByText("6,240 steps → 2h 4m banked today")).toBeOnTheScreen();
  });

  it("leaves a condition switched off in Manage off the dashboard", async () => {
    seed(stepGoal, walking);
    useHomeStore.getState().setConditionEnabled("c-event", false);
    await render(
      <HomeScreen feed={stubFeed({ totals: { steps: 6_240 }, activeSignals: [] })} now={now} />,
    );

    expect(screen.getAllByTestId("condition-card")).toHaveLength(1);
    expect(screen.queryByText("6,240 of 10,000 steps")).toBeNull();
  });

  it("banks an event's payout in place and never reverses the card", async () => {
    seed(stepGoal);
    useHomeStore.getState().setBaseAllowanceMinutes(0);
    await render(<HomeScreen feed={stubFeed()} now={now} />);

    await press("Complete");

    expect(screen.getByRole("button", { name: "✓ Completed" })).toBeOnTheScreen();
    expect(screen.getByTestId("lock-hero-unlocked")).toBeOnTheScreen();
    expect(screen.getByTestId("lock-hero-balance")).toHaveTextContent("30");
    expect(screen.getByText("Earned today")).toBeOnTheScreen();
  });

  it("offers the Edit and Analysis shortcuts once there is a dashboard", async () => {
    seed(stepGoal);
    await render(<HomeScreen feed={stubFeed()} now={now} />);

    expect(screen.getByRole("button", { name: "Edit" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Analysis" })).toBeOnTheScreen();
  });

  it("saves a condition built in the sheet onto the dashboard", async () => {
    await render(<HomeScreen feed={stubFeed()} now={now} />);

    await press("Create your first condition");
    await press("Steps exchange");
    await press("Increase minutes earned");
    await press("Preview");
    await press("Save condition");

    expect(useHomeStore.getState().conditions).toHaveLength(1);
    expect(screen.getByText("1,000 steps = 5 min")).toBeOnTheScreen();
  });
});
