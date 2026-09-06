import { SyncPort } from '../../ports/SyncPort';
export function SyncFake(): SyncPort {
  return { pushRules: async () => {}, pushRuleDays: async () => {}, pull: async () => ({ rules: [], ruleDays: [] }) };
}
