import * as UI from '../index';
import { previewCopy as c } from '../../content/previews';
import { conditionStatus } from '../../domain/conditionState';
import { usePreviewState } from './usePreviewState';
export function DisplayPreviews({
  name,
  alternate,
  state: s,
}: {
  name: string;
  alternate: boolean;
  state: ReturnType<typeof usePreviewState>;
}) {
  switch (name) {
    case 'StatTile':
      return <UI.StatTile label={c.steps} value={alternate ? '—' : '3,200'} support={c.today} />;
    case 'StreakBadge':
      return <UI.StreakBadge count={alternate ? 0 : 7} />;
    case 'ProgressBar':
      return <UI.ProgressBar label={c.walk} value={alternate ? 1 : 0.64} />;
    case 'ProgressRing':
      return <UI.ProgressRing label={c.walk} value={alternate ? 1 : 0.64} />;
    case 'BarChart':
      return (
        <UI.BarChart label={c.chart} data={alternate ? c.bars.map((d) => ({ ...d, comparison: 4200 })) : c.bars} />
      );
    case 'LineChart':
      return (
        <UI.LineChart
          label={c.trend}
          values={[3, 4, 3, 5, 2, 1]}
          comparison={alternate ? [4, 5, 4, 6, 7, 8] : undefined}
          startLabel={c.now}
          endLabel={c.goal}
        />
      );
    case 'DotGrid':
      return <UI.DotGrid total={200} emphasized={alternate ? 140 : 60} label={c.dots} />;
    case 'LoopDiagram':
      return <UI.LoopDiagram phase={alternate ? 2 : 0} labels={c.loop} />;
    case 'Checklist':
      return <UI.Checklist items={c.checklist} completed={alternate ? 3 : 1} />;
    case 'TrialTimeline':
      return <UI.TrialTimeline milestones={c.timeline} />;
    case 'ScheduleWidget':
      return (
        <UI.ScheduleWidget
          start={c.start}
          end={c.end}
          status={alternate ? c.unlocked : c.locked}
          unlocked={alternate}
        />
      );
    case 'StatusCard':
      return (
        <UI.StatusCard
          title={alternate ? c.unlocked : c.locked}
          subtitle={c.statusSupport}
          nextChange={c.until}
          unlocked={alternate}
        />
      );
    case 'ProgressCard':
      return (
        <UI.ProgressCard
          title={c.walk}
          icon="walking"
          value={alternate ? 1 : 0.64}
          detail={c.detail}
          action={c.startWalk}
          onAction={s.toggle}
        />
      );
    case 'RuleCard':
      return (
        <UI.RuleCard
          title={c.walk}
          schedule={c.schedule}
          icon="walking"
          enabled={s.flag}
          status={conditionStatus(s.flag ? 'blockingNow' : 'paused')}
          onOpen={s.toggle}
          onToggle={s.setFlag}
          onDelete={() => s.setOpen(true)}
        />
      );
    case 'EmptyState':
      return <UI.EmptyState icon="list" title={c.empty} body={c.emptyBody} action={c.add} onAction={s.toggle} />;
    case 'BottomSheet':
      return <UI.PrimaryButton label={c.open} onPress={() => s.setOpen(true)} />;
    case 'OnboardingHeader':
      return (
        <UI.OnboardingHeader
          progress={alternate ? 0.8 : 0.3}
          onBack={s.toggle}
          onClose={alternate ? s.toggle : undefined}
        />
      );
    case 'TabBar':
      return <UI.TabBar selected={s.tab} onSelect={s.setTab} />;
    case 'FakeSystemPrompt':
      return <UI.PrimaryButton label={c.prompt} onPress={() => s.setOpen(true)} />;
    default:
      return null;
  }
}
