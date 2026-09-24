"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchPlaces, type Place } from "@/lib/geocode";
import { HistoryIcon, LocateIcon, PinIcon, SearchIcon } from "./Icons";

type Props = {
  size?: "lg" | "md";
  value?: string;
  recent?: Place[];
  locating?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  icon?: React.ReactNode;
  onSelect: (place: Place) => void;
  /** Bouton « Me localiser » ; absent si non fourni. */
  onLocate?: () => void;
};

export function AddressSearch({
  size = "md",
  value = "",
  recent = [],
  locating,
  autoFocus,
  placeholder = "Votre adresse, une ville, un code postal…",
  icon,
  onSelect,
  onLocate,
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [prevValue, setPrevValue] = useState(value);

  if (value !== prevValue) {
    setPrevValue(value);
    setQuery(value);
  }

  const typing = query.trim().length >= 3 && query !== value;
  const showRecent = query.trim().length === 0 && recent.length > 0;
  const items = showRecent ? recent : results;

  useEffect(() => {
    if (!typing) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchPlaces(query, ctrl.signal));
        setError(null);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Recherche d'adresse indisponible, réessayez.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, typing]);

  // Focus quand autoFocus passe à true (ex. : Arrivée juste après le choix du départ).
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  function choose(place: Place) {
    setQuery(place.label);
    setOpen(false);
    setResults([]);
    inputRef.current?.blur();
    onSelect(place);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      const pick = items[active] ?? items[0];
      if (pick) {
        e.preventDefault();
        choose(pick);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const lg = size === "lg";
  const showList = open && (items.length > 0 || (typing && !loading && results.length === 0) || error);

  return (
    <div ref={rootRef} className="relative w-full">
      <div
        className={`flex items-center gap-2 rounded-2xl border border-line bg-surface transition focus-within:border-ink focus-within:shadow-[0_0_0_4px_rgb(200_245_58_/_0.55)] ${
          lg ? "h-16 pl-5 pr-2 shadow-float" : `h-12 pl-4 ${onLocate ? "pr-1.5" : "pr-4"}`
        }`}
      >
        {icon ?? <SearchIcon className="shrink-0 text-muted" width={lg ? 22 : 18} height={lg ? 22 : 18} />}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (e.target.value.trim().length < 3) setResults([]);
          }}
          onFocus={(e) => {
            setOpen(true);
            e.currentTarget.select();
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded={Boolean(showList)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted/80 ${lg ? "text-lg" : "text-[15px]"}`}
        />
        {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-line-strong border-t-ink" />}
        {onLocate && (
        <button
          type="button"
          onClick={onLocate}
          disabled={locating}
          className={`flex shrink-0 items-center gap-2 rounded-xl font-medium transition hover:bg-paper disabled:opacity-60 ${
            lg ? "h-12 px-4 text-[15px]" : "h-9 px-2.5 text-sm"
          }`}
          title="Utiliser ma position"
        >
          {locating ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
          ) : (
            <LocateIcon className="text-[#2563eb]" />
          )}
          <span className={lg ? "hidden sm:inline" : "sr-only"}>Me localiser</span>
        </button>
        )}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="animate-rise absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-float"
        >
          {showRecent && <li className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-muted">Récemment</li>}
          {items.map((p, i) => (
            <li
              key={`${p.lat},${p.lon},${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => choose(p)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-paper" : ""}`}
            >
              {showRecent ? (
                <HistoryIcon className="shrink-0 text-muted" />
              ) : (
                <PinIcon className="shrink-0 text-muted" />
              )}
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.label}</span>
                {p.context && <span className="block truncate text-sm text-muted">{p.context}</span>}
              </span>
            </li>
          ))}
          {!showRecent && typing && !loading && results.length === 0 && !error && (
            <li className="px-3 py-3 text-sm text-muted">Aucune adresse trouvée. Essayez avec une ville ou un code postal.</li>
          )}
          {error && <li className="px-3 py-3 text-sm text-bad">{error}</li>}
        </ul>
      )}
    </div>
  );
}
