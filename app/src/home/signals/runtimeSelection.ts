export interface HomeRuntimeEnvironment {
  readonly executionEnvironment: string | null | undefined;
  readonly hasExpoGoConfig: boolean;
  readonly nodeEnv: string | undefined;
  readonly platform: string;
}

export function shouldUseHealthKitProvider(
  environment: HomeRuntimeEnvironment,
): boolean {
  return (
    environment.nodeEnv !== "test" &&
    environment.platform === "ios" &&
    environment.executionEnvironment === "storeClient" &&
    !environment.hasExpoGoConfig
  );
}
