import { existsSync } from "node:fs";

import { fromRoot, readJson } from "../repo-files";

/**
 * The workspace that ships. Before the P2-T12 rename it is `app-next`; the
 * checklist's final step renames it to `app`, and every release guardrail
 * follows the rename automatically because it resolves the directory here.
 */
export const releaseAppDir = existsSync(fromRoot("app-next")) ? "app-next" : "app";

/** True once `app-next` has become `app` (docs/release/cutover-checklist.md, step 5). */
export const cutoverComplete = releaseAppDir === "app";

/** The old app is still checked out next to the new one. */
export const oldAppPresent = !cutoverComplete && existsSync(fromRoot("app", "app.json"));

export function fromReleaseApp(...parts: string[]): string {
  return fromRoot(releaseAppDir, ...parts);
}

export type ExpoAppConfig = {
  expo?: {
    name?: string;
    slug?: string;
    owner?: string;
    version?: string;
    scheme?: string;
    ios?: {
      bundleIdentifier?: string;
      appleTeamId?: string;
      buildNumber?: string;
      entitlements?: Record<string, unknown>;
      infoPlist?: Record<string, unknown>;
    };
    plugins?: Array<string | [string, ...unknown[]]>;
    extra?: { eas?: { projectId?: string } };
    updates?: { url?: string; enabled?: boolean };
  };
};

export type EasBuildProfile = {
  developmentClient?: boolean;
  distribution?: string;
  autoIncrement?: boolean | string;
  channel?: string;
  env?: Record<string, string>;
  ios?: { simulator?: boolean };
  withoutCredentials?: boolean;
};

export type EasConfig = {
  cli?: { appVersionSource?: string };
  build?: Record<string, EasBuildProfile>;
  submit?: Record<string, { ios?: { ascAppId?: string; appleTeamId?: string } }>;
};

export type PackageJson = {
  name?: string;
  version?: string;
  workspaces?: string[];
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export function readReleaseAppConfig(): ExpoAppConfig {
  return readJson<ExpoAppConfig>(fromReleaseApp("app.json"));
}

export function readReleaseEasConfig(): EasConfig {
  return readJson<EasConfig>(fromReleaseApp("eas.json"));
}

export function readReleasePackageJson(): PackageJson {
  return readJson<PackageJson>(fromReleaseApp("package.json"));
}

export function pluginName(plugin: string | [string, ...unknown[]] | undefined): string | undefined {
  return Array.isArray(plugin) ? plugin[0] : plugin;
}

/** Decision A3 (`plans/rebuild/00-decisions.md`): the identity that never changes across the rebuild. */
export const APP_IDENTITY = {
  name: "ExcerLock",
  slug: "excerlock",
  owner: "johansardar",
  scheme: "excerlock",
  bundleIdentifier: "com.johansardar.excerlock",
  appleTeamId: "AX3C2B78YD",
  appGroup: "group.com.johansardar.excerlock",
  easProjectId: "9a358379-d939-4c56-bcea-de3ac5699be2",
  updatesUrl: "https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2",
  /** App Store Connect app record (`asc apps list`, sku `excerlock-ios-001`). */
  ascAppId: "6787265352",
} as const;
