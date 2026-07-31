import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { fromRoot, readJson, readUtf8, walkFiles } from "./repo-files";

type AppConfig = {
  expo?: {
    ios?: { bundleIdentifier?: string };
    plugins?: Array<string | [string, Record<string, unknown>]>;
  };
};

type PackageJson = {
  dependencies?: Record<string, string>;
};

type NativeTargetSpec = {
  entitlementsPattern: string;
  entitlementsRequired: boolean;
  id: string;
  namePattern: string;
  status: "pending-phase-3" | "required";
};

type NativeTargetsManifest = {
  targets: NativeTargetSpec[];
};

type ProjectTarget = {
  configurations: Array<{
    bundleIdentifier: string | undefined;
    deploymentTarget: string | undefined;
    developmentTeam: string | undefined;
    entitlements: string[];
    id: string;
  }>;
  name: string;
};

const rndaTargetIds = [
  "device-activity-monitor",
  "shield-action",
  "shield-configuration",
];

function projectObject(project: string, id: string): string {
  const start = project.search(new RegExp(`^\\t\\t${id} \\/\\*`, "m"));
  if (start < 0) {
    return "";
  }
  const end = project.indexOf("\n\t\t};", start);
  return end < 0 ? "" : project.slice(start, end + "\n\t\t};".length);
}

function readProjectTargets(project: string): ProjectTarget[] {
  const targetHeaders = [
    ...project.matchAll(
      /^\t\t([A-Z0-9]+) \/\* ([^*]+) \*\/ = \{\n\t\t\tisa = PBXNativeTarget;/gm,
    ),
  ];

  return targetHeaders.flatMap((header) => {
    const targetId = header[1];
    const name = header[2];
    if (!targetId || !name) {
      return [];
    }

    const target = projectObject(project, targetId);
    const configurationListId = target.match(/buildConfigurationList = ([A-Z0-9]+) /)?.[1];
    const configurationList = configurationListId
      ? projectObject(project, configurationListId)
      : "";
    const configurationIds = [
      ...configurationList.matchAll(/^\t\t\t\t([A-Z0-9]+) \/\*/gm),
    ].flatMap((match) => {
      const configurationId = match[1];
      return configurationId ? [configurationId] : [];
    });

    return {
      name,
      configurations: configurationIds.map((id) => ({
        id,
        bundleIdentifier: projectObject(project, id).match(
          /PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/,
        )?.[1],
        deploymentTarget: projectObject(project, id).match(
          /IPHONEOS_DEPLOYMENT_TARGET = "?([^";]+)"?;/,
        )?.[1],
        developmentTeam: projectObject(project, id).match(
          /DEVELOPMENT_TEAM = "?([^";]+)"?;/,
        )?.[1],
        entitlements: [
          ...projectObject(project, id).matchAll(
            /CODE_SIGN_ENTITLEMENTS = "?([^";]+\.entitlements)"?;/g,
          ),
        ].flatMap((match) => {
          const entitlement = match[1];
          return entitlement ? [entitlement] : [];
        }),
      })),
    };
  });
}

