import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { trendDetailCopy } from '@/content';
import { AccessibleModal, AccessibleModalTitle, PillowCard, PillButton, SettingsRow, colors, space, type } from '@/design-system';
import { firstSearchParam, TrendDetailScreen, type AnalysisRange } from '@/features/analysis';
import { useDemo } from '@/presentation';

export default function TrendDetailRoute() {
  const router = useRouter();
  const { fixture } = useLocalSearchParams<{ fixture?: string | string[] }>();
  const { state } = useDemo();
  const [range, setRange] = useState<AnalysisRange>('week');
  const [comparison, setComparison] = useState('None');
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [periodOffset, setPeriodOffset] = useState(0);
  return (
    <>
      <TrendDetailScreen
        activityCount={state.analysis.activityCount}
        comparison={comparison}
        onBack={() => router.back()}
        onChangeRange={(nextRange) => {
          setRange(nextRange);
          setPeriodOffset(0);
        }}
        onNextPeriod={() => setPeriodOffset((offset) => Math.min(1, offset + 1))}
        onOpenComparison={() => setComparisonOpen(true)}
        onPreviousPeriod={() => setPeriodOffset((offset) => Math.max(-1, offset - 1))}
        periodLabel={periodLabel(range, periodOffset)}
        periodOffset={periodOffset}
        range={range}
        showcase={state.analysis.presentationMode === 'showcase' || firstSearchParam(fixture) === 'showcase'}
        timeLockedMinutes={state.analysis.timeLockedMinutes}
      />
      <AccessibleModal
        accessibilityTitle="Compare with"
        animationType="slide"
        onRequestClose={() => setComparisonOpen(false)}
        style={styles.backdrop}
        visible={comparisonOpen}
      >
        <PillowCard style={styles.card} variant="light">
          <AccessibleModalTitle style={styles.title}>Compare with</AccessibleModalTitle>
          {trendDetailCopy.comparisonOptions.map((option) => (
            <SettingsRow
              key={option}
              onPress={() => {
                setComparison(option);
                setComparisonOpen(false);
              }}
              showChevron={false}
              title={option}
              tone="light"
              value={comparison === option ? '✓' : undefined}
            />
          ))}
          <PillButton fullWidth label="Cancel" onPress={() => setComparisonOpen(false)} variant="text" />
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[3] },
  card: { gap: space[2], padding: space[4] },
  title: { ...type.screenTitle, color: colors.text.ink, marginBottom: space[2] },
});

function periodLabel(range: AnalysisRange, offset: number) {
  if (range === 'month') return offset < 0 ? 'July 2026' : offset > 0 ? 'September 2026' : 'August 2026';
  if (range === 'year') return offset < 0 ? '2025' : offset > 0 ? '2027' : '2026';
  return offset < 0 ? 'Jul 27–Aug 2' : offset > 0 ? 'Aug 10–16' : 'Aug 3–9';
}
