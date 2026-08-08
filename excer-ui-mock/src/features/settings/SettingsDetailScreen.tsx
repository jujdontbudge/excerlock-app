import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';

import {
  GradientScreen,
  PillowCard,
  SettingsRow,
  SwitchRow,
  colors,
  motion,
} from '@/design-system';

import { PrototypeLabel, SectionLabel, SettingsHeader, settingsFeatureStyles as s } from './components';

export type SettingsDetailRow = {
  destructive?: boolean;
  disabled?: boolean;
  id: string;
  kind?: 'navigation' | 'action' | 'toggle' | 'choice';
  selected?: boolean;
  subtitle?: string;
  title: string;
  value?: boolean | string;
};

export type SettingsDetailSection = {
  id: string;
  rows: readonly SettingsDetailRow[];
  title?: string;
};

export interface SettingsDetailScreenProps {
  body?: string;
  footer?: ReactNode;
  lightMode?: boolean;
  onBack: () => void;
  onRowPress: (rowId: string) => void;
  onToggle: (rowId: string, value: boolean) => void;
  preview?: ReactNode;
  prototypeDisclosure?: string;
  sections: readonly SettingsDetailSection[];
  title: string;
}

export function SettingsDetailScreen({ body, footer, lightMode = false, onBack, onRowPress, onToggle, preview, prototypeDisclosure, sections, title }: SettingsDetailScreenProps) {
  const appearanceOpacity = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    appearanceOpacity.setValue(0);
    Animated.timing(appearanceOpacity, {
      duration: reducedMotion ? 0 : motion.duration.standard,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [appearanceOpacity, lightMode, reducedMotion]);

  return (
    <Animated.View style={[styles.screen, { opacity: appearanceOpacity }]}>
      <GradientScreen variant={lightMode ? 'ivory' : 'detail'}>
        <StatusBar style={lightMode ? 'dark' : 'light'} />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader light={lightMode} onBack={onBack} title={title} />
        {body ? <Text style={[s.body, lightMode && styles.inkSecondary]}>{body}</Text> : null}
        {preview}
        {prototypeDisclosure ? <PrototypeLabel light={lightMode}>{prototypeDisclosure}</PrototypeLabel> : null}
        {sections.map((section) => (
          <View key={section.id} style={s.cardGap}>
            {section.title ? <SectionLabel light={lightMode}>{section.title}</SectionLabel> : null}
            <PillowCard padding="none" variant={lightMode ? 'light' : 'grouped'}>
              {section.rows.map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <View style={s.divider} /> : null}
                  {row.kind === 'toggle' ? (
                    <SwitchRow
                      disabled={row.disabled}
                      onValueChange={(value) => onToggle(row.id, value)}
                      subtitle={row.subtitle}
                      title={row.title}
                      value={Boolean(row.value)}
                    />
                  ) : (
                    <SettingsRow
                      accessibilityLabel={`${row.title}${row.selected ? ', selected' : ''}`}
                      destructive={row.destructive}
                      disabled={row.disabled}
                      onPress={() => onRowPress(row.id)}
                      showChevron={row.kind !== 'choice'}
                      subtitle={row.subtitle}
                      title={row.title}
                      tone={lightMode ? 'light' : 'dark'}
                      value={typeof row.value === 'string' ? row.value : row.selected ? '✓' : undefined}
                    />
                  )}
                </View>
              ))}
            </PillowCard>
          </View>
        ))}
        {footer}
      </ScrollView>
      </GradientScreen>
    </Animated.View>
  );
}

const styles = {
  inkSecondary: { color: colors.text.ink, opacity: 0.72 },
  screen: { flex: 1 },
};