describe("prebuild-survival guardrail", () => {
  it("keeps every declared native target and entitlement in the generated Xcode project", () => {
    const appConfig = readJson<AppConfig>(fromRoot("app", "app.json"));
    expect(appConfig.expo?.ios?.bundleIdentifier).toBe("com.johansardar.excerlock");

    const targetManifest = readJson<NativeTargetsManifest>(
      fromRoot("guardrails", "native-targets.json"),
    );
    expect(targetManifest.targets.map(({ id }) => id).sort()).toEqual([
      "app",
      "app-intents",
      "device-activity-monitor",
      "shield-action",
      "shield-configuration",
    ]);

    const packageJson = readJson<PackageJson>(fromRoot("app", "package.json"));
    const dependencies = packageJson.dependencies ?? {};
    const targetById = new Map(targetManifest.targets.map((target) => [target.id, target]));
    const rndaPlugin = appConfig.expo?.plugins?.find(
      (plugin): plugin is [string, Record<string, unknown>] =>
        Array.isArray(plugin) && plugin[0] === "react-native-device-activity",
    );
    const rndaGeneratesTargets = rndaPlugin?.[1]?.copyToTargetFolder !== false;
    expect(appConfig.expo?.plugins?.at(-1)).toBe(
      "./plugins/withScreenTimeExtensionValidation",
    );
    const appIntentsHasSource = walkFiles(fromRoot("app", "targets", "app-intents")).some(
      (path) => !path.endsWith("README.md") && !path.endsWith(".gitkeep"),
    );

    if ("react-native-device-activity" in dependencies && rndaGeneratesTargets) {
      expect(
        rndaTargetIds.every((id) => targetById.get(id)?.status === "required"),
        "Installing RNDA must permanently promote its three native-target expectations to required",
      ).toBe(true);
    }
    if ("@bacons/apple-targets" in dependencies || appIntentsHasSource) {
      expect(
        targetById.get("app-intents")?.status,
        "Configuring App Intents must permanently promote its native-target expectation to required",
      ).toBe("required");
    }

    const projectFiles = walkFiles(fromRoot("app", "ios"), new Set(["project.pbxproj"]));
    expect(
      projectFiles.length,
      "The guardrail suite requires a clean Expo iOS prebuild before its filesystem assertions",
    ).toBeGreaterThan(0);
    const project = projectFiles.map(readUtf8).join("\n");
    expect(project).toMatch(
      /PRODUCT_BUNDLE_IDENTIFIER = "?com\.johansardar\.excerlock"?;/,
    );

    const projectTargets = readProjectTargets(project);
    const requiredTargets = targetManifest.targets.filter(({ status }) => status === "required");
    const missingTargets = requiredTargets
      .filter(({ namePattern }) => {
        const pattern = new RegExp(namePattern, "i");
        return !projectTargets.some(({ name }) => pattern.test(name));
      })
      .map(({ id }) => id);

    expect(missingTargets, "A clean Expo prebuild dropped required PBXNativeTarget entries").toEqual([]);

    const missingEntitlements = requiredTargets
      .filter(({ entitlementsRequired }) => entitlementsRequired)
      .flatMap(({ entitlementsPattern, id, namePattern }) => {
        const targetName = new RegExp(namePattern, "i");
        const entitlementPath = new RegExp(entitlementsPattern, "i");
        const target = projectTargets.find(({ name }) => targetName.test(name));
        if (!target) {
          return [];
        }
        if (target.configurations.length === 0) {
          return [{ configuration: "<none>", target: id }];
        }
        return target.configurations
          .filter(({ entitlements }) =>
            !entitlements.some(
              (path) =>
                entitlementPath.test(path) && existsSync(fromRoot("app", "ios", path)),
            ),
          )
          .map(({ id: configuration }) => ({ configuration, target: id }));
      });

    expect(
      missingEntitlements,
      "A required native target build configuration lost its CODE_SIGN_ENTITLEMENTS setting or generated file",
    ).toEqual([]);

    const expectedExtensionSettings = [
      {
        bundleIdentifier: "com.johansardar.excerlock.monitor",
        name: /^DeviceActivityMonitorExtension$/,
      },
      {
        bundleIdentifier: "com.johansardar.excerlock.shield",
        name: /^ShieldConfiguration$/,
      },
      {
        bundleIdentifier: "com.johansardar.excerlock.shieldaction",
        name: /^ShieldAction$/,
      },
    ];
    const invalidExtensionConfigurations = expectedExtensionSettings.flatMap(
      ({ bundleIdentifier, name }) => {
        const target = projectTargets.find(({ name: targetName }) =>
          name.test(targetName),
        );
        return (target?.configurations ?? [])
          .filter(
            (configuration) =>
              configuration.bundleIdentifier !== bundleIdentifier ||
              configuration.deploymentTarget !== "17.4" ||
              configuration.developmentTeam !== "AX3C2B78YD",
          )
          .map(({ id }) => ({ configuration: id, target: target?.name }));
      },
    );

    expect(
      invalidExtensionConfigurations,
      "A Screen Time extension lost its canonical bundle id, iOS 17.4 floor, or team",
    ).toEqual([]);
  });
});
