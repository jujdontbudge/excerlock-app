jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";
import { UNLIMITED } from "@excerlock/ledger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen, within } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";

import { ManageScreen } from "../ManageScreen";

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
  settings: { kind: "rate", reward: { type: "proportionalCredit", minutesPerUnit: 0.005 } },
};

function seed(...conditions: ConfiguredCondition[]): void {
  useHomeStore.setState({ ...DEFAULT_HOME_STATE, conditions });
}

/**
 * `fireEvent.press` is async in React Native Testing Library 14 and must be
 * awaited — an un-awaited press leaves its `act` scope open and every state
 * update after it is silently dropped.
 */
async function press(name: string): Promise<void> {
  await fireEvent.press(await screen.findByRole("button", { name }));
}

async function toggle(conditionId: string, on: boolean): Promise<void> {
  await fireEvent(screen.getByTestId(`manage-toggle-${conditionId}`), "valueChange", on);
}

/** The on/off word the row shows for a condition. */
function switchLabel(conditionId: string): string | undefined {
  const row = within(screen.getByTestId(`manage-row-${conditionId}`));
  return row.getByTestId(`manage-switch-label-${conditionId}`).props.children;
}

describe("ManageScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
  });

  it("mounts schedule rules where weekly controls belong", async () => {
    await render(<ManageScreen />);

    expect(screen.getByRole("header", { name: "Your rules" })).toBeOnTheScreen();
    expect(screen.getByTestId("schedule-rules-card")).toBeOnTheScreen();
    expect(screen.getByText("Weekly schedule")).toBeOnTheScreen();
    expect(screen.getByText("Holiday dates")).toBeOnTheScreen();
    expect(screen.getByText("One-day override")).toBeOnTheScreen();
  });

  it("lists every saved condition with what it earns", async () => {
    seed(stepGoal, walking, stepsExchange);
    await render(<ManageScreen />);

    expect(screen.getAllByTestId(/^manage-row-/)).toHaveLength(3);
    expect(screen.getByText("Step goal")).toBeOnTheScreen();
    expect(screen.getByText("10,000 steps → +30 min")).toBeOnTheScreen();
    expect(screen.getByText("Unlocked while active · 2 min grace")).toBeOnTheScreen();
    expect(screen.getByText("1,000 steps = 5 min")).toBeOnTheScreen();
  });

  it("shows each condition's current enabled state", async () => {
    seed(stepGoal, walking);
    useHomeStore.getState().setConditionEnabled("c-state", false);
    await render(<ManageScreen />);

    expect(switchLabel("c-event")).toBe("On");
    expect(switchLabel("c-state")).toBe("Off");
  });

  it("switches a condition off through the store, and back on", async () => {
    seed(stepGoal);
    await render(<ManageScreen />);

    await toggle("c-event", false);

    expect(useHomeStore.getState().disabledConditionIds).toEqual(["c-event"]);
    expect(switchLabel("c-event")).toBe("Off");

    await toggle("c-event", true);

    expect(useHomeStore.getState().disabledConditionIds).toEqual([]);
    expect(switchLabel("c-event")).toBe("On");
  });

  it("reads the switch back from the store on a fresh mount", async () => {
    seed(stepGoal);
    await render(<ManageScreen />);
    await toggle("c-event", false);

    // The key forces a real remount: the switch is drawn from the store, not
    // from component state, so leaving the tab and coming back keeps it off.
    await screen.rerender(<ManageScreen key="remounted" />);

    expect(switchLabel("c-event")).toBe("Off");
  });

  it("edits a condition in Home's builder and saves it under the same id", async () => {
    seed(stepsExchange);
    await render(<ManageScreen />);

    await press("Edit Steps exchange");

    // The builder opens on its configure step with the saved ratio already in it.
    expect(screen.getByRole("header", { name: "Set it up" })).toBeOnTheScreen();
    expect(screen.getByText("5 min")).toBeOnTheScreen();

    await press("Increase minutes earned");
    await press("Choose banner");
    await press("Preview");
    await press("Save condition");

    const { conditions } = useHomeStore.getState();
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toMatchObject({
      id: "c-rate",
      settings: { kind: "rate", reward: { type: "proportionalCredit", minutesPerUnit: 0.01 } },
    });
    expect(screen.getByText("1,000 steps = 10 min")).toBeOnTheScreen();
  });

  it("leaves the condition alone when an edit is cancelled", async () => {
    seed(stepsExchange);
    await render(<ManageScreen />);

    await press("Edit Steps exchange");
    await press("Increase minutes earned");
    await press("Cancel");

    expect(useHomeStore.getState().conditions).toEqual([stepsExchange]);
    expect(screen.getByText("1,000 steps = 5 min")).toBeOnTheScreen();
  });

  it("asks before deleting, and keeps the condition when the answer is no", async () => {
    seed(stepGoal, walking);
    await render(<ManageScreen />);

    await press("Delete Step goal");

    expect(screen.getByText("Delete this condition?")).toBeOnTheScreen();

    await press("Keep");

    expect(screen.queryByText("Delete this condition?")).toBeNull();
    expect(useHomeStore.getState().conditions).toEqual([stepGoal, walking]);
  });

  it("deletes the condition once the delete is confirmed", async () => {
    seed(stepGoal, walking);
    await render(<ManageScreen />);

    await press("Delete Step goal");
    await press("Yes, delete");

    expect(useHomeStore.getState().conditions).toEqual([walking]);
    expect(screen.queryByText("Step goal")).toBeNull();
    expect(screen.getAllByTestId(/^manage-row-/)).toHaveLength(1);
  });

  it("confirms one condition at a time", async () => {
    seed(stepGoal, walking);
    await render(<ManageScreen />);

    await press("Delete Step goal");
    await press("Delete While walking");

    expect(screen.getAllByText("Delete this condition?")).toHaveLength(1);
  });

  it("points at Home's create affordance when there is nothing to manage", async () => {
    await render(<ManageScreen />);

    expect(screen.getByRole("header", { name: "Nothing to manage yet" })).toBeOnTheScreen();
    expect(screen.getByText("Build your first condition on Home — it will show up here.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Go to Home" })).toBeOnTheScreen();
    expect(screen.queryByTestId(/^manage-row-/)).toBeNull();
  });

  it("drops the empty state as soon as a condition exists", async () => {
    seed(stepGoal);
    await render(<ManageScreen />);

    expect(screen.queryByRole("header", { name: "Nothing to manage yet" })).toBeNull();
  });

  /**
   * PRD §3.15 Tab 2 and §8: the base allowance, 0–4 h in 5-minute steps plus
   * Unlimited. It writes to the one owner (#53) — Home's `ledgerConfig` — so
   * every assertion here reads the value back from there and never from a copy.
   */
  describe("the daily allowance picker", () => {
    const setAllowance = (minutes: number) =>
      useHomeStore.getState().setBaseAllowanceMinutes(minutes);

    const ownedAllowance = () =>
      useHomeStore.getState().ledgerConfig.baseAllowanceMinutes;

    it("shows the allowance the owner is holding", async () => {
      setAllowance(45);
      await render(<ManageScreen />);

      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent("45m");
    });

    it("steps the allowance up and down through the owner", async () => {
      setAllowance(30);
      await render(<ManageScreen />);

      await press("Increase daily allowance");
      expect(ownedAllowance()).toBe(35);
      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent("35m");

      await press("Decrease daily allowance");
      await press("Decrease daily allowance");
      expect(ownedAllowance()).toBe(25);
    });

    it("confirms both Full Lock directions and restores what entry replaced", async () => {
      setAllowance(5);
      await render(<ManageScreen />);

      await press("Decrease daily allowance");

      expect(ownedAllowance()).toBe(5);
      expect(screen.getByText("Turn on Full Lock?")).toBeOnTheScreen();

      await press("Yes, turn it on");

      expect(ownedAllowance()).toBe(0);
      expect(useHomeStore.getState().allowanceBeforeFullLock).toBe(5);
      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent("Full Lock");

      await press("Increase daily allowance");

      expect(ownedAllowance()).toBe(0);
      expect(screen.getByText("Turn off Full Lock?")).toBeOnTheScreen();

      await press("Yes, turn it off");

      expect(ownedAllowance()).toBe(5);
      expect(useHomeStore.getState().allowanceBeforeFullLock).toBeNull();
    });

    it("offers Unlimited one step past four hours", async () => {
      setAllowance(240);
      await render(<ManageScreen />);

      await press("Increase daily allowance");

      expect(ownedAllowance()).toBe(UNLIMITED);
      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent(
        "Unlimited",
      );
    });

    it("keeps the chosen allowance across a remount", async () => {
      setAllowance(0);
      await render(<ManageScreen />);
      await press("Increase daily allowance");
      await press("Yes, turn it off");

      // A `key` forces a real remount rather than `unmount()` + `render()`,
      // which would detach `screen` for every test after this one (README).
      await screen.rerender(<ManageScreen key="remounted" />);

      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent(
        "Unlimited",
      );
      expect(ownedAllowance()).toBe(UNLIMITED);
    });

    it("is offered before any condition exists — the allowance is not a condition", async () => {
      await render(<ManageScreen />);

      expect(screen.getByRole("header", { name: "Nothing to manage yet" })).toBeOnTheScreen();
      expect(
        screen.getByRole("button", { name: "Increase daily allowance" }),
      ).toBeOnTheScreen();
    });
  });
});
