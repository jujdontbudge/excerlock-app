import { RuntimeSafety } from '../RuntimeSafety';
test('prompt protection is synchronous and nested operations cannot clear each other', async () => {
  const safety = new RuntimeSafety(); let one!: () => void, two!: () => void;
  const a=safety.prompt(()=>new Promise<void>(r=>{one=r;})), b=safety.prompt(()=>new Promise<void>(r=>{two=r;}));
  expect(safety.read().permissionPromptPending).toBe(true); one(); await a;
  expect(safety.read().permissionPromptPending).toBe(true); two(); await b;
  expect(safety.read().permissionPromptPending).toBe(false);
});
test('failed prompt releases its token; failed camera stop never reports stopped', async () => {
  const safety = new RuntimeSafety();
  await expect(safety.prompt(async()=>{throw new Error('denied');})).rejects.toThrow('denied');
  expect(safety.read().permissionPromptPending).toBe(false);
  await safety.startCamera(async()=>{});
  await expect(safety.stopCamera(async()=>{throw new Error('native');})).rejects.toThrow('native');
  expect(safety.read().cameraActive).toBe(true);
  await safety.stopCamera(async()=>{}); expect(safety.read().cameraActive).toBe(false);
});
