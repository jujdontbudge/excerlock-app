import { View } from 'react-native';
import { Heading, ChoiceRow, NumberField, SecondaryButton, Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { walkingCopy as c } from '../../content/rules';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { RuleDraft, DraftAction } from './draft';
export function WalkingScreen({
  step,
  draft: d,
  onAction,
  contentOnly = false,
}: {
  step: 'W1' | 'W2' | 'W3';
  contentOnly?: boolean;
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const valid = Number.isFinite(d.stepGoal) && d.stepGoal >= 500 && d.stepGoal <= 30000 && d.stepGoal % 500 === 0;
  return (
    <>
      {!contentOnly ? (
        <>
          <Heading title={c[step].title} support={c[step].body} />
          <LivingIcon
            name={step === 'W2' && d.walkingMode === 'state' ? 'lock-open' : 'walking'}
            size={t.layout.ring}
          />
        </>
      ) : null}
      {step === 'W1'
        ? c.places.map((p, index) => (
            <Reveal key={p.id} index={index + 1}>
              <ChoiceRow
                title={p.title}
                support={p.support}
                recommended={p.id === 'outside'}
                selected={d.place === p.id}
                onPress={() => onAction({ type: 'setPlace', value: p.id })}
              />
            </Reveal>
          ))
        : null}
      {step === 'W2'
        ? c.modes.map((m, index) => (
            <Reveal key={m.id} index={index + 1}>
              <ChoiceRow
                title={m.title}
                support={m.support}
                recommended={m.id === 'target'}
                selected={d.walkingMode === m.id}
                onPress={() => onAction({ type: 'setWalkingMode', value: m.id })}
              />
            </Reveal>
          ))
        : null}
      {step === 'W3' ? (
        <Reveal index={1} style={{ gap: t.space.lg }}>
          <NumberField
            label={c.goal}
            value={Number.isNaN(d.stepGoal) ? '' : String(d.stepGoal)}
            unit={c.unit}
            onChange={(value) => onAction({ type: 'setStepGoal', value: value.trim() ? Number(value) : NaN })}
            error={valid ? undefined : c.range}
          />
          <View style={{ flexDirection: 'row', gap: t.space.md }}>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={c.remove}
                disabled={!valid || d.stepGoal <= 500}
                onPress={() => onAction({ type: 'setStepGoal', value: d.stepGoal - 500 })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <SecondaryButton
                label={c.add}
                disabled={!valid || d.stepGoal >= 30000}
                onPress={() => onAction({ type: 'setStepGoal', value: d.stepGoal + 500 })}
              />
            </View>
          </View>
          {valid ? (
            <Reveal key={d.stepGoal}>
              <Label tone="secondary">{c.helper(d.stepGoal)}</Label>
            </Reveal>
          ) : null}
        </Reveal>
      ) : null}
    </>
  );
}
