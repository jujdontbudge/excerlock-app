import { Reveal } from '../../../motion/Reveal';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { onboardingLabels } from '../../../content/onboarding';
import { BlockingScheduleCard } from '../../../design-system/BlockingScheduleCard';
export function ScheduleCard() {
  return (
    <Reveal
      index={3}
      style={{
        position: 'absolute',
        left: art.welcome.card.x,
        top: art.welcome.card.y,
        width: art.welcome.card.width,
      }}>
      <BlockingScheduleCard
        message={c.schedule}
        start={onboardingLabels.introStart}
        end={onboardingLabels.introEnd}
        icon="gym"
      />
    </Reveal>
  );
}
