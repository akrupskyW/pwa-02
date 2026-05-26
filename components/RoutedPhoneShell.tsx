import { ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";

// Responsive PWA shell.
//   - On mobile: fills the viewport (real phone, no bezel).
//   - On desktop (md+): centers a single iPhone-shaped bezel against the dark
//     stage so the experience reads as a phone even at large widths.
// The bottom tab bar is rendered INSIDE the screen as a floating glass pill
// (see DESIGN.md §2 "TabBar"). Background glows live behind the screen
// content and add the brand's signature warmth.
export const RoutedPhoneShell = ({ children }: { children: ReactNode }) => {
  return (
    <div className="bg-background relative isolate min-h-[100dvh] overflow-hidden md:flex md:items-center md:justify-center md:py-10">
      {/* Stage-level ambient glows (desktop only — on mobile the in-screen
          glows are enough). */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 hidden h-[600px] w-[600px] rounded-full opacity-60 blur-3xl md:block"
        style={{
          background: "radial-gradient(closest-side, rgba(52,229,166,0.35), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 -bottom-40 hidden h-[600px] w-[600px] rounded-full opacity-70 blur-3xl md:block"
        style={{
          background: "radial-gradient(closest-side, rgba(124,124,251,0.35), transparent 70%)",
        }}
      />

      <div
        className={[
          // Mobile: full-bleed phone-screen surface, with safe-area awareness.
          "bg-background text-ink relative flex h-[100dvh] w-full flex-col overflow-hidden",
          // Desktop: shrink to an iPhone bezel.
          "md:relative md:h-[844px] md:w-[390px] md:rounded-[54px]",
          "md:shadow-bezel md:border-surface-3 md:border-[3px]",
        ].join(" ")}
      >
        {/* Dynamic island — only inside the desktop bezel. */}
        <div className="absolute top-3.5 left-1/2 z-30 hidden h-[34px] w-[120px] -translate-x-1/2 items-center justify-end gap-1.5 rounded-full bg-black pr-3 md:flex">
          <span
            aria-hidden
            className="bg-accent-teal animate-pulse-dot block h-2 w-2 rounded-full"
          />
        </div>

        {/* In-screen ambient glows. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 -left-24 z-0 h-[420px] w-[420px] rounded-full opacity-70 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, rgba(52,229,166,0.30), transparent 70%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 z-0 h-[360px] w-[360px] rounded-full opacity-70 blur-3xl"
          style={{
            background: "radial-gradient(closest-side, rgba(93,207,255,0.30), transparent 70%)",
          }}
        />

        <div className="no-scrollbar relative z-10 flex-1 overflow-y-auto">{children}</div>
        <BottomTabBar />
      </div>
    </div>
  );
};
