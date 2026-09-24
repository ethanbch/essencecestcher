import Link from "next/link";
import { Logo } from "@/components/Icons";

export default function NotFound() {
  return (
    <main className="grid h-full place-items-center px-6 text-center">
      <div>
        <Logo />
        <p className="mt-10 font-display text-[88px] font-extrabold leading-none tracking-tight">404</p>
        <p className="mt-3 text-lg text-ink-2">Cette page est tombée en panne sèche.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-xl bg-ink px-5 font-semibold text-white hover:bg-ink-2">
          Trouver une station
        </Link>
      </div>
    </main>
  );
}
