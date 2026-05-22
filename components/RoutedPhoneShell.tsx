import { ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";

// Responsive PWA shell.
//   - On mobile: fills the viewport (real phone, no bezel).
//   - On desktop (md+): centers a single iPhone-shaped bezel against the dark
//     stage so the experience reads as a phone even at large widths.
// The bottom tab bar is rendered INSIDE the screen as a floating glass pill
// (see DESIGN.md §2 "TabBar"). Background glows live behind the screen
// content and add the brand's signature warmth.
export function RoutedPhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background relative isolate md:flex md:items-center md:justify-center md:py-10 overflow-hidden">
      {/* Stage-level ambient glows (desktop only — on mobile the in-screen
          glows are enough). */}
      <div
        aria-hidden
        className="hidden md:block pointer-events-none absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(52,229,166,0.35), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="hidden md:block pointer-events-none absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(124,124,251,0.35), transparent 70%)",
        }}
      />

      <div
        className={[
          // Mobile: full-bleed phone-screen surface, with safe-area awareness.
          "h-[100dvh] w-full bg-background text-ink flex flex-col overflow-hidden relative",
          // Desktop: shrink to an iPhone bezel.
          "md:h-[844px] md:w-[390px] md:rounded-[54px] md:relative",
          "md:shadow-bezel md:border-[3px] md:border-surface-3",
        ].join(" ")}
      >
        {/* Dynamic island — only inside the desktop bezel. */}
        <div className="hidden md:flex absolute top-3.5 left-1/2 -translate-x-1/2 w-[120px] h-[34px] bg-black rounded-full z-30 items-center justify-end pr-3 gap-1.5">
          <span
            aria-hidden
            className="block w-2 h-2 rounded-full bg-accent-teal animate-pulse-dot"
          />
        </div>

        {/* In-screen ambient glows. */}
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

        <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
          {children}
        </div>
        <BottomTabBar />
      </div>
    </div>
  );
}
