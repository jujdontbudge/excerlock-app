import { createApiClient, createHttpSupportPort, supportPayload } from '..';
import { ApiFetch } from '../client';
import { SupportRequest } from '../../../ports/SupportPort';
import { supportDiagnostics } from '../../../domain/supportDiagnostics';

const request: SupportRequest = {
  category: 'Idea',
  message: '  Add a rowing rule  ',
  replyTo: ' alex@example.test ',
  diagnostics: supportDiagnostics({
    appVersion: '1.0.0',
    appBuild: '12',
    iosVersion: '18.5',
    deviceModel: 'iPhone 16',
    entitlementStatus: 'trial',
    permissions: {
      screenTime: 'granted',
      motion: 'granted',
      location: 'whenInUse',
      health: 'denied',
      camera: 'notDetermined',
      notifications: 'granted',
    },
    ruleCount: 3,
    lastEnforcementResult: 'locked',
  }),
};

function portWith(status: number, text = '') {
  const bodies: string[] = [];
  const fetch: ApiFetch = async (_url, init) => {
    bodies.push(init.body ?? '');
    return { status, text: async () => text };
  };
  return {
    port: createHttpSupportPort(createApiClient({ baseUrl: 'https://a', getAccessToken: async () => 't', fetch })),
    bodies,
  };
}

test('the support payload is exactly the documented fields, trimmed, with the wire category', () => {
  expect(supportPayload(request)).toEqual({
    category: 'idea',
    message: 'Add a rowing rule',
    replyTo: 'alex@example.test',
    diagnostics: {
      appVersion: '1.0.0',
      appBuild: '12',
      iosVersion: '18.5',
      deviceModel: 'iPhone 16',
      entitlementStatus: 'trial',
      permissions: {
        screenTime: 'granted',
        motion: 'granted',
        location: 'whenInUse',
        health: 'denied',
        camera: 'notDetermined',
        notifications: 'granted',
      },
      ruleCount: 3,
      lastEnforcementResult: 'locked',
    },
  });
  expect(supportPayload({ ...request, category: 'Problem' }).category).toBe('problem');
  expect(supportPayload({ ...request, category: 'Question' }).category).toBe('question');
});

test('the wire body never contains a gym name, coordinate or app name even when a caller smuggles one', async () => {
  const { port, bodies } = portWith(201, '{"submissionId":"s1"}');
  const smuggled = {
    ...request,
    diagnostics: {
      ...request.diagnostics,
      gymName: 'Demo Gym',
      latitude: 40.7,
      longitude: -74,
      apps: ['Instagram'],
      lastEnforcementResult: 'x'.repeat(300),
    },
  } as SupportRequest;
  await port.send(smuggled);
  expect(bodies).toHaveLength(1);
  expect(bodies[0]).not.toMatch(/Demo Gym|latitude|longitude|Instagram|apps/);
  const sent = JSON.parse(bodies[0]);
  expect(Object.keys(sent.diagnostics).sort()).toEqual([
    'appBuild',
    'appVersion',
    'deviceModel',
    'entitlementStatus',
    'iosVersion',
    'lastEnforcementResult',
    'permissions',
    'ruleCount',
  ]);
  expect(sent.diagnostics.lastEnforcementResult).toHaveLength(200);
});

test('a 4xx is rejected, a 5xx is unavailable, and a 201 resolves', async () => {
  await expect(portWith(201, '{"submissionId":"s1"}').port.send(request)).resolves.toBeUndefined();
  await expect(portWith(400, '{"error":{"code":"INVALID_SUPPORT_REQUEST"}}').port.send(request)).rejects.toMatchObject({
    kind: 'rejected',
    code: 'INVALID_SUPPORT_REQUEST',
  });
  await expect(portWith(503).port.send(request)).rejects.toMatchObject({ kind: 'unavailable' });
});
