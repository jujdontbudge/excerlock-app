import { RuntimeEnforcementSource, type RuntimeEnforcementInput } from '../enforcement/RuntimeEnforcementSource';
import { inactiveWalkingStatus } from '../../ports/WalkingPort';
const input = (): RuntimeEnforcementInput => ({
  now: '2026-09-10T12:00:00.000Z', timezone: 'UTC', rules: [{ id: 'walk', activity: 'walking', mode: { kind: 'state', activity: 'walking' }, enabled: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', schedule: { days: [0,1,2,3,4,5,6], window: { kind: 'allDay' } } }],
  ruleDays: [], walking: inactiveWalkingStatus, gymPresence: null,
  entitlement: { status: 'active', renewsAt: null }, deleting: false, accountGeneration: 1,
  screenTimeAuthorized: true, selection: { handle: { token: 'opaque' }, isEmpty: false }, selectionVersion: 'v1',
});
test('seeds durable native revision and clock ticks do not churn policy', () => {
  const live = input(), source = new RuntimeEnforcementSource(() => live, 40);
  expect(source.read().revision).toBe(41);
  live.now = '2026-09-10T12:00:01.000Z';
  expect(source.read().revision).toBe(41);
});
test('live read invalidates in-flight operation before queued reconciliation', () => {
  const live = input(), source = new RuntimeEnforcementSource(() => live, 40);
  const captured = source.read(); live.deleting = true;
  expect(source.read()).toMatchObject({ revision: captured.revision + 1, state: 'open', openReason: 'deleting', windows: [] });
});
test('selection edits with same opaque storage handle revoke old callback authority', () => {
  const live = input(), source = new RuntimeEnforcementSource(() => live, -1);
  expect(source.read().revision).toBe(0); live.selectionVersion = 'v2';
  expect(source.read().revision).toBe(1);
});
test('all-day policy keeps seven midnight callbacks and shields before evidence', () => {
  const source = new RuntimeEnforcementSource(input, 0);
  expect(source.read()).toMatchObject({ state: 'shield', futureEnforcementEligible: true });
  expect(source.read().windows).toHaveLength(7);
});
test('explicit deletion clears even an unrepresentable schedule', () => {
  const live = input();
  live.rules = [live.rules[0], { ...live.rules[0], id: 'second', schedule: { days: [0,1,2,3,4,5,6], window: { kind: 'range', startMinute: 1000, endMinute: 1100 } } }];
  live.rules[0] = { ...live.rules[0], schedule: { days: [0,1,2,3,4,5,6], window: { kind: 'range', startMinute: 100, endMinute: 200 } } };
  const source = new RuntimeEnforcementSource(() => live, 10);
  expect(() => source.read()).toThrow('cannot represent');
  live.deleting = true;
  expect(source.read()).toMatchObject({ state: 'open', openReason: 'deleting', windows: [] });
});
