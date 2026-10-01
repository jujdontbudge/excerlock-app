import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { LockedApps } from '../model/types';
import { illustrationTokens as art } from '../ui/illustrationTokens';
import { tokens as t } from '../ui/tokens';
import { pickerCopy as c } from '../conditions/pickersCopy';
import { finishSelection, restoreSelection, toggleSelection } from './lib/selection';

const appPicker = art.appPicker,
  p = appPicker;

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
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: t.space.md, gap: t.space.md }}>
          <TextInput
            accessibilityLabel={c.search}
            placeholder={c.search}
            placeholderTextColor={p.secondary}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            returnKeyType="search"
            maxLength={80}
            style={[
              appPicker.label,
              {
                height: p.searchHeight,
                paddingVertical: 0,
                textAlignVertical: 'center',
                lineHeight: undefined,
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

export function fakeSelectionSummary(selection: LockedApps) {
  if (selection.isEmpty) return null;
  const ids = restoreSelection(selection);
  if (!ids.length) return { applicationCount: 4, categoryCount: 2 };
  return { applicationCount: ids.filter((id) => id.startsWith('app-')).length, categoryCount: ids.filter((id) => id.startsWith('category-')).length };
}
