"use client";

import { useEffect } from "react";
import { Logo } from "@/components/Icons";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid h-full place-items-center px-6 text-center">
      <div>
        <Logo />
        <p className="mt-10 font-display text-3xl font-bold">Oups, quelque chose a calé.</p>
        <p className="mt-2 text-ink-2">Le service est peut-être momentanément indisponible.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 font-semibold text-white hover:bg-ink-2"
        >
          Réessayer
        </button>
      </div>
    </main>
  );
}
