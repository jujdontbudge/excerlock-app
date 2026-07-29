import { NOTIFICATION_TYPE_IDS } from "../model/catalog";
import {
  BANNED_COPY_WORDS,
  MAX_BODY_LENGTH,
  MAX_TITLE_LENGTH,
  afternoonNudgeContent,
  notificationContent,
  streakLastCallContent,
  violatesCopyVoice,
  weeklyRecapContent,
} from "../model/copy";

const SAMPLE_FACTS = {
  reclaimedMinutesThisWeek: 380,
  streakDays: 12,
};

describe("notification copy", () => {
  it("is the PRD's canonical nudge line", () => {
    expect(afternoonNudgeContent()).toEqual({
      title: "Your screen time is waiting",
      body: "A quick workout unlocks your apps for tonight.",
    });
  });

  it("puts the week's live number in the recap title", () => {
    expect(weeklyRecapContent(380)).toEqual({
      title: "You reclaimed 6h 20m this week",
      body: "See your week + grab your share card.",
    });
  });

  it("reads the recap number from the week, not from a fixture", () => {
    expect(weeklyRecapContent(45).title).toBe("You reclaimed 45m this week");
    expect(weeklyRecapContent(120).title).toBe("You reclaimed 2h this week");
    expect(weeklyRecapContent(0).title).toBe("You reclaimed 0m this week");
  });

  it("puts the live streak length in the last-call title", () => {
    expect(streakLastCallContent(12)).toEqual({
      title: "12-day streak on the line",
      body: "There's still time today — one workout keeps it alive.",
    });
    expect(streakLastCallContent(1).title).toBe("1-day streak on the line");
  });

  it("composes every type's content from one entry point", () => {
    for (const id of NOTIFICATION_TYPE_IDS) {
      const content = notificationContent(id, SAMPLE_FACTS);
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.body.length).toBeGreaterThan(0);
    }
  });
});

describe("the sells-not-scolds voice, enforced", () => {
  it("keeps every canonical line inside the PRD's character budget", () => {
    for (const id of NOTIFICATION_TYPE_IDS) {
      const { title, body } = notificationContent(id, SAMPLE_FACTS);
      expect(title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
      expect(body.length).toBeLessThanOrEqual(MAX_BODY_LENGTH);
    }
  });

  it("survives the longest number a live title can carry", () => {
    const longest = notificationContent("weeklyRecap", {
      reclaimedMinutesThisWeek: 60 * 999 + 59,
      streakDays: 9999,
    });
    expect(longest.title.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
    expect(
      streakLastCallContent(9999).title.length,
    ).toBeLessThanOrEqual(MAX_TITLE_LENGTH);
  });

  it("clears the voice check for every canonical line", () => {
    for (const id of NOTIFICATION_TYPE_IDS) {
      expect(violatesCopyVoice(notificationContent(id, SAMPLE_FACTS))).toEqual([]);
    }
  });

  it("rejects exclamation-mark hype", () => {
    expect(
      violatesCopyVoice({ title: "Get moving!", body: "Time to earn." }),
    ).toContain("exclamation");
  });

  it("rejects guilt language", () => {
    expect(BANNED_COPY_WORDS).toContain("failed");
    expect(
      violatesCopyVoice({ title: "You failed today", body: "Try harder." }),
    ).toContain("guilt");
  });

  it("rejects copy that overruns the character budget", () => {
    expect(
      violatesCopyVoice({ title: "x".repeat(MAX_TITLE_LENGTH + 1), body: "ok" }),
    ).toContain("title-length");
    expect(
      violatesCopyVoice({ title: "ok", body: "x".repeat(MAX_BODY_LENGTH + 1) }),
    ).toContain("body-length");
  });
});
