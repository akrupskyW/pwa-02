import { ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

// Visual iPhone-shaped bezel that wraps a screen's contents on the /demo
// stage. The bezel + dynamic island match the RoutedPhoneShell bezel (see
// DESIGN.md §2 "PhoneFrame"), but with no tab bar — each demo phone shows
// one screen at a time.
export function PhoneFrame({ label, children }: Props) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] font-bold tracking-[0.18em] uppercase mb-3 text-accent-emerald">
        {label}
      </div>
      <div className="relative w-[390px] h-[844px] bg-background rounded-[54px] shadow-bezel border-[3px] border-surface-3 overflow-hidden">
        {/* Dynamic-island notch with pulsing teal indicator. */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full z-30 flex items-center justify-end pr-3 gap-1.5">
          <span
            aria-hidden
            className="block w-2 h-2 rounded-full bg-accent-teal animate-pulse-dot"
          />
        </div>

        {/* Ambient glows behind the screen content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-24 w-[420px] h-[420px] rounded-full opacity-70 blur-3xl z-0"
          style={{
            background:
              "radial-gradient(closest-side, rgba(52,229,166,0.30), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 w-[360px] h-[360px] rounded-full opacity-70 blur-3xl z-0"
          style={{
            background:
              "radial-gradient(closest-side, rgba(93,207,255,0.30), transparent 70%)",
          }}
        />

        <div className="absolute inset-0 text-ink overflow-y-auto no-scrollbar relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
