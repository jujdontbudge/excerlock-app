import { DisplayPreviews } from './DisplayPreviews';
import { View } from 'react-native';
import * as UI from '../index';
import { tokens as t } from '../tokens';
import { previewCopy as c } from '../../content/previews';
import { controls } from '../../content/controls';
import { usePreviewState } from './usePreviewState';
export function PreviewContent({
  name,
  alternate,
  state: s,
}: {
  name: string;
  alternate: boolean;
  state: ReturnType<typeof usePreviewState>;
}) {
  switch (name) {
    case 'ScreenShell':
      return <UI.Label>{c.shellBody}</UI.Label>;
    case 'Heading':
      return (
        <UI.Heading
          title={c.heading}
          support={c.support}
          variant={alternate ? 'hero' : 'question'}
          centered={alternate}
        />
      );
    case 'PrimaryButton':
      return (
        <View style={{ gap: t.space.lg }}>
          <UI.PrimaryButton label={controls.continue} onPress={s.toggle} disabled={alternate} />
          <UI.PrimaryButton label={controls.continue} onPress={s.toggle} loading />
        </View>
      );
    case 'SecondaryButton':
      return (
        <UI.SecondaryButton
          label={controls.continue}
          onPress={s.toggle}
          variant={alternate ? 'tertiary' : 'secondary'}
        />
      );
    case 'PressableScale':
      return (
        <UI.PressableScale label={c.startWalk} onPress={s.toggle}>
          <UI.Label>{s.flag ? c.unlocked : c.startWalk}</UI.Label>
        </UI.PressableScale>
      );
    case 'ChoiceRow':
      return (
        <UI.ChoiceRow
          title={c.selected}
          support={c.selectionSupport}
          icon="walking"
          selected={s.flag}
          recommended
          onPress={s.toggle}
        />
      );
    case 'ActivityCard':
      return <UI.ActivityCard activity="walking" title={c.walk} selected={s.flag} onPress={s.toggle} />;
    case 'ChoiceGrid':
      return <UI.ChoiceGrid selected={s.activity} onChange={s.setActivity} />;
    case 'TextField':
      return (
        <UI.TextField
          label={c.name}
          value={s.text}
          onChangeText={s.setText}
          error={alternate ? c.nameError : undefined}
        />
      );
    case 'NumberField':
      return (
        <UI.NumberField
          label={c.distance}
          value={s.text}
          onChange={s.setText}
          unit={s.unit}
          units={['km', 'mi']}
          onUnitChange={s.setUnit}
        />
      );
    case 'Slider':
      return (
        <View style={{ gap: t.space.xl }}>
          <UI.Label variant="metric">{s.number}</UI.Label>
          <UI.Slider label={c.hours} value={s.number} min={0} max={12} step={0.5} onChange={s.setNumber} />
        </View>
      );
    case 'DayPicker':
      return <UI.DayPicker days={s.days} onChange={s.setDays} />;
    case 'TimeRangeRow':
      return (
        <UI.TimeRangeRow
          start={s.start.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
          end={s.end.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
          allDay={s.flag}
          onAllDay={s.setFlag}
          onChoose={s.chooseTime}
        />
      );
    case 'SegmentedControl':
      return <UI.SegmentedControl options={c.periods} value={s.period} onChange={s.setPeriod} />;
    case 'SettingsGroup':
      return (
        <UI.SettingsGroup title={c.preferences}>
          <UI.SettingsRow title={c.units} icon="ruler" value={c.miles} onPress={s.toggle} />
          <UI.SettingsRow title={c.haptics} icon="bell" toggle={s.flag} onToggle={s.setFlag} />
        </UI.SettingsGroup>
      );
    case 'SettingsRow':
      return <UI.SettingsRow title={c.units} icon="ruler" value={c.miles} onPress={s.toggle} />;
    case 'PermissionRow':
      return (
        <UI.PermissionRow title={c.health} icon="heart" status={s.flag ? 'Granted' : 'Needed'} onPress={s.toggle} />
      );
    default:
      return <DisplayPreviews name={name} alternate={alternate} state={s} />;
  }
}
