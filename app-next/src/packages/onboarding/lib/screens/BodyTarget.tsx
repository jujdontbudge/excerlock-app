import { View } from 'react-native';
import { Heading, RulerSlider } from '../../../ui';
import { Reveal } from '../../../ui/Reveal';
import { tokens as t } from '../../../ui/tokens';
import { AnswerProps } from '../types';
import { bodyTargetPounds, bodyTargets, bodyTargetUnit, BodyTargetStep } from '../bodyTargetCopy';
export function BodyTarget({ step, answers, setAnswer }: AnswerProps & { step: BodyTargetStep }) {
  const target = bodyTargets[step];
  return (
    <>
      <Reveal>
        <Heading title={target.title} centered />
      </Reveal>
      <View style={{ flexGrow: 1, justifyContent: 'center', paddingBottom: t.space.xxl }}>
        <Reveal index={1}>
          <RulerSlider
            label={target.title}
            caption={target.caption}
            unit={bodyTargetUnit}
            value={bodyTargetPounds(answers, step)}
            min={target.min}
            max={target.max}
            onChange={(pounds) => setAnswer(target.key, pounds)}
          />
        </Reveal>
      </View>
    </>
  );
}
