import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { createJsonExport } from './lib/JsonExport';

export function createNativeJsonExport(isCurrent: () => boolean) {
  return createJsonExport({
    cacheDirectory: FileSystem.cacheDirectory,
    randomId: () => Crypto.randomUUID(),
    isAvailable: () => Sharing.isAvailableAsync(),
    write: (uri, contents) => FileSystem.writeAsStringAsync(uri, contents),
    share: (uri) => Sharing.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json' }),
    remove: (uri) => FileSystem.deleteAsync(uri, { idempotent: true }),
    isCurrent,
  });
}
