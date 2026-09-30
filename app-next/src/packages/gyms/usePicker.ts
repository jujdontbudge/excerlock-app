import { useEffect, useRef, useState } from 'react';
import { GymPort } from '../ports/GymPort';
import { Coordinates, PlaceCandidate, PlaceSuggestion } from '../ports/PlaceSearch';
import { SavedPlace } from '../model/models';
import { clampRadius, distanceMetres, roundCoordinate } from './geometry';
import { gymPickerCopy as c } from './lib/gymPickerCopy';
import { tokens as t } from '../ui/tokens';
import { notify } from '../ui/Notice';
export const defaultCentre: Coordinates = { latitude: 41.884, longitude: -87.652 };
export function usePicker(port: GymPort, onSaved: () => void, existing?: SavedPlace) {
  const [stage, setStage] = useState<'find' | 'place'>('place');
  const [query, setQuery] = useState(''),
    [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [nearby, setNearby] = useState<PlaceCandidate[]>([]),
    [location, setLocation] = useState<Coordinates | null>(null);
  const [candidate, setCandidate] = useState<PlaceCandidate | null>(existing ?? null);
  const [pin, setPin] = useState<Coordinates>(existing ?? defaultCentre);
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
    void port
      .currentLocation()
      .then(async (coord) => {
        if (!active) return;
        setLocation(coord);
        setLocating(false);
        if (coord) {
          try {
            const rows = await port.nearbyGyms(coord);
            if (active) setNearby(rows);
          } catch {
            return;
          }
        }
      })
      .catch(() => {
        if (active) setLocating(false);
      });
    return () => {
      active = false;
    };
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
    if (stage !== 'place') return;
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
  }, [pin, candidate, stage, port]);
  const choose = (place: PlaceCandidate) => {
    generation.current++;
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
  const drop = (coordinate = location ?? defaultCentre) => {
    generation.current++;
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
    if (busy || !name.trim()) return;
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
      if (alive.current) onSaved();
    } catch {
      if (alive.current) notify(c.saveError);
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
    setPin: (value: Coordinates) => {
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
