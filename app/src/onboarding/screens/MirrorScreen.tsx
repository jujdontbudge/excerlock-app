import { OnboardingScaffold } from "../components/OnboardingScaffold";
import { useConfessionStore } from "../store/confessionStore";
import type { OnboardingScreenProps } from "./ValuePropScreen";

const FALLBACK_DAILY_MINUTES = 5 * 60;
const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_YEAR = 365;

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

export function MirrorScreen({
  onContinue,
  onBack,
}: OnboardingScreenProps) {
  const confessedDailyMinutes = useConfessionStore(
    (state) => state.confessedDailyMinutes,
  );
  const dailyMinutes = confessedDailyMinutes ?? FALLBACK_DAILY_MINUTES;
  const annualHours = Math.round((dailyMinutes * DAYS_PER_YEAR) / 60);
  const annualDays = Math.round(
    (dailyMinutes * DAYS_PER_YEAR) / MINUTES_PER_DAY,
  );

  return (
    <OnboardingScaffold
      title={`That's ~${annualDays} days a year`}
      body={`${formatHours(dailyMinutes)} hours a day becomes ${annualHours.toLocaleString("en-US")} hours every year.`}
      primaryLabel="Take it back"
      onContinue={onContinue}
      onBack={onBack}
    />
  );
}
