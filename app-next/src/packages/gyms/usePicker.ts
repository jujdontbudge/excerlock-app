import { useEffect, useRef, useState } from 'react';
import { GymPort } from '../ports/GymPort';
import { Coordinates, PlaceCandidate, PlaceSuggestion } from '../ports/PlaceSearch';
import { SavedPlace } from '../model/models';
import { clampRadius, distanceMetres, roundCoordinate } from './geometry';
import { gymPickerCopy as c } from './lib/gymPickerCopy';
import { tokens as t } from '../ui/tokens';
import { notify } from '../ui/Notice';
import { haptic } from '../ui/haptics';
export const LOCATION_SEARCH_TIMEOUT_MS = 10_000;
export function usePicker(port: GymPort, onSaved: () => void, existing?: SavedPlace) {
  const [stage, setStage] = useState<'find' | 'place'>('place');
  const [query, setQuery] = useState(''),
    [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [nearby, setNearby] = useState<PlaceCandidate[]>([]),
    [location, setLocation] = useState<Coordinates | null>(null);
  const [candidate, setCandidate] = useState<PlaceCandidate | null>(existing ?? null);
  const [pin, setPin] = useState<Coordinates>(existing ?? { latitude: 0, longitude: 0 });
  const [hasPin, setHasPin] = useState(!!existing);
  const pinMoved = useRef(!!existing);
  const [name, setName] = useState(existing?.name ?? c.newName),
    [address, setAddress] = useState(existing?.address ?? '');
  const [radius, setRadius] = useState(clampRadius(existing?.radiusMeters ?? 100));
  const [busy, setBusy] = useState(false),
    [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(true);
  const generation = useRef(0),
    alive = useRef(true),
    cache = useRef(new Map<string, string | null>());
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    const accept = async (coord: Coordinates | null) => {
      if (!active) return;
      setLocation(coord);
      setLocating(false);
      if (!coord) return;
      if (!pinMoved.current) {
        setPin(coord);
        setHasPin(true);
      }
      try {
        const rows = await port.nearbyGyms(coord);
        if (active) setNearby(rows);
      } catch {
        return;
      }
    };
    const fallback = port.lastKnownLocation?.() ?? null;
    if (fallback) void accept(fallback);
    const timer = setTimeout(() => {
      if (!active) return;
      setLocating(false);
      if (!pinMoved.current && !fallback) setStage('find');
    }, LOCATION_SEARCH_TIMEOUT_MS);
    void port.currentLocation().then((coord) => {
      if (coord || fallback) clearTimeout(timer);
      return coord || fallback ? accept(coord ?? fallback) : undefined;
    }).catch(() => { if (fallback) { clearTimeout(timer); void accept(fallback); } });
    return () => { active = false; clearTimeout(timer); };
  }, [port]);
  useEffect(() => {
    let active = true;
    if (!query.trim() || stage !== 'find') return;
    const timer = setTimeout(() => {
      void port
        .suggest(query.trim(), location ?? undefined)
        .then((rows) => {
          if (active) {
            setSuggestions(rows);
            setSearching(false);
          }
        })
        .catch(() => {
          if (active) setSearching(false);
        });
    }, t.motion.duration.standard);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, location, port, stage]);
  useEffect(() => {
    if (stage !== 'place' || !hasPin) return;
    let active = true;
    if (candidate && distanceMetres(pin, candidate) < 5) return;
    const timer = setTimeout(() => {
      const key = roundCoordinate(pin);
      const result = cache.current.has(key)
        ? Promise.resolve(cache.current.get(key) ?? null)
        : port.reverseGeocode(pin);
      void result
        .then((value) => {
          cache.current.set(key, value);
          if (active) setAddress(value ?? c.addressError);
        })
        .catch(() => {
          if (active) setAddress(c.addressError);
        });
    }, t.motion.duration.emphasized);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pin, candidate, stage, port, hasPin]);
  const choose = (place: PlaceCandidate) => {
    generation.current++;
    pinMoved.current = true;
    setHasPin(true);
    setCandidate(place);
    setPin({ latitude: place.latitude, longitude: place.longitude });
    setRadius(clampRadius(port.listPlaces().find((p) => p.id === place.id)?.radiusMeters ?? 100));
    setName(place.name);
    setAddress(place.address);
    setStage('place');
  };
  const pickSuggestion = async (suggestion: PlaceSuggestion) => {
    const request = ++generation.current;
    setBusy(true);
    try {
      const place = await port.resolve(suggestion);
      if (alive.current && generation.current === request) choose(place);
    } catch {
      if (alive.current && generation.current === request) notify(c.searchError);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const drop = (coordinate = location ?? pin) => {
    generation.current++;
    pinMoved.current = true;
    setHasPin(true);
    setCandidate(null);
    setPin(coordinate);
    setName(c.newName);
    setAddress('');
    setStage('place');
  };
  const limit =
    port.listPlaces().length >= 5 && !port.listPlaces().some((p) => p.id === (existing?.id ?? candidate?.id));
  const requestLocation = async () => {
    setLocating(true);
    try {
      await port.requestLocation();
      const coordinate = await port.currentLocation();
      if (!alive.current) return;
      setLocation(coordinate);
      if (coordinate) {
        if (!pinMoved.current) { setPin(coordinate); setHasPin(true); }
        const rows = await port.nearbyGyms(coordinate);
        if (alive.current) setNearby(rows);
      } else notify(c.locationUnavailable);
    } catch {
      if (alive.current) notify(c.locationUnavailable);
    } finally {
      if (alive.current) setLocating(false);
    }
  };
  const save = async () => {
    if (busy || !name.trim() || !hasPin) return;
    if (limit) return notify(c.limit);
    setBusy(true);
    try {
      await port.savePlace({
        id: existing?.id ?? candidate?.id ?? `custom:${roundCoordinate(pin)}`,
        name: name.trim(),
        address: address === c.addressError ? '' : address,
        ...pin,
        radiusMeters: radius,
      });
      if (alive.current) {
        haptic('commit');
        onSaved();
      }
    } catch {
      if (alive.current) {
        notify(c.saveError);
        haptic('error');
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return {
    stage,
    query,
    setQuery: (value: string) => {
      setQuery(value);
      setSuggestions([]);
      setSearching(!!value.trim());
    },
    suggestions,
    nearby,
    location,
    locating,
    candidate,
    pin,
    hasPin,
    setPin: (value: Coordinates) => {
      pinMoved.current = true;
      setHasPin(true);
      setPin(value);
      setAddress(candidate && distanceMetres(value, candidate) < 5 ? candidate.address : '');
    },
    name,
    setName,
    address,
    radius,
    setRadius: (n: number) => setRadius(clampRadius(n)),
    busy,
    searching,
    choose,
    pickSuggestion,
    drop,
    save,
    limit,
    requestLocation,
    openSearch: () => {
      setStage('find');
    },
    back: () => {
      generation.current++;
      setStage('place');
      setQuery('');
      setSuggestions([]);
      setSearching(false);
    },
    saved: port.listPlaces(),
  };
}
export type PickerState = ReturnType<typeof usePicker>;
