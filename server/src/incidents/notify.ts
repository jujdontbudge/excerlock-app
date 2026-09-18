import { config } from "../config.js";
import type { Environment } from "../env.js";
import type { NewIncidentReportRecord } from "./repository.js";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderIncidentEmail(record: NewIncidentReportRecord): {
  subject: string;
  html: string;
} {
  const subject = `[ExcerLock] Incident report ${record.appVersion} (${record.appBuild})`;
  const html = [
    `<p>Report ID: ${escapeHtml(record.id)}</p>`,
    `<p>User ID: ${escapeHtml(record.userId)}</p>`,
    `<p>App: ${escapeHtml(record.appVersion)} (${escapeHtml(record.appBuild)})${
      record.osVersion ? ` · iOS ${escapeHtml(record.osVersion)}` : ""
    }</p>`,
    `<p>Reported at: ${escapeHtml(record.reportedAt.toISOString())}</p>`,
    "<p><strong>What went wrong</strong></p>",
    `<p>${escapeHtml(record.whatWentWrong)}</p>`,
    "<p><strong>What should have happened</strong></p>",
    `<p>${escapeHtml(record.shouldHaveHappened)}</p>`,
    "<p><strong>Diagnostics</strong></p>",
    `<pre>${escapeHtml(JSON.stringify(record.diagnostics, null, 2))}</pre>`,
  ].join("");

  return { subject, html };
}

/** Best effort: a missing key or a failed send never fails the report. */
export async function sendIncidentEmail(
  record: NewIncidentReportRecord,
  environment: Environment = config,
): Promise<boolean> {
  try {
    const apiKey = environment.resendApiKey;
    if (!apiKey) {
      return false;
    }

    const { subject, html } = renderIncidentEmail(record);
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
