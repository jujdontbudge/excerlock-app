import { SupportPort, SupportRequest } from '../../ports/SupportPort';
import { ApiClient, failureFor } from './client';

/** Wire categories, lowercase; the server maps them to its own `SupportCategory`. */
export type SupportWireCategory = 'problem' | 'question' | 'idea';
export const wireCategory: Record<SupportRequest['category'], SupportWireCategory> = {
  Problem: 'problem',
  Question: 'question',
  Idea: 'idea',
};

/** The exact `POST /v1/support` body: the request's fields and nothing more. */
export function supportPayload(request: SupportRequest) {
  const d = request.diagnostics;
  return {
    category: wireCategory[request.category],
    message: request.message.trim(),
    replyTo: request.replyTo.trim(),
    diagnostics: {
      appVersion: d.appVersion,
      appBuild: d.appBuild,
      iosVersion: d.iosVersion,
      deviceModel: d.deviceModel,
      entitlementStatus: d.entitlementStatus,
      permissions: {
        screenTime: d.permissions.screenTime,
        motion: d.permissions.motion,
        location: d.permissions.location,
        health: d.permissions.health,
        camera: d.permissions.camera,
        notifications: d.permissions.notifications,
      },
      ruleCount: d.ruleCount,
      lastEnforcementResult: d.lastEnforcementResult.slice(0, 200),
    },
  };
}

/**
 * `SupportPort` over `POST /v1/support`. The payload is rebuilt field by field from the
 * privacy-floored diagnostics, so nothing a screen might have attached by accident can travel.
 * A 2xx is sent; anything else throws an `ApiError` and the screen keeps the draft for a retry.
 */
export function createHttpSupportPort(client: ApiClient): SupportPort {
  return {
    async send(request) {
      const response = await client.request('/v1/support', { method: 'POST', body: supportPayload(request) });
      if (response.status < 200 || response.status >= 300) throw failureFor(response);
    },
  };
}
