jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";
import { remainingMinutes } from "@excerlock/ledger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";

import { AccountSettingsCard } from "../AccountSettingsCard";
import { MockAccountModule } from "../MockAccountModule";

describe("AccountSettingsCard", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
  });

  it("renders signed out without implying core features are gated", async () => {
    await render(
      <AccountSettingsCard account={new MockAccountModule()} />,
    );

    expect(await screen.findByText("Signed out")).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your conditions, earning history, and locks stay on this device.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("renders loading until the persistent session is hydrated", async () => {
    let finishHydration: (value: string | null) => void = () => undefined;
    const storage = {
      getItem: () =>
        new Promise<string | null>((resolve) => {
          finishHydration = resolve;
        }),
      setItem: async () => undefined,
      removeItem: async () => undefined,
    };
    const account = new MockAccountModule({ storage });

    await render(<AccountSettingsCard account={account} />);

    expect(screen.getByText("Loading account…")).toBeOnTheScreen();

    await act(async () => {
      finishHydration(null);
    });
    expect(await screen.findByText("Signed out")).toBeOnTheScreen();
  });

  it("renders an authentication error and keeps both intents retryable", async () => {
    const account = new MockAccountModule();
    account.setNextSignInResult({
      status: "failed",
      message: "Sign in is temporarily unavailable.",
    });
    await render(<AccountSettingsCard account={account} />);
    await screen.findByText("Signed out");

    await fireEvent.press(screen.getByRole("button", { name: "Sign in" }));

    expect(
      screen.getByRole("alert", {
        name: "Sign in is temporarily unavailable.",
      }),
    ).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });

  it("renders the signed-in identity and session controls", async () => {
    const account = new MockAccountModule();
    await account.signUp();

    await render(<AccountSettingsCard account={account} />);

    expect(await screen.findByText("Signed in")).toBeOnTheScreen();
    expect(screen.getByText("new-member@excerlock.test")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Delete account" }),
    ).toBeEnabled();
  });

  it("explains deletion consequences and lets the user cancel", async () => {
    const account = new MockAccountModule();
    await account.signUp();
    await render(<AccountSettingsCard account={account} />);
    await screen.findByText("Signed in");

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account" }),
    );

    expect(
      screen.getByRole("header", { name: "Delete your account forever?" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Your Clerk account and ExcerLock server record will be permanently deleted. Adapty and PostHog erasure will be scheduled.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "All on-device data—including conditions, earning history, lock choices, and settings—remains on this device.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        "Deleting your account does not cancel an App Store subscription.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText("This cannot be undone.")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "Keep my account" }),
    );

    expect(
      screen.queryByRole("header", { name: "Delete your account forever?" }),
    ).not.toBeOnTheScreen();
    expect((await account.getSnapshot()).session.status).toBe("signedIn");
  });

  it("deletes only after confirmation and leaves local earns on device", async () => {
    const account = new MockAccountModule();
    const condition: ConfiguredCondition = {
      id: "deletion-local-earn",
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
    const atMs = 12 * 60 * 60 * 1_000;
    await account.signUp();
    useHomeStore.getState().addCondition(condition);
    useHomeStore.getState().recordEventPayout(condition.id, atMs);
    await render(<AccountSettingsCard account={account} />);
    await screen.findByText("Signed in");

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account" }),
    );
    expect((await account.getSnapshot()).session.status).toBe("signedIn");

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account forever" }),
    );

    expect(await screen.findByText("Signed out")).toBeOnTheScreen();
    const { journal, ledgerConfig } = useHomeStore.getState();
    expect(remainingMinutes(journal, ledgerConfig, atMs)).toBe(30);
  });

  it("clears the deletion confirmation after deleting the account", async () => {
    const account = new MockAccountModule();
    await account.signUp();
    await render(<AccountSettingsCard account={account} />);
    await screen.findByText("Signed in");

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account" }),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete account forever" }),
    );
    await screen.findByText("Signed out");

    await fireEvent.press(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByText("Signed in")).toBeOnTheScreen();
    expect(
      screen.queryByRole("header", {
        name: "Delete your account forever?",
      }),
    ).not.toBeOnTheScreen();
  });
});
