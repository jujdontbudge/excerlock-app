import { Entitlement, Permissions } from './types';

export type SupportDiagnostics = {
  appVersion: string;
  appBuild: string;
  iosVersion: string;
  deviceModel: string;
  entitlementStatus: Entitlement['status'];
  permissions: Permissions;
  ruleCount: number;
  lastEnforcementResult: string;
};

export function supportDiagnostics(input: SupportDiagnostics): SupportDiagnostics {
  return {
    appVersion: input.appVersion,
    appBuild: input.appBuild,
    iosVersion: input.iosVersion,
    deviceModel: input.deviceModel,
    entitlementStatus: input.entitlementStatus,
    permissions: { ...input.permissions },
    ruleCount: input.ruleCount,
    lastEnforcementResult: input.lastEnforcementResult,
  };
}
