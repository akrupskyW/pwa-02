"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  // Inline SVGs keep the bundle lean — no icon-pack dependency for three icons.
  icon: (active: boolean) => JSX.Element;
}

const SLIDER_ICON = (active: boolean) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 6h10" />
    <path d="M18 6h2" />
    <circle cx="16" cy="6" r="2" />
    <path d="M4 12h4" />
    <path d="M12 12h8" />
    <circle cx="10" cy="12" r="2" />
    <path d="M4 18h12" />
    <path d="M20 18h0" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);

const LIST_ICON = (active: boolean) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h10" />
  </svg>
);

const SCAN_ICON = (active: boolean) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.25 : 1.75}
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M4 8V6a2 2 0 0 1 2-2h2" />
    <path d="M16 4h2a2 2 0 0 1 2 2v2" />
    <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
    <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
    <path d="M8 12h8" />
  </svg>
);

const TABS: Tab[] = [
  { href: "/", label: "Codes", icon: SLIDER_ICON },
  { href: "/browse", label: "Browse", icon: LIST_ICON },
  { href: "/scan", label: "Scan", icon: SCAN_ICON },
];

export function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="border-t border-screen-line bg-screen-bg/95 backdrop-blur supports-[backdrop-filter]:bg-screen-bg/80">
      <ul className="grid grid-cols-3">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium tracking-wide transition ${
                  active ? "text-accent-gold" : "text-screen-subtle hover:text-white"
                }`}
              >
                {tab.icon(active)}
                <span>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
