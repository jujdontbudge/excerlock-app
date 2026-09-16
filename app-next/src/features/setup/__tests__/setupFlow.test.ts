import { nextSetup, resumeSetup, branchPermission, firstSetup } from '../../../onboarding/setupFlow';
test('setup starts at sign-in for walking and at the gym picker for gym', () => {
  expect(['X3', 'X4', 'X5'].map(nextSetup)).toEqual(['X4', 'X5', 'done']);
  expect(firstSetup('walking')).toBe('X4');
  expect(firstSetup('gym')).toBe('X3');
  expect(resumeSetup({ setupStep: 'X3', setupComplete: false }, 'gym')).toBe('X3');
  expect(resumeSetup({ setupStep: 'X3', setupComplete: false }, 'walking')).toBe('X4');
  expect(resumeSetup({ setupStep: 'X1', setupComplete: false })).toBe('X4');
  expect(resumeSetup({ setupStep: 'bad', setupComplete: false }, 'gym')).toBe('X3');
  expect(resumeSetup({ setupStep: 'X4', setupComplete: true })).toBe('done');
});
test.each([
  ['walking', 'motion'],
  ['gym', 'location'],
] as const)('%s asks for %s', (activity, permission) => expect(branchPermission(activity)).toBe(permission));
