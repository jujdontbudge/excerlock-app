import { Reveal } from '../../../motion/Reveal';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { onboardingLabels } from '../../../content/onboarding';
import { BlockingScheduleCard } from '../../../design-system/BlockingScheduleCard';
export function ScheduleCard() {
  return (
    <Reveal index={3} style={{ position: 'absolute', left: w.card.x, top: w.card.y, width: w.card.width }}>
      <BlockingScheduleCard
        message={c.schedule}
        start={onboardingLabels.introStart}
        end={onboardingLabels.introEnd}
        icon="gym"
      />
    </Reveal>
  );
}
