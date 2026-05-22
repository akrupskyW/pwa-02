import { ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

// Visual iPhone-shaped bezel that wraps a screen's contents. The bezel,
// dynamic-island notch, and gold step-label sit OUTSIDE the screen so they
// don't compete with the content density inside.
export function PhoneFrame({ label, children }: Props) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-accent-gold text-xs font-semibold tracking-widest uppercase mb-3">
        {label}
      </div>
      <div className="relative w-[360px] h-[720px] bg-stage-900 rounded-[44px] shadow-2xl border-[10px] border-stage-700/80 overflow-hidden">
        {/* Dynamic-island notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[110px] h-[26px] bg-black rounded-full z-10" />
        {/* Screen */}
        <div className="absolute inset-0 bg-screen-bg text-white overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
