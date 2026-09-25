import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useRuntime } from '../../ports/useRuntime';
import { Coordinates } from '../../ports/PlaceSearch';
import { settingsStore as useSettingsStore } from '../../preferences/settingsStore';
import { distanceMetres } from '../../gyms/geometry';
import { defaultCentre } from '../../gyms/usePicker';
import { PRESENCE_CONFIRM_MS } from '../../activity/presence';
import { ruleDaysStore as useRuleDaysStore } from '../../conditions/ruleDaysStore';
import { useClock } from '../../lock/selectors';
export { PRESENCE_CONFIRM_MS };
export function useGymUnlock(preview: boolean, alreadyCredited = false) {
  const runtime = useRuntime(),
    places = useSettingsStore((s) => s.data.gymPlaces);
  const [location, setLocation] = useState<Coordinates | null>(preview ? (places.at(-1) ?? defaultCentre) : null);
  const [presence, setPresence] = useState(false),
    [denied, setDenied] = useState(false);
  const [checking, setChecking] = useState(false),
    [working, setWorking] = useState(false),
    [lifted, setLifted] = useState(alreadyCredited),
    [value, setValue] = useState(alreadyCredited ? 1 : 0),
    [error, setError] = useState('');
  const session = useRuleDaysStore((s) => s.data.gymPresence),
    now = useClock();
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const nearest = location
    ? [...places].sort((a, b) => distanceMetres(location, a) - distanceMetres(location, b))[0]
    : places[0];
  const distance = location && nearest ? distanceMetres(location, nearest) : null;
  const inside = preview || (presence && !!nearest && distance !== null && distance <= nearest.radiusMeters);
  useEffect(() => {
    if (preview) return;
    let active = true;
    const sample = async () => {
      try {
        const p = await runtime.gym.currentLocation(true);
        if (active) {
          setLocation(p);
          setDenied(!p);
        }
      } catch {
        if (active) setDenied(true);
      }
    };
    void sample();
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sample();
    });
    const stopLocation = runtime.gym.observeLocation((p) => {
      if (active && p) {
        setLocation(p);
        setDenied(false);
      }
    });
    const stop = runtime.gym.observePresence((p) => {
      if (active) {
        setPresence(p === 'inside');
        if (p === 'outside') {
          setWorking(false);
          if (!alreadyCredited) setValue(0);
          generation.current++;
          runtime.analytics.track('gym_unlock_lost');
        }
      }
    });
    return () => {
      active = false;
      app.remove();
      stopLocation();
      stop();
      request.current?.abort();
    };
  }, [preview, runtime, alreadyCredited]);
  useEffect(() => {
    if (!working) return;
    if (!inside) return;
    const start = Date.now(),
      duration = preview ? 3000 : PRESENCE_CONFIRM_MS;
    const timer = setInterval(() => {
      const amount = Math.min(1, (Date.now() - start) / duration);
      setValue(amount);
      if (amount === 1) {
        clearInterval(timer);
        if (preview) {
          setWorking(false);
          setLifted(true);
          runtime.analytics.track('gym_unlock_confirmed', { preview });
        }
      }
    }, 50);
    return () => clearInterval(timer);
  }, [working, inside, preview, runtime]);
  const unlock = async () => {
    if (working || lifted || checking) return;
    if (!inside) {
      setChecking(true);
      runtime.analytics.track('gym_unlock_checked', { distance, preview });
      try {
        const p = await runtime.gym.currentLocation(true);
        setLocation(p);
        setDenied(!p);
      } catch {
        setDenied(true);
      } finally {
        setChecking(false);
      }
      return;
    }
    const token = ++generation.current;
    request.current?.abort();
    request.current = new AbortController();
    setError('');
    setWorking(true);
    runtime.analytics.track('gym_unlock_tapped', { distance, preview });
    try {
      if (!preview && nearest) {
        await runtime.gym.checkIn(nearest.id, { milliseconds: PRESENCE_CONFIRM_MS, signal: request.current.signal });
        if (token === generation.current) {
          setValue(1);
          setWorking(false);
          setLifted(true);
          runtime.analytics.track('gym_unlock_confirmed');
        }
      }
    } catch {
      if (token === generation.current) {
        setWorking(false);
        setValue(0);
        setError('Could not check in. Please try again.');
      }
    }
  };
  const autoConfirming = !preview && !!session && !session.confirmedAt && !working;
  const autoLifted = !preview && !!session?.confirmedAt;
  const shown = {
    working: working || autoConfirming,
    lifted: lifted || autoLifted,
    value:
      lifted || autoLifted
        ? 1
        : working
          ? value
          : autoConfirming
            ? Math.min(1, Math.max(0, (Date.parse(now) - Date.parse(session.startedAt)) / PRESENCE_CONFIRM_MS))
            : value,
  };
  return { location, nearest, distance, inside, denied, error, unlock, checking, ...shown };
}
