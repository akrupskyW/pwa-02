import { ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";

// Responsive PWA shell.
//   - On mobile: fills the viewport (real phone, no bezel).
//   - On desktop (md+): centers a single iPhone-shaped bezel against the dark
//     stage so the experience reads as a phone even at large widths.
// The bottom tab bar is rendered INSIDE the screen so it's contained within
// the bezel on desktop and follows the device safe area on mobile.
export function RoutedPhoneShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-stage-900 md:flex md:items-center md:justify-center md:py-10">
      <div
        className={[
          // Mobile: full-bleed phone-screen surface.
          "h-[100dvh] w-full bg-screen-bg text-white flex flex-col overflow-hidden",
          // Desktop: shrink to an iPhone bezel and inset.
          "md:h-[820px] md:w-[400px] md:rounded-[44px] md:border-[10px] md:border-stage-700/80 md:shadow-2xl md:relative",
        ].join(" ")}
      >
        {/* Dynamic-island notch — only inside the desktop bezel. */}
        <div className="hidden md:block absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[26px] bg-black rounded-full z-20" />

        <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
        <BottomTabBar />
      </div>
    </div>
  );
}
