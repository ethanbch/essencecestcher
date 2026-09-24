import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...p,
});

export const SearchIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const LocateIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
  </svg>
);
export const PinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12Z" />
    <circle cx="12" cy="9" r="2.5" />
  </svg>
);
export const ArrowLeftIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const ClockIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const CarIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 17h14M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v4h-2v2h-3v-2H8v2H5v-2H3v-4Z" />
    <circle cx="7.5" cy="13.5" r="1" fill="currentColor" />
    <circle cx="16.5" cy="13.5" r="1" fill="currentColor" />
  </svg>
);
export const NavIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m3 11 18-8-8 18-2-8-8-2Z" />
  </svg>
);
export const ShareIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);
export const InfoIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const SortIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4" />
  </svg>
);
export const HighwayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v2" />
  </svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);
export const HistoryIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5M12 7v5l3 2" />
  </svg>
);

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-ink text-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2.5c-.3 0-.6.2-.8.4C9.6 5 5.5 10.4 5.5 14.3a6.5 6.5 0 0 0 13 0c0-3.9-4.1-9.3-5.7-11.4a1 1 0 0 0-.8-.4Z" />
        </svg>
      </span>
      <span className="font-display text-[17px] font-extrabold tracking-tight">
        essence<span className="text-muted">,</span> c&apos;est cher
      </span>
    </span>
  );
}
