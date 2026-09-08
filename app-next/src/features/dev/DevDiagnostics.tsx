import { useState } from 'react';
import { syncLog as useSyncLog } from '../../adapters/sync/syncLog';
import { devCopy as c } from '../../content/dev';
import { syncCopy } from '../../content/sync';
import { getDiagnosticsLog } from '../../diagnostics/accessor';
import { Label, SettingsGroup, SettingsRow } from '../../design-system';
import { PendingNotification } from '../../ports/NotificationsPort';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { resetTodaysProgress } from './resetToday';
import { throwTestCrash } from './testCrash';

/**
 * The controls the device runbook needs and the product must never have.
 *
 * Every scenario in `docs/verification` is run on a phone with no debugger attached, so each of these
 * answers a question that is otherwise unanswerable there: whether the day can be run again without
 * reinstalling (which would cost the Screen Time authorization), what the notification centre is
 * actually holding, whether an unhandled error reaches Sentry from this build, and what sync has been
 * doing while the product UI stayed silent about it.
 *
 * The whole group renders only behind the dev flag, because `DevMenu` is the only thing that mounts
 * it and `runtime/devFlag` gates the route.
 */
export function DevDiagnostics() {
  const runtime = useRuntime();
  const entries = useSyncLog((state) => state.entries);
  const lastPushAt = useSyncLog((state) => state.lastPushAt);
  const authRequired = useSyncLog((state) => state.authRequired);
  const [pending, setPending] = useState<PendingNotification[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const log = getDiagnosticsLog();

  const showPending = async () => {
    setPending(await runtime.notifications.pending());
  };
  const crash = async () => {
    log.append('sentry.testCrash', {});
    // Flushed first: the throw is meant to end the process, and an unwritten log proves nothing.
    await log.flush();
    throwTestCrash();
  };

  return (
    <>
      <SettingsGroup title={c.diagnostics}>
        <SettingsRow
          title={c.resetToday}
          value={note ?? undefined}
          onPress={() => {
            resetTodaysProgress(runtime.clock);
            setNote(c.resetTodayDone);
          }}
        />
        <SettingsRow title={c.pendingNotifications} onPress={() => void showPending()} />
        {pending?.length === 0 ? <Label>{c.noPending}</Label> : null}
        {pending?.map((request) => (
          <Label key={request.id}>
            {request.id} {request.at ?? '—'}
          </Label>
        ))}
        <SettingsRow title={c.testCrash} destructive onPress={() => void crash()} />
        <SettingsRow title={c.clearLog} value={c.logSize(log.entries().length)} onPress={() => void log.clear()} />
      </SettingsGroup>
      <SettingsGroup title={syncCopy.logTitle}>
        <Label>{authRequired ? syncCopy.logPaused : lastPushAt ? syncCopy.lastPush(lastPushAt) : syncCopy.neverPushed}</Label>
        {entries.length ? (
          entries
            .slice(-20)
            .reverse()
            .map((entry) => (
              <Label key={`${entry.at}-${entry.message}`} tone={entry.level === 'error' ? 'primary' : 'secondary'}>
                {entry.at} {entry.level} {entry.message}
              </Label>
            ))
        ) : (
          <Label>{syncCopy.logEmpty}</Label>
        )}
        <SettingsRow title={syncCopy.clearLog} onPress={() => useSyncLog.getState().clear()} />
      </SettingsGroup>
    </>
  );
}
