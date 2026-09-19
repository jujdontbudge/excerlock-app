import type { EmptyProps, EventSpecMap } from '../types'

/** The support composer's three pipelines (PRD §3.15 Support & Feedback). */
export type SupportCategory = 'support' | 'bug' | 'feature'

/** What the person said they were doing when they held a Home ground-truth chip. */
export type ActivityTruth = 'walking' | 'sitting' | 'shaking' | 'treadmill'

/** Where an incident report was sent from. */
export type IncidentReportSource = 'home' | 'settings'

/**
 * Settings-surface demand events. The composer POSTs to /v1/support, so the
 * server owns that persisted action (D5) — `category: 'feature'` is the
 * queryable feature-demand signal the PRD mandates. Diagnostics share and
 * data export happen entirely on-device, so the client owns them.
 */
export const supportEvents = {
  support_request_submitted: { owner: 'server' },
  account_deleted: { owner: 'server' },
  diagnostics_shared: { owner: 'client', transmittedProperties: [] },
  data_export_requested: { owner: 'client', transmittedProperties: [] },
  // Home ground truth and the incident report are on-device UI actions: the
  // POST /v1/incident-reports body is stored verbatim for humans, never counted
  // by the server, so the client is the single emitter.
  activity_truth_held: { owner: 'client', transmittedProperties: ['activity', 'lock_state'] },
  incident_report_sent: { owner: 'client', transmittedProperties: ['source', 'activity', 'lock_state'] },
} as const satisfies EventSpecMap

export interface SupportEventProps {
  // D12: never the message body — the category enum only.
  support_request_submitted: { category: SupportCategory }
  account_deleted: EmptyProps
  diagnostics_shared: EmptyProps
  data_export_requested: EmptyProps
  // D12: the enum label and the lock decision name only — never the report's words.
  activity_truth_held: { activity: ActivityTruth; lock_state: string }
  incident_report_sent: { source: IncidentReportSource; activity: ActivityTruth | 'none'; lock_state: string }
}
