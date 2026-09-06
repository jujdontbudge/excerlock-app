import { previews } from '../__previews__/registry';
test('every contracted component has a real preview in the dev gallery', () => {
  const required = [
    'ScreenShell',
    'Heading',
    'PrimaryButton',
    'SecondaryButton',
    'PressableScale',
    'ChoiceRow',
    'ActivityCard',
    'ChoiceGrid',
    'TextField',
    'NumberField',
    'Slider',
    'DayPicker',
    'TimeRangeRow',
    'SegmentedControl',
    'SettingsGroup',
    'SettingsRow',
    'PermissionRow',
    'StatTile',
    'StreakBadge',
    'ProgressBar',
    'ProgressRing',
    'BarChart',
    'LineChart',
    'DotGrid',
    'LoopDiagram',
    'Checklist',
    'TrialTimeline',
    'ScheduleWidget',
    'StatusCard',
    'ProgressCard',
    'RuleCard',
    'EmptyState',
    'BottomSheet',
    'OnboardingHeader',
    'TabBar',
    'FakeSystemPrompt',
  ];
  expect(previews.map((p) => p.name).sort()).toEqual(required.sort());
  for (const preview of previews) {
    expect(preview.variants.length).toBeGreaterThan(0);
    for (const variant of preview.variants) expect(variant.element).toBeTruthy();
  }
});
