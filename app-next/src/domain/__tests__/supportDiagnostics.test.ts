import { supportDiagnostics } from '../supportDiagnostics';

test('support diagnostics contain the required fields and no private values', () => {
  const diagnostics = supportDiagnostics({
    appVersion: '1.0.0',
    appBuild: '22',
    iosVersion: '20.0',
    deviceModel: 'iPhone',
    entitlementStatus: 'active',
    permissions: {
      screenTime: 'granted',
      motion: 'granted',
      location: 'always',
      health: 'granted',
      camera: 'granted',
      notifications: 'denied',
    },
    ruleCount: 3,
    lastEnforcementResult: 'locked',
  });

  expect(Object.keys(diagnostics)).toEqual([
    'appVersion',
    'appBuild',
    'iosVersion',
    'deviceModel',
    'entitlementStatus',
    'permissions',
    'ruleCount',
    'lastEnforcementResult',
  ]);
  expect(Object.keys(diagnostics.permissions)).toHaveLength(6);
  expect(JSON.stringify(diagnostics)).not.toMatch(/gym|latitude|longitude|coordinate|healthValue|appName/i);
});
