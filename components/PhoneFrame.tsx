import { ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

// Visual iPhone-shaped bezel that wraps a screen's contents on the /demo
// stage. The bezel + dynamic island match the RoutedPhoneShell bezel (see
// DESIGN.md §2 "PhoneFrame"), but with no tab bar — each demo phone shows
// one screen at a time.
export const PhoneFrame = ({ label, children }: Props) => {
  return (
    <div className="flex flex-col items-center">
      <div className="text-accent-emerald mb-3 text-[11px] font-bold tracking-[0.18em] uppercase">
        {label}
      </div>
      <div className="bg-background shadow-bezel border-surface-3 relative h-[844px] w-[390px] overflow-hidden rounded-[54px] border-[3px]">
        {/* Dynamic-island notch with pulsing teal indicator. */}
        <div className="absolute top-3.5 left-1/2 z-30 flex h-[34px] w-[120px] -translate-x-1/2 items-center justify-end gap-1.5 rounded-full bg-black pr-3">
          <span
            aria-hidden
            className="bg-accent-teal animate-pulse-dot block h-2 w-2 rounded-full"
          />
        </div>

        {/* Ambient glows behind the screen content. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-24 z-0 h-[420px] w-[420px] rounded-full opacity-70 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, rgba(50,169,102,0.20), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 z-0 h-[360px] w-[360px] rounded-full opacity-70 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, rgba(88,120,150,0.20), transparent 70%)",
          }}
        />

        <div className="text-ink no-scrollbar absolute relative inset-0 z-10 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
