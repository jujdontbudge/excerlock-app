import { Reveal } from '../../../ui/Reveal';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { welcomeCopy as c } from '../welcomeCopy';
import { onboardingLabels } from '../onboardingCopy';
import { BlockingScheduleCard } from '../../../schedule/BlockingScheduleCard';
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
