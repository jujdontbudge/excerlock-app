import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { settingsCopy as c } from '../../content/settings';

export type AppBuildInfo = { version: string; build: string };

/**
 * The version and build the user is running. The native bundle values win because EAS remote
 * versioning stamps the build number at build time, so `expoConfig.ios.buildNumber` can be missing
 * in a store build; the config is the fallback for development, then the caller's own default.
 */
export function appBuildInfo(
  fallback: AppBuildInfo = { version: c.defaultVersion, build: c.defaultBuild },
): AppBuildInfo {
  return {
    version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? fallback.version,
    build: Application.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber ?? fallback.build,
  };
}
