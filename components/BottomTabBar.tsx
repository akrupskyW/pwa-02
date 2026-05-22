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

// Bottom nav rendered as a pill but anchored at the bottom of the phone
// shell (i.e., a flex-flow sibling of the scroll area, not an overlay).
//
// DESIGN.md §2 originally specified a *floating* pill that hovers over
// content via backdrop blur — pretty, but a Sticky CTA (e.g. "+ Add a
// code") near the bottom of the page lives under the bar's translucent
// zone, which fights the same guideline's "App content must never be
// obscured by the Tab Bar" rule. Anchoring keeps the pill aesthetic and
// safely clears all content above it.
//
//   - 12 px top padding, 21 px sides + safe-area bottom on the container.
//   - 4 px inner padding on the pill.
//   - Active tab: gradient fill + colored hairline stroke.
//   - Inactive tabs: transparent, faint icon + label.
export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="shrink-0 relative z-20 pt-3 pb-[max(21px,env(safe-area-inset-bottom))] px-[21px] bg-background"
      // A faint top hairline + soft inset gradient sells the "lifts off the
      // background" feel that the floating version had — without the
      // content-bleeds-through-glass downside.
      style={{
        borderTop: "1px solid var(--border-subtle)",
        background:
          "linear-gradient(180deg, rgba(5,8,15,0.6) 0%, var(--background) 60%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="flex h-[62px] items-stretch gap-0 rounded-pill border border-line p-1 shadow-tab-pill"
        style={{ backgroundColor: "rgba(13,20,34,0.92)" }}
      >
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return <TabItem key={tab.href} tab={tab} active={active} />;
        })}
      </div>
    </nav>
  );
}

function TabItem({ tab, active }: { tab: Tab; active: boolean }) {
  const accentVar = tab.accent === "emerald" ? "--accent-emerald" : "--accent-violet";
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={[
        "flex-1 flex flex-col items-center justify-center gap-[3px] rounded-[26px] transition",
        active
          ? "text-ink-bright"
          : "text-ink-faint hover:text-ink/80",
      ].join(" ")}
      style={
        active
          ? {
              background:
                "linear-gradient(135deg, var(--surface-3) 0%, var(--card-elevated) 100%)",
              boxShadow: `0 0 0 1px rgba(${accentVar === "--accent-emerald" ? "52,229,166" : "124,124,251"},0.35)`,
            }
          : undefined
      }
    >
      <Icon
        name={tab.icon}
        size={20}
        strokeWidth={active ? 2.2 : 1.75}
        style={
          active
            ? { color: `var(${accentVar})` }
            : undefined
        }
      />
      <span
        className="text-[10px] font-bold leading-none"
        style={{ letterSpacing: "0.07em" }}
      >
        {tab.label}
      </span>
    </Link>
  );
}
