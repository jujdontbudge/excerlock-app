import type {
  CurrentShieldState,
  ScreenTimeSelectionHandle,
  ScreenTimeSelectionSummary,
} from "@/screentime";

import { deriveLockStatus, type LockStatusInput } from "../lockStatus";

const HANDLE = "selection-1" as ScreenTimeSelectionHandle;

const SELECTION: ScreenTimeSelectionSummary = {
  handle: HANDLE,
  displayName: "4 apps · 2 categories",
  applicationCount: 4,
  categoryCount: 2,
};

function shield(
  overrides: Partial<CurrentShieldState> = {},
): CurrentShieldState {
  return {
    selection: HANDLE,
    desiredOsState: { shields: "up", drainThresholds: [] },
    effectiveShields: "up",
    activeLockWindowId: null,
    ...overrides,
  };
}

function input(overrides: Partial<LockStatusInput> = {}): LockStatusInput {
  return {
    shield: shield(),
    lockWindows: [],
    selection: SELECTION,
    fullLock: false,
    atMs: 0,
    ...overrides,
  };
}

/** 09:30 on the wall clock of an arbitrary day, in the ledger's local-ms space. */
const DAY = 86_400_000;
const at = (hours: number, minutes = 0) =>
  10 * DAY + hours * 3_600_000 + minutes * 60_000;

describe("deriveLockStatus", () => {
  it("asks for a selection before it claims anything is shielded", () => {
    const model = deriveLockStatus(input({ selection: null }));

    expect(model.status).toBe("unconfigured");
    expect(model.scope).toBe("No apps chosen yet");
    expect(model.nextChange).toBe("Choose your apps to start.");
  });

  it("names the shielded group from the boundary's own display line", () => {
    expect(deriveLockStatus(input()).scope).toBe("4 apps · 2 categories");
  });

  it("reads an empty balance as time's up, not as a scolding", () => {
    const model = deriveLockStatus(input());

    expect(model.status).toBe("locked");
    expect(model.headline).toBe("Time's up — for now.");
    expect(model.reason).toBe("Today's balance is empty.");
    expect(model.nextChange).toBe("Earn more time to open them.");
  });

  it("distinguishes Full Lock from a balance that ran out", () => {
    const model = deriveLockStatus(input({ fullLock: true }));

    expect(model.headline).toBe("Move first, scroll after.");
    expect(model.reason).toBe("Full Lock is on — your day starts at zero.");
    expect(model.nextChange).toBe("Your first earn today opens them.");
  });

  it("says when an active lock window lifts", () => {
    const model = deriveLockStatus(
      input({
        atMs: at(23, 30),
        shield: shield({ activeLockWindowId: "night" }),
        lockWindows: [
          { id: "night", startsAtMs: at(22), endsAtMs: at(31) },
        ],
      }),
    );

    expect(model.headline).toBe("Apps are asleep.");
    expect(model.reason).toBe("A lock window is running.");
    expect(model.nextChange).toBe("Back at 7:00 AM.");
  });

  it("falls back gracefully when the active window is no longer registered", () => {
    const model = deriveLockStatus(
      input({ shield: shield({ activeLockWindowId: "vanished" }) }),
    );

    expect(model.reason).toBe("A lock window is running.");
    expect(model.nextChange).toBe("When the lock window ends.");
  });

  it("counts down to the next window while the apps are open", () => {
    const model = deriveLockStatus(
      input({
        atMs: at(9),
        shield: shield({
          effectiveShields: "down",
          desiredOsState: { shields: "down", drainThresholds: [] },
        }),
        lockWindows: [
          { id: "night", startsAtMs: at(22), endsAtMs: at(31) },
          { id: "past", startsAtMs: at(1), endsAtMs: at(2) },
        ],
      }),
    );

    expect(model.status).toBe("unlocked");
    expect(model.headline).toBe("Your apps are open.");
    expect(model.nextChange).toBe("They sleep at 10:00 PM.");
  });

  it("says nothing is scheduled when no window lies ahead", () => {
    const model = deriveLockStatus(
      input({
        shield: shield({
          effectiveShields: "down",
          desiredOsState: { shields: "down", drainThresholds: [] },
        }),
      }),
    );

    expect(model.nextChange).toBe("Nothing is scheduled to lock them.");
  });

  it("credits an earn that beat Full Lock", () => {
    const model = deriveLockStatus(
      input({
        fullLock: true,
        shield: shield({
          effectiveShields: "down",
          desiredOsState: { shields: "down", drainThresholds: [] },
        }),
      }),
    );

    expect(model.status).toBe("unlocked");
    expect(model.reason).toBe("Full Lock is on, and you have already earned today.");
  });
});
