import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LockedApps } from '../../domain/types';
import { illustrationTokens as art } from '../../design-system/illustrationTokens';
import { tokens as t } from '../../design-system/tokens';
import { pickerCopy as c } from '../../content/pickers';
import { finishSelection, restoreSelection, toggleSelection } from './selection';

const appPicker = art.appPicker,
  p = appPicker;

/**
 * The simulator demo's stand-in for Apple's Screen Time app picker, which only a real iPhone can
 * show. It copies Apple's sheet: Cancel, the title and Done across the top, a search field, and
 * the categories in an inset list with round checkboxes; searching also finds single apps. It
 * exists only in development builds on the fake runtime and never ships.
 */
export function FakeAppPicker({
  initial,
  onResolve,
}: {
  initial: LockedApps;
  onResolve: (result: boolean | LockedApps) => void;
}) {
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState(() => restoreSelection(initial)),
    search = query.trim().toLowerCase(),
    categories = c.options.filter((o) => o.kind === 'category'),
    options = search ? c.options.filter((o) => o.title.toLowerCase().includes(search)) : categories,
    everything = categories.every((o) => selected.includes(o.id));
  const toggleAll = () => setSelected(everything ? [] : [...new Set([...selected, ...categories.map((o) => o.id)])]);
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onResolve(false)}>
      <View style={{ flex: 1, backgroundColor: p.background }}>
        <View
          style={{
            height: t.control.full,
            paddingHorizontal: t.space.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <NavButton label={c.cancel} onPress={() => onResolve(false)} />
          <Text accessibilityRole="header" style={[appPicker.navTitle, { color: p.text }]}>
            {c.title}
          </Text>
          <NavButton label={c.done} strong onPress={() => onResolve(finishSelection(selected))} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: t.space.md, gap: t.space.md }}>
          <TextInput
            accessibilityLabel={c.search}
            placeholder={c.search}
            placeholderTextColor={p.secondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            style={[
              appPicker.label,
              {
                height: p.searchHeight,
                borderRadius: p.searchRadius,
                paddingHorizontal: t.space.md,
                backgroundColor: p.search,
                color: p.text,
              },
            ]}
          />
          <View
            style={{ backgroundColor: p.row, borderRadius: p.radius, borderCurve: 'continuous', overflow: 'hidden' }}>
            {search ? null : <Row title={c.all} checked={everything} onPress={toggleAll} first />}
            {options.map((o, index) => (
              <Row
                key={o.id}
                title={o.title}
                checked={selected.includes(o.id)}
                onPress={() => setSelected(toggleSelection(selected, o.id))}
                chevron={o.kind === 'category'}
                first={Boolean(search) && index === 0}
              />
            ))}
            {options.length ? null : (
              <View style={{ height: p.rowHeight, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={[appPicker.label, { color: p.secondary }]}>{c.noResults}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function NavButton({ label, strong = false, onPress }: { label: string; strong?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={t.space.sm}
      style={{ minHeight: t.control.inline, justifyContent: 'center' }}>
      <Text style={[strong ? appPicker.navTitle : appPicker.nav, { color: p.tint }]}>{label}</Text>
    </Pressable>
  );
}

function Row({
  title,
  checked,
  onPress,
  chevron = false,
  first = false,
}: {
  title: string;
  checked: boolean;
  onPress: () => void;
  chevron?: boolean;
  first?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={title}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={{
        height: p.rowHeight,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: t.space.md,
        gap: t.space.md,
      }}>
      <Svg width={p.circleSize} height={p.circleSize} viewBox="0 0 24 24">
        {checked ? (
          <>
            <Path d="M12 0 a12 12 0 1 0 0.01 0 Z" fill={p.tint} />
            <Path
              d={p.checkPath}
              stroke={p.check}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </>
        ) : (
          <Path d="M12 0.75 a11.25 11.25 0 1 0 0.01 0 Z" stroke={p.circle} strokeWidth={p.circleStroke} fill="none" />
        )}
      </Svg>
      <View
        style={{
          flex: 1,
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          paddingRight: t.space.md,
          borderTopWidth: first ? 0 : t.stroke.hairline,
          borderColor: p.separator,
        }}>
        <Text numberOfLines={1} style={[appPicker.label, { flex: 1, color: p.text }]}>
          {title}
        </Text>
        {chevron ? (
          <Svg width={p.chevron.width} height={p.chevron.height} viewBox="0 0 8 13">
            <Path
              d={p.chevronPath}
              stroke={p.circle}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        ) : null}
      </View>
    </Pressable>
  );
}
