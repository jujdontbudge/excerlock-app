import { useState } from 'react';
import { BottomSheet, Heading, Label, PrimaryButton, ChoiceRow } from '../../design-system';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { useDevSnapshot } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { sessionCopy as c } from '../../content/sessions';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
export function CheckInSheet({
  onDismiss,
  onChooseGym,
  arrival,
}: {
  arrival: boolean;
  onDismiss: () => void;
  onChooseGym: () => void;
}) {
  const runtime = useRuntime(),
    gyms = useSettingsStore((s) => s.data.gymPlaces),
    { presence } = useDevSnapshot(),
    [id, setId] = useState(gyms[0]?.id),
    [state, setState] = useState<'idle' | 'busy' | 'success' | 'error'>('idle'),
    gym = gyms.find((g) => g.id === id),
    inside = presence === 'inside';
  const check = async () => {
    if (!gym || !inside || state === 'busy') return;
    setState('busy');
    try {
      await runtime.gym.checkIn(gym.id);
      setState('success');
    } catch {
      setState('error');
    }
  };
  return (
    <BottomSheet
      open
      title={c.checkin}
      onDismiss={onDismiss}
      footer={
        <PrimaryButton
          label={state === 'success' ? c.done : gym ? c.checkin : c.chooseGym}
          disabled={!!gym && !inside && state !== 'success'}
          loading={state === 'busy'}
          onPress={state === 'success' ? onDismiss : gym ? () => void check() : onChooseGym}
        />
      }>
      <LivingIcon name={state === 'success' ? 'check' : 'gym'} />
      <Reveal key={state}>
        <Heading
          title={state === 'success' ? c.checkedIn : gym ? c.at(gym.name) : c.noGym}
          support={
            state === 'success'
              ? arrival
                ? c.success
                : c.timeSuccess
              : gym
                ? inside
                  ? c.inside
                  : c.outside
                : undefined
          }
        />
      </Reveal>
      {state !== 'success' && gyms.length > 1
        ? gyms.map((g) => <ChoiceRow key={g.id} title={g.name} selected={id === g.id} onPress={() => setId(g.id)} />)
        : null}
      {state === 'error' ? (
        <Reveal>
          <Label accessibilityRole="alert">{c.error}</Label>
        </Reveal>
      ) : null}
    </BottomSheet>
  );
}
