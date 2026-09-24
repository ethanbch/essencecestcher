"use client";

import { useCallback, useEffect, useState } from "react";

/** État mémorisé dans le navigateur (préférences uniquement). Tolère un stockage indisponible. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture unique après hydratation
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // stockage indisponible (navigation privée…)
    }
    setHydrated(true);
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(resolved));
        } catch {
          // ignore
        }
        return resolved;
      });
    },
    [key],
  );

  return [value, update, hydrated] as const;
}
