import type { EmptyProps, EventSpecMap } from '../types'

/** The support composer's three pipelines (PRD §3.15 Support & Feedback). */
export type SupportCategory = 'support' | 'bug' | 'feature'

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
} as const satisfies EventSpecMap

export interface SupportEventProps {
  // D12: never the message body — the category enum only.
  support_request_submitted: { category: SupportCategory }
  account_deleted: EmptyProps
  diagnostics_shared: EmptyProps
  data_export_requested: EmptyProps
}
