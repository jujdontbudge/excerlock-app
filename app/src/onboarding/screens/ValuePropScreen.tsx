import { Card, Glyph, useTheme } from "@/ui";
import type { AccountModule } from "@/account";

import { OnboardingScaffold } from "../components/OnboardingScaffold";

export type OnboardingScreenProps = {
  account?: AccountModule;
  onContinue: () => void;
  onBack?: () => void;
};

export function ValuePropScreen({ onContinue }: OnboardingScreenProps) {
  const { colors, spacing } = useTheme();

  return (
    <OnboardingScaffold
      title="Earn your screen time"
      body="Turn movement and healthy habits into time on the apps you choose."
      primaryLabel="Get started"
      onContinue={onContinue}
    >
      <Card style={{ alignSelf: "center", padding: spacing.xl }}>
        <Glyph name="lock" size={64} color={colors.textPrimary} />
      </Card>
    </OnboardingScaffold>
  );
}
