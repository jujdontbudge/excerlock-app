import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useReducedMotion } from 'react-native-reanimated';
import { ScrollView } from 'react-native-gesture-handler';

import {
  DottedSeparator,
  GradientScreen,
  PillowCard,
  SettingsRow,
  SwitchRow,
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
      <GradientScreen variant="detail">
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={title} />
        {body ? <Text style={s.body}>{body}</Text> : null}
        {preview}
        {prototypeDisclosure ? <PrototypeLabel>{prototypeDisclosure}</PrototypeLabel> : null}
        {sections.map((section) => (
          <View key={section.id} style={s.cardGap}>
            {section.title ? <SectionLabel>{section.title}</SectionLabel> : null}
            {section.rows.every((row) => row.kind === 'choice') ? (
              <View style={s.cardGap}>
                {section.rows.map((row) => (
                  <SettingsRow
                    accessibilityLabel={`${row.title}${row.selected ? ', selected' : ''}`}
                    disabled={row.disabled}
                    key={row.id}
                    onPress={() => onRowPress(row.id)}
                    selected={Boolean(row.selected)}
                    showChevron={false}
                    subtitle={row.subtitle}
                    title={row.title}
                    value={typeof row.value === 'string' ? row.value : undefined}
                  />
                ))}
              </View>
            ) : (
              <PillowCard padding="none" variant={lightMode ? 'light' : 'grouped'}>
                {section.rows.map((row, index) => (
                  <View key={row.id}>
                    {index > 0 ? <DottedSeparator /> : null}
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
                        accessibilityLabel={row.title}
                        destructive={row.destructive}
                        disabled={row.disabled}
                        onPress={() => onRowPress(row.id)}
                        showChevron
                        subtitle={row.subtitle}
                        title={row.title}
                        tone={lightMode ? 'light' : 'dark'}
                        value={typeof row.value === 'string' ? row.value : undefined}
                      />
                    )}
                  </View>
                ))}
              </PillowCard>
            )}
          </View>
        ))}
        {footer}
      </ScrollView>
      </GradientScreen>
    </Animated.View>
  );
}

const styles = {
  screen: { flex: 1 },
};
