// Only callbacks live here; the route URL carries the session id, never a function.
const sessions = new Map<string, (saved: boolean) => void>();
let sequence = 0;
export function createPickerSession(callback: (saved: boolean) => void) {
  const id = String(++sequence);
  sessions.set(id, callback);
  return id;
}
export function finishPickerSession(id: string | undefined, saved: boolean) {
  if (!id) return;
  const callback = sessions.get(id);
  sessions.delete(id);
  callback?.(saved);
}
