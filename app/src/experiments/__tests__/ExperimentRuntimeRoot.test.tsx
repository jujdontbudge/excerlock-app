import type { PostHog } from "posthog-react-native";
import { Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { ExperimentRuntimeRoot } from "../ExperimentRuntimeRoot";
import { useShieldCopyExperiment } from "../ExperimentVariantProvider";

function SelectionProbe() {
  const selection = useShieldCopyExperiment();
  return <Text>{selection.copy?.fullLock.title ?? selection.variant}</Text>;
}

describe("ExperimentRuntimeRoot", () => {
  it("mounts one exposure reader and delivers validated shield copy", async () => {
    const payload = {
      balanceEmpty: { title: "Pause for now.", subtitle: "Move to unlock more time." },
      fullLock: { title: "Move first.", subtitle: "Your fastest unlock is ready." },
      walkAndScrollEnded: { title: "Walking paused.", subtitle: "Walk again to continue." },
      lockWindow: { title: "Apps are resting.", subtitle: "Come back after the window." },
    };
    const client = {
      getFeatureFlag: jest.fn(() => "treatment"),
      getFeatureFlagPayload: jest.fn(() => payload),
      onFeatureFlags: jest.fn(() => () => {}),
    } as unknown as PostHog;

    await render(
      <ExperimentRuntimeRoot client={client}>
        <SelectionProbe />
      </ExperimentRuntimeRoot>,
    );

    expect(await screen.findByText("Move first.")).toBeOnTheScreen();
    expect(client.getFeatureFlag).toHaveBeenCalledWith("exp-shield-copy-v1");
  });
});
