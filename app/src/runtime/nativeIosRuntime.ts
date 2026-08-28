export type NativeIosRuntimeEnvironment = Readonly<{
  nodeEnv: string | undefined;
  platform: string;
  /** The Expo Go app version; null in bare, standalone and development builds. */
  expoVersion: string | null | undefined;
}>;

/**
 * Custom native modules exist in bare, standalone and development-client builds.
 * `expoGoConfig` is deliberately not consulted: Expo Constants can derive it
 * from an embedded manifest in a bare Release build, which makes a real binary
 * look like Expo Go. `expoVersion` identifies the Expo Go host itself.
 */
export function shouldUseNativeIosRuntime(
  environment: NativeIosRuntimeEnvironment,
): boolean {
  return (
    environment.nodeEnv !== "test" &&
    environment.platform === "ios" &&
    environment.expoVersion == null
  );
}
