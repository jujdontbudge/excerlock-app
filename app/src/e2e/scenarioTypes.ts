export type ScenarioManifest = Readonly<{
  name: string;
  version: number;
  description: string;
  clock: Readonly<{
    now: string;
    playback: "manual" | "auto";
    speed?: number;
  }>;
  state: Readonly<{
    onboarding: "complete" | "fresh";
    entitlement: "free" | "premium";
    ledger: Readonly<{
      baseAllowanceMinutes: number;
      journal: readonly unknown[];
    }>;
    conditions: readonly unknown[];
    shield: Readonly<{ armedMonitors: readonly string[] }>;
    vendors: Readonly<
      Record<"strava" | "oura" | "whoop" | "polar", string>
    >;
  }>;
  providers: Readonly<
    Record<
      "health" | "motion" | "location" | "screentime" | "vendor",
      Readonly<{ fixture: string }>
    >
  >;
  timeline?: readonly unknown[];
}>;
