import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { ArrowLeftIcon, Logo } from "./Icons";

/** Gabarit des pages de texte (mentions légales, confidentialité). */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const updated = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(SITE.lastLegalUpdate));
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6 md:px-8 md:pt-8">
        <header className="flex items-center justify-between">
          <Link href="/" title="Retour à l'accueil">
            <Logo />
          </Link>
          <Link href="/" className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-surface">
            <ArrowLeftIcon width={16} height={16} /> Retour
          </Link>
        </header>
        <h1 className="mt-10 font-display text-[40px] font-extrabold leading-none tracking-[-0.03em] md:text-[52px]">{title}</h1>
        <p className="mt-3 text-sm text-muted">Dernière mise à jour : {updated}</p>
        <div className="legal mt-8">{children}</div>
        <LegalFooter className="mt-14" />
      </div>
    </div>
  );
}

export function LegalFooter({ className = "" }: { className?: string }) {
  return (
    <nav aria-label="Informations légales" className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted ${className}`}>
      <Link href="/mentions-legales" className="hover:text-ink hover:underline">
        Mentions légales
      </Link>
      <Link href="/confidentialite" className="hover:text-ink hover:underline">
        Confidentialité
      </Link>
      <span>
        Données :{" "}
        <a href="https://www.prix-carburants.gouv.fr/" target="_blank" rel="noreferrer" className="hover:text-ink hover:underline">
          prix-carburants.gouv.fr
        </a>
      </span>
    </nav>
  );
}
