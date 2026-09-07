import { createRuntime } from '../../../runtime/createRuntime';
import { permissionsStore } from '../../../state/permissionsStore';
test('gym save requires a name and enforces five places, while edits remain allowed', async () => {
  const r = createRuntime();
  await r.dev.load('fresh-install');
  const base = { id: 'gym', name: 'My gym', address: 'A street', latitude: 41, longitude: -87, radiusMeters: 150 };
  await expect(r.gym.savePlace({ ...base, name: '  ' })).rejects.toThrow();
  for (let n = 0; n < 5; n++) await r.gym.savePlace({ ...base, id: String(n) });
  await expect(r.gym.savePlace({ ...base, id: '6' })).rejects.toThrow();
  await r.gym.savePlace({ ...base, id: '0', name: 'Updated gym' });
  expect(r.gym.listPlaces()).toHaveLength(5);
  expect(r.gym.listPlaces().find((p) => p.id === '0')?.radiusMeters).toBe(150);
  r.dispose();
});
test('location asks when-in-use before a distinct Always upgrade, denial preserves existing grant', async () => {
  const r = createRuntime();
  await r.dev.load('fresh-install');
  r.dev.setPromptMode('grant');
  expect(await r.gym.requestLocation()).toBe('whenInUse');
  r.dev.setPromptMode('ask');
  const request = r.gym.enableAutoDetect();
  expect(r.dev.snapshot().prompt).toMatchObject({ name: 'location', scope: 'always' });
  r.dev.resolvePrompt(false);
  expect(await request).toBe(false);
  expect(permissionsStore.getState().data.location).toBe('whenInUse');
  r.dispose();
});
