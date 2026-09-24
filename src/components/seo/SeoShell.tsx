import Link from "next/link";
import type { ReactNode } from "react";
import { LegalFooter } from "../LegalPage";
import { Logo } from "../Icons";

export type Crumb = { name: string; href: string };

/** Gabarit des pages France / région / ville : en-tête, fil d'Ariane, pied de page. */
export function SeoShell({ crumbs, children, footerLinks }: { crumbs: Crumb[]; children: ReactNode; footerLinks?: ReactNode }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-6 md:px-8 md:pt-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" title="Accueil">
            <Logo />
          </Link>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-xl bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink-2"
          >
            Chercher près de moi
          </Link>
        </header>

        <nav aria-label="Fil d'Ariane" className="mt-8 text-[13px] text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={c.href} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>›</span>}
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="font-medium text-ink-2">
                    {c.name}
                  </span>
                ) : (
                  <Link href={c.href} className="hover:text-ink hover:underline">
                    {c.name}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <main>{children}</main>

        <footer className="mt-16 space-y-4 border-t border-line pt-6">
          {footerLinks}
          <LegalFooter />
        </footer>
      </div>
    </div>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // Échappement de « < » : empêche toute fermeture prématurée de la balise.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-12">
      <h2 className="font-display text-[24px] font-bold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
