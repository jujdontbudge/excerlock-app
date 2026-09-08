import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';

/** The device side of Export my data: a file in the cache directory handed to the share sheet. */
export type ExportSink = {
  writeFile(name: string, contents: string): Promise<string>;
  share(url: string): Promise<void>;
};

export const nativeExportSink: ExportSink = {
  async writeFile(name, contents) {
    const file = new File(Paths.cache, name);
    file.create({ overwrite: true, intermediates: true });
    file.write(contents);
    return file.uri;
  },
  async share(url) {
    await Share.share({ url });
  },
};
