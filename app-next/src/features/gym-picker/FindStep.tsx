import { ActivityIndicator, Pressable, View } from 'react-native';
import { Label, TextField, SecondaryButton } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { Reveal } from '../../motion/Reveal';
import { gymPickerCopy as c } from '../../content/gymPicker';
import { PickerState } from './usePicker';
function Match({ text, query }: { text: string; query: string }) {
  const index = query.trim() ? text.toLowerCase().indexOf(query.trim().toLowerCase()) : -1;
  return (
    <Label variant="label">
      {index < 0 ? (
        text
      ) : (
        <>
          {text.slice(0, index)}
          <Label variant="label" style={{ color: t.text.primary }}>
            {text.slice(index, index + query.trim().length)}
          </Label>
          {text.slice(index + query.trim().length)}
        </>
      )}
    </Label>
  );
}
function Row({
  title,
  subtitle,
  query = '',
  showLocationIcon = false,
  onPress,
  disabled = false,
}: {
  title: string;
  subtitle: string;
  query?: string;
  showLocationIcon?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.lg,
        paddingVertical: t.space.lg,
        borderBottomWidth: t.stroke.hairline,
        borderBottomColor: t.border.divider,
      }}>
      {showLocationIcon ? (
        <View style={{ backgroundColor: t.surface.selected, borderRadius: t.radius.field, padding: t.space.md }}>
          <Icon name="map-pin" variant="utility" size={t.layout.glyph} tint={t.brand.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: t.space.xs }}>
        <Match text={title} query={query} />
        <Label variant="support" tone="secondary">
          {subtitle}
        </Label>
      </View>
    </Pressable>
  );
}
export function FindStep({ picker: p }: { picker: PickerState }) {
  const typing = !!p.query.trim();
  return (
    <>
      <TextField
        hideLabel
        label={c.search}
        placeholder={c.search}
        value={p.query}
        onChangeText={p.setQuery}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {p.location ? (
        <Row title={c.current} subtitle={c.currentSupport} showLocationIcon onPress={() => p.drop(p.location!)} />
      ) : null}
      {!p.location && !typing ? (
        <SecondaryButton label={c.enableLocation} disabled={p.locating} onPress={() => void p.requestLocation()} />
      ) : null}
      {p.searching || p.busy ? <ActivityIndicator accessibilityLabel={c.loading} color={t.brand.primary} /> : null}
      {p.error ? (
        <View style={{ gap: t.space.md }}>
          <Label accessibilityRole="alert" tone="secondary">
            {p.error}
          </Label>
          <SecondaryButton label={c.retry} onPress={p.retry} />
        </View>
      ) : null}
      {typing ? (
        <View>
          <Label variant="support" tone="secondary">
            {c.results}
          </Label>
          {p.suggestions.map((s, index) => (
            <Reveal key={s.id} index={index}>
              <Row
                title={s.title}
                subtitle={s.subtitle}
                query={p.query}
                disabled={p.busy}
                onPress={() => void p.pickSuggestion(s)}
              />
            </Reveal>
          ))}
          {!p.searching && !p.suggestions.length && !p.error ? (
            <Label tone="secondary" style={{ paddingVertical: t.space.lg }}>
              {c.empty}
            </Label>
          ) : null}
        </View>
      ) : (
        <>
          {p.nearby.length ? (
            <View>
              <Label variant="support" tone="secondary">
                {c.nearby}
              </Label>
              {p.nearby.map((s, index) => (
                <Reveal key={s.id} index={index}>
                  <Row title={s.name} subtitle={s.address} onPress={() => p.choose(s)} />
                </Reveal>
              ))}
            </View>
          ) : null}
        </>
      )}
      <SecondaryButton label={c.drop} onPress={() => p.drop()} />
    </>
  );
}
