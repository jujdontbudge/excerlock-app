import { appendEntries, emptyJournal, UNLIMITED, type Journal, type LedgerConfig } from "@excerlock/ledger";

import { deriveLockHero } from "../lockState";

const FULL_LOCK: LedgerConfig = {
  dayBoundaryOffsetMinutes: 0,
  baseAllowanceMinutes: 0,
  rollover: null,
};

const DAY_START = 0;
const NOON = 12 * 60 * 60 * 1_000;

function journalWith(...entries: Parameters<typeof appendEntries>[1]): Journal {
  return appendEntries(emptyJournal(), entries).journal;
}

describe("deriveLockHero", () => {
  it("locks an empty day under Full Lock", () => {
    const hero = deriveLockHero({
      journal: emptyJournal(),
      config: FULL_LOCK,
      atMs: NOON,
      liveStates: [],
    });

    expect(hero.status).toBe("locked");
    expect(hero.balanceMinutes).toBe(0);
    expect(hero.balance).toEqual({ value: "0", unit: "min left" });
    expect(hero.headline).toBe("Apps are locked");
    expect(hero.detail).toBe("Earn time to unlock your apps");
  });

  it("unlocks once an event condition has banked time", () => {
    const hero = deriveLockHero({
      journal: journalWith({
        kind: "earn",
        source: "home",
        id: "gym-1",
        atMs: DAY_START + 60_000,
        conditionId: "c1",
        payout: { type: "fixedChunk", minutes: 30 },
      }),
      config: FULL_LOCK,
      atMs: NOON,
      liveStates: [],
    });

    expect(hero.status).toBe("unlocked");
    expect(hero.balanceMinutes).toBe(30);
    expect(hero.detail).toBe("30m of screen time left");
  });

  it("reports today's earned and spent minutes for the stats row", () => {
    const hero = deriveLockHero({
      journal: journalWith(
        {
          kind: "earn",
          source: "home",
          id: "gym-1",
          atMs: DAY_START + 60_000,
          conditionId: "c1",
          payout: { type: "fixedChunk", minutes: 30 },
        },
        { kind: "drainTick", source: "screentime", id: "tick-1", atMs: DAY_START + 120_000, minutes: 10 },
      ),
      config: FULL_LOCK,
      atMs: NOON,
      liveStates: [],
    });

    expect(hero.earnedLabel).toBe("30m");
    expect(hero.spentLabel).toBe("10m");
    expect(hero.balanceMinutes).toBe(20);
  });

  it("stays unlocked while a state condition holds, even at a zero balance", () => {
    const hero = deriveLockHero({
      journal: emptyJournal(),
      config: FULL_LOCK,
      atMs: NOON,
      liveStates: [{ conditionId: "c2", name: "While walking" }],
    });

    expect(hero.status).toBe("unlocked");
    expect(hero.balanceMinutes).toBe(0);
    expect(hero.detail).toBe("While walking is holding your apps open");
  });

  it("aggregates several live states into one line", () => {
    const hero = deriveLockHero({
      journal: emptyJournal(),
      config: FULL_LOCK,
      atMs: NOON,
      liveStates: [
        { conditionId: "c2", name: "While walking" },
        { conditionId: "c3", name: "Be at the gym" },
      ],
    });

    expect(hero.detail).toBe("2 conditions are holding your apps open");
  });

  it("reads a rest-of-day payout as a shield holiday, not as balance", () => {
    const hero = deriveLockHero({
      journal: journalWith({
        kind: "earn",
        source: "home",
        id: "run-1",
        atMs: DAY_START + 60_000,
        conditionId: "c4",
        payout: { type: "restOfDay" },
      }),
      config: FULL_LOCK,
      atMs: NOON,
      liveStates: [],
    });

    expect(hero.status).toBe("unlocked");
    expect(hero.balanceMinutes).toBe(0);
    expect(hero.detail).toBe("Unlocked for the rest of the day");
  });

  it("shows an unset allowance as unlimited", () => {
    const hero = deriveLockHero({
      journal: emptyJournal(),
      config: { ...FULL_LOCK, baseAllowanceMinutes: UNLIMITED },
      atMs: NOON,
      liveStates: [],
    });

    expect(hero.status).toBe("unlocked");
    expect(hero.balance).toEqual({ value: "∞", unit: "no limit set" });
    expect(hero.detail).toBe("No daily allowance set yet");
  });
});
