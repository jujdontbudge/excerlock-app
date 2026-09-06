import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ScreenShell,
  Heading,
  PrimaryButton,
  SecondaryButton,
  BottomSheet,
  FakeSystemPrompt,
  Checklist,
  Label,
} from '../index';
import { previewCopy as c } from '../../content/previews';
import { controls } from '../../content/controls';
import { PreviewContent } from './PreviewContent';
import { usePreviewState } from './usePreviewState';
import { previewNames } from './names';
export function PreviewDemo({ name, alternate }: { name: (typeof previewNames)[number]; alternate: boolean }) {
  const state = usePreviewState(alternate, name),
    router = useRouter();
  const show = (component: string, variant: string) =>
    router.replace({ pathname: '/dev', params: { component, variant } });
  const overlay = state.open ? (
    name === 'FakeSystemPrompt' ? (
      <FakeSystemPrompt
        title={c.promptTitle}
        body={c.promptBody}
        onResolve={(granted) => {
          state.setFlag(granted);
          state.setOpen(false);
        }}
      />
    ) : (
      <BottomSheet open title={c.choose} onDismiss={() => state.setOpen(false)}>
        {name === 'TimeRangeRow' ? (
          <DateTimePicker
            value={state.which === 'start' ? state.start : state.end}
            mode="time"
            display="spinner"
            onChange={(_, date) => {
              if (date) (state.which === 'start' ? state.setStart : state.setEnd)(date);
            }}
          />
        ) : (
          <Checklist items={c.checklist} completed={2} />
        )}
        <PrimaryButton label={controls.done} onPress={() => state.setOpen(false)} />
      </BottomSheet>
    )
  ) : undefined;
  return (
    <ScreenShell
      overlay={overlay}
      footer={
        <>
          <PrimaryButton
            label={c.next}
            onPress={() => show(previewNames[(previewNames.indexOf(name) + 1) % previewNames.length], 'default')}
          />
          <SecondaryButton label={c.variants} onPress={() => show(name, alternate ? 'default' : 'alternate')} />
          <SecondaryButton label={c.gallery} variant="tertiary" onPress={() => router.replace('/dev')} />
        </>
      }>
      <Heading title={name} support={alternate ? c.alternate : c.standard} />
      <PreviewContent name={name} alternate={alternate} state={state} />
      <Label accessibilityLabel="preview-ready" />
    </ScreenShell>
  );
}
