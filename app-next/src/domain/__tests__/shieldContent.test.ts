import { shieldContent } from '../shieldContent';
test('shield gives the next action without exposing app identities or rewards', () => {
  expect(shieldContent('locked', { ruleId: 'r', action: 'progress', remaining: 1200, unit: 'steps' }).subtitle).toBe(
    '1,200 steps to go to open your apps.',
  );
  expect(shieldContent('locked', { ruleId: 'r', action: 'arrive', remaining: null, unit: null }).subtitle).toContain(
    'saved gym',
  );
  expect(shieldContent('lockWindow', { ruleId: 'r', action: 'walk', remaining: null, unit: null }).secondary).toBe(
    'Keep walking',
  );
  expect(shieldContent('walkingEnded').subtitle).toContain('walk has ended');
  expect(shieldContent('locked', { ruleId: 'r', action: 'progress', remaining: null, unit: null }).subtitle).toContain(
    'Complete an exercise',
  );
  expect(shieldContent('locked').secondary).toBe('OK');
  expect(shieldContent('locked', { ruleId: 'r', action: 'progress', remaining: 0, unit: null }).subtitle).toContain(
    '0',
  );
});
