import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "../src/env.js";
import {
  renderSupportEmail,
  sendSupportEmail,
  type NewSupportSubmissionRecord,
} from "../src/support/index.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function record(
  overrides: Partial<NewSupportSubmissionRecord> = {},
): NewSupportSubmissionRecord {
  return {
    id: "submission-id",
    userId: "user_123",
    category: "support",
    title: null,
    message: "Help please",
    createdAt: new Date("2026-07-29T21:00:00.000Z"),
    featureRequest: null,
    ...overrides,
  };
}

describe("renderSupportEmail", () => {
  it("escapes <script> in the body only", () => {
    const email = renderSupportEmail(
      record({
        id: "<script>id</script>",
        userId: "<script>user</script>",
        message: "<script>alert(1)</script>",
      }),
    );

    expect(email.html).toContain("&lt;script&gt;id&lt;/script&gt;");
    expect(email.html).toContain("&lt;script&gt;user&lt;/script&gt;");
    expect(email.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(email.html).not.toContain("<script>");
    expect(email.subject).toBe("[ExcerLock] Support request");
  });

  it("uses fixed subjects by category", () => {
    expect(renderSupportEmail(record({ category: "bug" })).subject).toBe(
      "[ExcerLock] Bug report",
    );
    expect(renderSupportEmail(record({ category: "support" })).subject).toBe(
      "[ExcerLock] Support request",
    );
    expect(
      renderSupportEmail(
        record({ category: "feature", title: "User-supplied title" }),
      ).subject,
    ).toBe("[ExcerLock] Feature request");
  });
});

describe("sendSupportEmail", () => {
  it("returns false and does not fetch when the API key is missing", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(sendSupportEmail(record(), parseEnv({}))).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns true when fetch responds ok:true", async () => {
    const fetchSpy = vi.fn<typeof fetch>(async () => ({ ok: true }) as Response);
    vi.stubGlobal("fetch", fetchSpy);
    const rendered = renderSupportEmail(record());

    await expect(
      sendSupportEmail(record(), parseEnv({ RESEND_API_KEY: "re_test" })),
    ).resolves.toBe(true);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer re_test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ExcerLock <onboarding@resend.dev>",
        to: ["johansardar77@gmail.com"],
        subject: rendered.subject,
        html: rendered.html,
      }),
    });
  });

  it("returns false when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    await expect(
      sendSupportEmail(record(), parseEnv({ RESEND_API_KEY: "re_test" })),
    ).resolves.toBe(false);
  });
});
