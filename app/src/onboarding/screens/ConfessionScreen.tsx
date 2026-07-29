import { useState } from "react";

import { MinutesSlider } from "../components/MinutesSlider";
import { OnboardingScaffold } from "../components/OnboardingScaffold";
import { useConfessionStore } from "../store/confessionStore";
import type { OnboardingScreenProps } from "./ValuePropScreen";

const INITIAL_DAILY_MINUTES = 5 * 60;

export function ConfessionScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  const persistedMinutes = useConfessionStore(
    (state) => state.confessedDailyMinutes,
  );
  const setConfessedDailyMinutes = useConfessionStore(
    (state) => state.setConfessedDailyMinutes,
  );
  const [minutes, setMinutes] = useState(
    persistedMinutes ?? INITIAL_DAILY_MINUTES,
  );

  const saveAndContinue = () => {
    setConfessedDailyMinutes(minutes);
    onContinue();
  };

  return (
    <OnboardingScaffold
      title="How much time do you spend on your phone each day?"
      body="Your best guess is enough. Move the slider from 1 to 12+ hours."
      content={<MinutesSlider value={minutes} onChange={setMinutes} />}
      primaryLabel="Continue"
      onContinue={saveAndContinue}
      onBack={onBack}
    />
  );
}
