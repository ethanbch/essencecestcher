"use client";

import { useState } from "react";

/** Efface les préférences et recherches récentes mémorisées dans ce navigateur. */
export function ClearLocalData() {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("ecc."))
            .forEach((k) => localStorage.removeItem(k));
        } catch {
          // stockage indisponible : rien à effacer
        }
        setDone(true);
      }}
      className="mt-2 inline-flex h-10 items-center rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold hover:border-ink/40"
    >
      {done ? "Données effacées de ce navigateur ✓" : "Effacer mes données locales"}
    </button>
  );
}
