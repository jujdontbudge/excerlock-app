import { useEffect, useState } from 'react';
import { SettingsPage } from '../settings/SettingsPage';
import { Heading, Label, SecondaryButton, SettingsGroup, SettingsRow } from '../../design-system';
import { sensorSmokeCopy as c } from '../../content/diagnostics';
import { useRuntime } from '../../ports/useRuntime';
import {
  runSensorStreamSmoke,
  type SensorRecorderSmokeResult,
  type SensorStreamSmokeReport,
  type SensorStreamSmokeResult,
} from '../../runtime/detection/sensorStreams';

export function SensorSmokeScreen({ onBack = () => {}, sampleWindowMs = 1_500 }: { onBack?: () => void; sampleWindowMs?: number }) {
  const runtime = useRuntime(),
    sensors = runtime.sensors,
    [runId, setRunId] = useState(0),
    [result, setResult] = useState<{ runId: number; report: SensorStreamSmokeReport } | null>(null);
  useEffect(() => {
    if (!sensors) return;
    let live = true;
    void runSensorStreamSmoke(sensors, { sampleWindowMs }).then((report) => {
      if (live) setResult({ runId, report });
    });
    return () => {
      live = false;
    };
  }, [sensors, sampleWindowMs, runId]);
  const report = result?.runId === runId ? result.report : null,
    running = report === null;
  if (!sensors)
    return (
      <SettingsPage onBack={onBack}>
        <Heading title={c.title} support={c.support} />
        <Label accessibilityRole="alert">{c.noNative}</Label>
      </SettingsPage>
    );
  const mismatches = report ? report.streams.filter((stream) => !stream.ok).length + (report.recorder.ok ? 0 : 1) : 0;
  return (
    <SettingsPage
      onBack={onBack}
      footer={<SecondaryButton label={c.runAgain} disabled={running} onPress={() => setRunId((id) => id + 1)} />}>
      <Heading title={c.title} support={c.support} />
      <Label accessibilityRole="alert">
        {!report ? c.running : mismatches === 0 ? c.honest(report.streams.length) : c.mismatches(mismatches)}
      </Label>
      {report ? (
        <>
          <SettingsGroup title={c.streams}>
            <SettingsRow title={c.runs} value={String(runId + 1)} />
            {report.streams.map((stream) => (
              <SettingsRow key={stream.id} title={c.streamTitle[stream.id]} subtitle={describeStream(stream)} />
            ))}
            <SettingsRow title={c.recorder} subtitle={describeRecorder(report.recorder)} />
          </SettingsGroup>
          <SettingsGroup title={c.availability}>
            <SettingsRow title={c.motionAccess} value={report.authorization} />
            {Object.entries(report.availability).map(([flag, value]) => (
              <SettingsRow key={flag} title={flag} value={value ? c.yes : c.no} />
            ))}
          </SettingsGroup>
        </>
      ) : null}
    </SettingsPage>
  );
}

function describeStart(start: SensorStreamSmokeResult['start']): string {
  if (start.outcome === 'started') return c.started;
  if (start.outcome === 'skipped') return c.skipped(start.code ?? '');
  return c.rejected(start.code ?? '');
}

function describeStream(stream: SensorStreamSmokeResult): string {
  const parts = [stream.available ? c.available : c.unavailable, describeStart(stream.start)];
  if (stream.start.outcome === 'started') parts.push(c.samples(stream.samples));
  parts.push(stream.stop.outcome === 'stopped' ? c.stopped : c.stopFailed(stream.stop.code ?? ''));
  return parts.join(' · ');
}

function describeRecorder(recorder: SensorRecorderSmokeResult): string {
  const outcome = recorder.outcome === 'recorded' ? c.recorded
    : recorder.outcome === 'skipped' ? c.skipped(recorder.code ?? '')
    : c.rejected(recorder.code ?? '');
  return `${recorder.available ? c.available : c.unavailable} · ${outcome}`;
}
