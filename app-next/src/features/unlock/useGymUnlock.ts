import { useEffect, useRef, useState } from 'react';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { Coordinates } from '../../ports/PlaceSearch';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { distanceMetres } from '../gym-picker/geometry';
import { defaultCentre } from '../gym-picker/usePicker';
import { unlockCopy as c } from '../../content/unlock';

export const PRESENCE_CONFIRM_MS = 30_000;

export function useGymUnlock(preview: boolean, alreadyCredited = false) {
  const runtime = useRuntime(),
    places = useSettingsStore((state) => state.data.gymPlaces),
    permission = usePermissionsStore((state) => state.data.location);
  const [location, setLocation] = useState<Coordinates | null>(preview ? (places.at(-1) ?? defaultCentre) : null);
  const [presence, setPresence] = useState(false),
    [working, setWorking] = useState(false),
    [lifted, setLifted] = useState(alreadyCredited),
    [value, setValue] = useState(alreadyCredited ? 1 : 0),
    [error, setError] = useState('');
  const generation = useRef(0),
    request = useRef<AbortController | null>(null),
    previewCompleted = useRef(false);

  const noGym = !preview && places.length === 0;
  const denied = !preview && (permission === 'denied' || permission === 'notDetermined');
  const locating = !preview && !denied && !noGym && location === null;
  const nearest = location
    ? [...places].sort((a, b) => distanceMetres(location, a) - distanceMetres(location, b))[0]
    : places[0];
  const distance = location && nearest ? distanceMetres(location, nearest) : null;
  const inside = preview || (presence && !!nearest && distance !== null && distance <= nearest.radiusMeters);

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (preview) return;
    let active = true;
    const sample = async () => {
      try {
        const next = await runtime.gym.currentLocation(true);
        if (active) setLocation(next);
      } catch {
        if (active) setError(c.gym.error);
      }
    };
    void sample();
    const stopLocation = runtime.gym.observeLocation((next) => {
      if (active) setLocation(next);
    });
    const stopPresence = runtime.gym.observePresence((next) => {
      if (!active) return;
      setPresence(next === 'inside');
      if (next === 'outside') {
        request.current?.abort();
        request.current = null;
        setWorking(false);
        if (!alreadyCredited) setValue(0);
        generation.current += 1;
        runtime.analytics.track('gym_unlock_lost');
      }
    });
    return () => {
      active = false;
      stopLocation();
      stopPresence();
      request.current?.abort();
    };
  }, [preview, runtime, alreadyCredited]);

  useEffect(() => {
    if (!working || !inside) return;
    const startedAt = runtime.clock.monotonicMs();
    const duration = preview ? 3_000 : PRESENCE_CONFIRM_MS;
    const update = () => {
      const amount = Math.min(1, Math.max(0, runtime.clock.monotonicMs() - startedAt) / duration);
      setValue(amount);
      if (amount === 1 && preview && !previewCompleted.current) {
        previewCompleted.current = true;
        setWorking(false);
        setLifted(true);
        runtime.analytics.track('gym_unlock_confirmed', { preview: true });
      }
    };
    update();
    return runtime.clock.subscribe(update);
  }, [working, inside, preview, runtime]);

  const unlock = async () => {
    if (!inside || working || lifted) return;
    const token = ++generation.current;
    request.current?.abort();
    request.current = new AbortController();
    setError('');
    setWorking(true);
    runtime.analytics.track('gym_unlock_tapped', { distance, preview });
    if (preview) return;
    try {
      if (nearest) {
        await runtime.gym.checkIn(nearest.id, {
          milliseconds: PRESENCE_CONFIRM_MS,
          signal: request.current.signal,
        });
        if (token === generation.current) {
          request.current = null;
          setValue(1);
          setWorking(false);
          setLifted(true);
          runtime.analytics.track('gym_unlock_confirmed');
        }
      }
    } catch {
      if (token === generation.current) {
        request.current = null;
        setWorking(false);
        setValue(0);
        setError(c.gym.error);
      }
    }
  };

  return { location, nearest, distance, inside, denied, noGym, locating, working, lifted, value, error, unlock };
}
