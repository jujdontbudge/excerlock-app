import { describe, expect, it, vi } from "vitest";
import {
  createIncidentReportService,
  findForbiddenDiagnosticKey,
  IncidentDiagnosticsRejectedError,
  IncidentUserNotFoundError,
  renderIncidentEmail,
  type IncidentReportRepository,
  type NewIncidentReportRecord,
} from "../src/incidents/index.js";

const input = {
  whatWentWrong: "Apps stayed locked after my walk.",
  shouldHaveHappened: "They should have unlocked.",
  app: { version: "1.0.0", build: "2", osVersion: "18.5" },
  reportedAt: "2026-09-18T10:15:00.000Z",
  diagnostics: { lock: { state: "shield" }, walking: { phase: "inactive" } },
};

function repository(exists = true) {
  const inserted: NewIncidentReportRecord[] = [];
  const repo: IncidentReportRepository = {
    userExists: vi.fn(async () => exists),
    insertIncidentReport: vi.fn(async (record) => {
      inserted.push(record);
    }),
  };
  return { repo, inserted };
}

describe("incident report service", () => {
  it("persists the report, then notifies best effort", async () => {
    const { repo, inserted } = repository();
    const order: string[] = [];
    (repo.insertIncidentReport as ReturnType<typeof vi.fn>).mockImplementation(
      async (record: NewIncidentReportRecord) => {
        order.push("persist");
        inserted.push(record);
      },
    );
    const notify = vi.fn(async () => {
      order.push("notify");
      return true;
    });
    const service = createIncidentReportService({
      repository: repo,
      notify,
      now: () => new Date("2026-09-18T10:16:00.000Z"),
      randomId: () => "report-1",
    });

    const result = await service.submit("user_123", input);
    await Promise.resolve();

    expect(result).toEqual({ reportId: "report-1" });
    expect(order).toEqual(["persist", "notify"]);
    expect(inserted).toEqual([
      {
        id: "report-1",
        userId: "user_123",
        appVersion: "1.0.0",
        appBuild: "2",
        osVersion: "18.5",
        whatWentWrong: input.whatWentWrong,
        shouldHaveHappened: input.shouldHaveHappened,
        diagnostics: input.diagnostics,
        reportedAt: new Date("2026-09-18T10:15:00.000Z"),
        createdAt: new Date("2026-09-18T10:16:00.000Z"),
      },
    ]);
  });

  it("succeeds even when the notification rejects", async () => {
    const { repo } = repository();
    const service = createIncidentReportService({
      repository: repo,
      notify: vi.fn(async () => {
        throw new Error("resend down");
      }),
    });
    await expect(service.submit("user_123", input)).resolves.toMatchObject({
      reportId: expect.any(String),
    });
  });

  it("rejects a forbidden diagnostics key before checking the user", async () => {
    const { repo } = repository();
    const service = createIncidentReportService({ repository: repo });
    await expect(
      service.submit("user_123", {
        ...input,
        diagnostics: { gym: { regions: [{ id: "g1", Latitude: 59.3 }] } },
      }),
    ).rejects.toBeInstanceOf(IncidentDiagnosticsRejectedError);
    expect(repo.userExists).not.toHaveBeenCalled();
    expect(repo.insertIncidentReport).not.toHaveBeenCalled();
  });

  it("rejects an unknown user without persisting", async () => {
    const { repo } = repository(false);
    const service = createIncidentReportService({ repository: repo });
    await expect(service.submit("ghost", input)).rejects.toBeInstanceOf(
      IncidentUserNotFoundError,
    );
    expect(repo.insertIncidentReport).not.toHaveBeenCalled();
  });
});

describe("findForbiddenDiagnosticKey", () => {
  it("accepts the shape the app sends", () => {
    expect(
      findForbiddenDiagnosticKey({
        lock: { state: "shield", openReason: null, eligibleUntil: 0 },
        walking: { phase: "active", since: "2026-09-18T10:00:00Z" },
        gym: { presence: { placeId: "g1" }, regions: { g1: { confirmedSince: 1 } } },
        lockedApps: { isEmpty: false, hasSelection: true },
        permissions: { location: "always" },
      }),
    ).toBeNull();
  });

  it.each([
    [{ location: { latitude: 1 } }, "diagnostics.location.latitude"],
    [{ gyms: [{ id: "g", coords: [1, 2] }], ok: 1 }, "diagnostics.gyms[0].coords"],
    [{ account: { Email: "x@y.z" } }, "diagnostics.account.Email"],
    [{ selection: { handle: { token: "abc" } } }, "diagnostics.selection.handle.token"],
    [{ apps: { bundleId: "com.x" } }, "diagnostics.apps.bundleId"],
  ])("names the first forbidden path in %j", (value, path) => {
    expect(findForbiddenDiagnosticKey(value)).toBe(path);
  });
});

describe("renderIncidentEmail", () => {
  it("escapes user text and includes the diagnostics", () => {
    const { subject, html } = renderIncidentEmail({
      id: "r1",
      userId: "u1",
      appVersion: "1.0.0",
      appBuild: "2",
      osVersion: "18.5",
      whatWentWrong: "<b>locked</b>",
      shouldHaveHappened: "open & free",
      diagnostics: { lock: { state: "shield" } },
      reportedAt: new Date("2026-09-18T10:15:00.000Z"),
      createdAt: new Date("2026-09-18T10:16:00.000Z"),
    });
    expect(subject).toBe("[ExcerLock] Incident report 1.0.0 (2)");
    expect(html).toContain("&lt;b&gt;locked&lt;/b&gt;");
    expect(html).toContain("open &amp; free");
    expect(html).toContain("&quot;state&quot;: &quot;shield&quot;");
    expect(html).not.toContain("<b>locked</b>");
  });
});
