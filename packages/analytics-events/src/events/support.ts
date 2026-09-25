import type { EmptyProps, EventSpecMap } from '../types'

export type SupportCategory = 'support' | 'bug' | 'feature'

export type ActivityTruth = 'walking' | 'sitting' | 'shaking' | 'treadmill'

export type IncidentReportSource = 'home' | 'settings'

export const supportEvents = {
  support_request_submitted: { owner: 'server' },
  account_deleted: { owner: 'server' },
  diagnostics_shared: { owner: 'client', transmittedProperties: [] },
  data_export_requested: { owner: 'client', transmittedProperties: [] },
  activity_truth_held: { owner: 'client', transmittedProperties: ['activity', 'lock_state'] },
  incident_report_sent: { owner: 'client', transmittedProperties: ['source', 'activity', 'lock_state'] },
} as const satisfies EventSpecMap

export interface SupportEventProps {
  support_request_submitted: { category: SupportCategory }
  account_deleted: EmptyProps
  diagnostics_shared: EmptyProps
  data_export_requested: EmptyProps
  activity_truth_held: { activity: ActivityTruth; lock_state: string }
  incident_report_sent: { source: IncidentReportSource; activity: ActivityTruth | 'none'; lock_state: string }
}
