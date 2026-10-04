import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useRuntime } from '../../ports/useRuntime';
import type { GymLocationFix } from '../../ports/GymPort';
import { settingsStore as useSettingsStore } from '../../preferences/settingsStore';
import { permissionsStore as usePermissionsStore } from '../../permissions/permissionsStore';
import { distanceMetres } from '../../gyms/geometry';
import { gymDistance } from '../../gyms/gymDistance';
import { GYM_FIX_RETRY_MS, GYM_FIX_SAMPLE_MS, GYM_CONFIRM_RECHECK_MS, GymCheckInError, gymFixStatus, gymWait, requestGymFix } from '../../activity/gymFix';
import { PRESENCE_CONFIRM_MS } from '../../activity/presence';
import { ruleDaysStore as useRuleDaysStore } from '../../conditions/ruleDaysStore';
import { rulesStore } from '../../conditions/rulesStore';
import { resolveLock } from '../../lock/resolveLock';
import { notify } from '../../ui/Notice';
import { unlockCopy as c } from './unlockCopy';
import { haptic } from '../../ui/haptics';
export { PRESENCE_CONFIRM_MS };
export function useGymUnlock(preview: boolean, alreadyCredited = false) {
  const runtime = useRuntime(), places = useSettingsStore((s) => s.data.gymPlaces), units = useSettingsStore((s) => s.data.units);
  const permission = usePermissionsStore((s) => s.data.location);
  const [location, setLocation] = useState<GymLocationFix | null>(null), [checking, setChecking] = useState(false), [retrying, setRetrying] = useState(false);
  const [working, setWorking] = useState(false), [lifted, setLifted] = useState(false), [value, setValue] = useState(0);
  const session = useRuleDaysStore((s) => s.data.gymPresence), days = useRuleDaysStore((s) => s.data.days);
  const request = useRef<AbortController | null>(null), mounted = useRef(true), busy = useRef(false);
  const nearest = location ? [...places].sort((a, b) => distanceMetres(location, a) - distanceMetres(location, b))[0] : places[0];
  const distance = location && nearest ? Math.max(0, distanceMetres(location, nearest) - nearest.radiusMeters) : null;
  const inside = preview || (!!nearest && gymFixStatus(location, nearest) === 'inside');
  const denied = !preview && permission === 'denied';
  const decision = useCallback(() => {
    const walking = runtime.walking.snapshot();
    return resolveLock({ now: runtime.clock.now(), timezone: runtime.clock.timezone(), rules: rulesStore.getState().data.rules, ruleDays: useRuleDaysStore.getState().data.days, gymPresence: useRuleDaysStore.getState().data.gymPresence,
      detection: { state: walking.phase === 'active' || walking.phase === 'grace' ? 'active' : 'inactive', since: walking.since },
      placement: { state: walking.placement, liveRelief: walking.proppedVerified, since: walking.proppedSince },
    });
  }, [runtime]);
  const apply = useCallback(async () => {
    await runtime.status.flush();
    const current = decision();
    if (current.state !== 'unlockedAtGym' && current.state !== 'unlockedMet') return false;
    const result = await runtime.screenTime.applyLock(current);
    const after = decision();
    return result.applied && (after.state === 'unlockedAtGym' || after.state === 'unlockedMet');
  }, [runtime, decision]);
  const wasInside = useRef(false);
  useEffect(() => {
    if (wasInside.current && !inside && !preview) runtime.analytics.track('gym_unlock_lost', { preview });
    wasInside.current = inside;
  }, [inside, preview, runtime]);
  useEffect(() => {
    mounted.current = true;
    if (preview) return () => { mounted.current = false; request.current?.abort(); };
    let sampling = false;
    const sample = async () => {
      if (sampling || AppState.currentState !== 'active') return;
      sampling = true;
      try { const fix = await requestGymFix(() => runtime.gym.currentFix(false)); if (mounted.current) setLocation(fix); }
      catch { if (mounted.current) setLocation(null); }
      finally { sampling = false; }
    };
    void sample();
    const timer = setInterval(() => void sample(), GYM_CONFIRM_RECHECK_MS);
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') void sample(); else request.current?.abort(); });
    const stopLocation = runtime.gym.observeLocation(() => { if (!sampling) void sample(); });
    const stopPresence = runtime.gym.observePresence(() => void sample());
    return () => { mounted.current = false; request.current?.abort(); clearInterval(timer); app.remove(); stopLocation(); stopPresence(); };
  }, [preview, runtime]);
  useEffect(() => {
    if (!working) return;
    const start = Date.now(), duration = preview ? 3000 : PRESENCE_CONFIRM_MS;
    const timer = setInterval(() => setValue(Math.min(1, (Date.now() - start) / duration)), GYM_FIX_SAMPLE_MS);
    return () => clearInterval(timer);
  }, [working, preview]);
  useEffect(() => {
    if (preview || lifted || working || !session?.confirmedAt || !inside) return;
    let active = true;
    void apply().then((opened) => { if (active && opened) { setValue(1); setLifted(true); } }).catch(() => undefined);
    return () => { active = false; };
  }, [session?.confirmedAt, days, preview, lifted, working, inside, runtime, apply]);
  const outsideMessage = (fix: GymLocationFix, gym: NonNullable<typeof nearest>) => c.gym.outsideDistance(gymDistance(Math.max(0, distanceMetres(fix, gym) - gym.radiusMeters), units), gym.name);
  const unlock = async () => {
    if (busy.current || lifted) return;
    busy.current = true;
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    setChecking(true);
    runtime.analytics.track('gym_unlock_checked', { preview });
    try {
      if (!preview) {
        if (!nearest) { notify(c.gym.noGym); return; }
        const deadline = Date.now() + GYM_FIX_RETRY_MS;
        let fix = await requestGymFix(() => runtime.gym.currentFix(true), deadline - Date.now(), controller.signal);
        if (mounted.current) setLocation(fix);
        let status = gymFixStatus(fix, nearest);
        if (status === 'uncertain') {
          setRetrying(true);
          while (Date.now() < deadline && status === 'uncertain') {
            await gymWait(Math.min(GYM_FIX_SAMPLE_MS, deadline - Date.now()), controller.signal);
            fix = await requestGymFix(() => runtime.gym.currentFix(false), deadline - Date.now(), controller.signal);
            if (mounted.current) setLocation(fix);
            status = gymFixStatus(fix, nearest);
          }
        }
        setRetrying(false);
        if (status === 'outside' && fix) { notify(outsideMessage(fix, nearest)); haptic('warning'); return; }
        if (status !== 'inside') { notify(c.gym.uncertain); haptic('warning'); return; }
      }
      setChecking(false); setWorking(true); setValue(0);
      runtime.analytics.track('gym_unlock_tapped', { preview });
      if (preview) await gymWait(3000, controller.signal);
      else if (nearest) await runtime.gym.checkIn(nearest.id, { milliseconds: PRESENCE_CONFIRM_MS, signal: controller.signal });
      if (controller.signal.aborted) return;
      const opened = preview || await apply();
      if (controller.signal.aborted || !mounted.current) return;
      if (opened) { setValue(1); setLifted(true); runtime.analytics.track('gym_unlock_confirmed', { preview }); }
      else { setValue(0); notify(c.gym.checkedInLocked); haptic('warning'); }
    } catch (error) {
      if (controller.signal.aborted || !mounted.current) return;
      if (error instanceof GymCheckInError && error.reason === 'outside' && nearest) {
        const fix = await runtime.gym.currentFix(false).catch(() => null);
        notify(fix ? outsideMessage(fix, nearest) : c.gym.uncertain);
      } else notify(error instanceof GymCheckInError && error.reason === 'uncertain' ? c.gym.uncertain : c.retry);
      haptic('warning'); setValue(0);
    } finally {
      busy.current = false;
      if (mounted.current) { setChecking(false); setRetrying(false); setWorking(false); }
    }
  };
  return { location: preview ? (nearest ?? null) : location, nearest, distance, inside, denied, unlock, checking, retrying, working, lifted, value, alreadyCredited };
}
