import { config } from "../../config/config.js";
import type { Environment } from "../../config/env.js";
import type { NewSupportSubmissionRecord } from "./repository.js";

const SUBJECT_BY_CATEGORY = {
  bug: "[ExcerLock] Bug report",
  support: "[ExcerLock] Support request",
  feature: "[ExcerLock] Feature request",
} as const;

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderSupportEmail(record: NewSupportSubmissionRecord): {
  subject: string;
  html: string;
} {
  const subject = SUBJECT_BY_CATEGORY[record.category];
  const html = [
    `<p>Category: ${escapeHtml(record.category)}</p>`,
    `<p>Submission ID: ${escapeHtml(record.id)}</p>`,
    `<p>User ID: ${escapeHtml(record.userId)}</p>`,
    record.title === null ? "" : `<p>Title: ${escapeHtml(record.title)}</p>`,
    "<p>Message:</p>",
    `<p>${escapeHtml(record.message)}</p>`,
  ].join("");

  return { subject, html };
}

export async function sendSupportEmail(
  record: NewSupportSubmissionRecord,
  environment: Environment = config,
): Promise<boolean> {
  try {
    const apiKey = environment.resendApiKey;
    if (!apiKey) {
      return false;
    }

    const { subject, html } = renderSupportEmail(record);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: environment.supportFromEmail,
        to: [environment.supportNotifyEmail],
        subject,
        html,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
