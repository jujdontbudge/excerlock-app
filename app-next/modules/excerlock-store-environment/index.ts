import { requireOptionalNativeModule } from 'expo-modules-core';

type StoreEnvironmentModule = { verifiedEnvironment(): Promise<string | null> };
const module = requireOptionalNativeModule<StoreEnvironmentModule>('ExcerlockStoreEnvironment');

export async function verifiedStoreEnvironment(): Promise<'production' | 'sandbox' | null> {
  if (!module) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      module.verifiedEnvironment(),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 8_000); }),
    ]);
    return value === 'production' || value === 'sandbox' ? value : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
