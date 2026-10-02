export function otaLabUrl(env: NodeJS.ProcessEnv): string | null {
  const raw = env.EXCER_OTA_LAB_URL;
  if (!raw) return null;
  if (env.EAS_BUILD === 'true' || env.EAS_BUILD_PROFILE || env.EXCERLOCK_LINKED_RECORDER_TRACE === '1')
    throw new Error('OTA lab is local only and cannot run under EAS or Trace Lab');
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password)
    throw new Error('EXCER_OTA_LAB_URL must be an HTTP loopback URL');
  return url.toString();
}
