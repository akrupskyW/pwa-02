"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

interface Tab {
  href: string;
  label: string;
  icon: IconName;
  /** The screen identity color — drives the active fill/stroke. */
  accent: "emerald" | "violet";
}

const TABS: Tab[] = [
  { href: "/", label: "CODE", icon: "sliders-horizontal", accent: "emerald" },
  { href: "/browse", label: "BROWSE", icon: "layout-grid", accent: "violet" },
  { href: "/scan", label: "SCAN", icon: "scan-line", accent: "emerald" },
];

// Bottom nav rendered as a floating pill, anchored at the bottom of the
// phone shell (a flex-flow sibling of the scroll area, not an overlay).
//
// The nav wrapper itself is fully transparent — no rectangular bar, no
// hairline, no backdrop blur — so the pill reads as the only affordance,
// sitting on whatever the screen background already is. This matches the
// screens2.html design reference. Because the bar is a flex sibling (not
// an overlay), content above it is never obscured.
//
//   - 12 px top padding, 21 px sides + safe-area bottom on the container.
//   - 4 px inner padding on the pill.
//   - Active tab: gradient fill + colored hairline stroke.
//   - Inactive tabs: transparent, faint icon + label.
export const BottomTabBar = () => {
  const pathname = usePathname();
  return (
    <nav
      // No rectangular bar behind the pill — the pill is the only affordance,
      // sitting on whatever the screen background already is (matches the
      // screens2.html design reference). The nav is a transparent layout
      // wrapper that just reserves space + safe-area padding.
      className="relative z-20 shrink-0 px-[21px] pt-3 pb-[max(21px,env(safe-area-inset-bottom))]"
    >
      <div
        className="rounded-pill border-line shadow-tab-pill flex h-[62px] items-stretch gap-0 border p-1"
        style={{ backgroundColor: "var(--color-surface-glass)" }}
      >
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return <TabItem key={tab.href} tab={tab} active={active} />;
        })}
      </div>
    </nav>
  );
};

const TabItem = ({ tab, active }: { tab: Tab; active: boolean }) => {
  const accentVar = tab.accent === "emerald" ? "--color-accent-emerald" : "--color-accent-violet";
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex flex-1 flex-col items-center justify-center gap-[3px] rounded-[26px] transition",
        active ? "text-ink-bright" : "text-ink-faint hover:text-ink/80",
      ].join(" ")}
      style={
        active
          ? {
              background:
                "linear-gradient(135deg, var(--color-surface-3) 0%, var(--color-card-elevated) 100%)",
              boxShadow: `0 0 0 1px rgba(${accentVar === "--color-accent-emerald" ? "50,169,102" : "37,80,124"},0.35)`,
            }
          : undefined
      }
    >
      <Icon
        name={tab.icon}
        size={20}
        strokeWidth={active ? 2.2 : 1.75}
        style={active ? { color: `var(${accentVar})` } : undefined}
      />
      <span className="text-[10px] leading-none font-bold" style={{ letterSpacing: "0.07em" }}>
        {tab.label}
      </span>
    </Link>
  );
};
