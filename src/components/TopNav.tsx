import { useState } from "react";
import { Menu, X } from "lucide-react";

interface TopNavProps {
  onAskAdvisor: () => void;
}

const NAV_ITEMS = [
  { label: "7-Day Trend", href: "#aqi-trend" },
  { label: "Daily Plan", href: "#daily-plan" },
  { label: "Indoor Air", href: "#indoor-air" },
  { label: "Impact Lab", href: "#impact-lab" },
  { label: "Community", href: "#community-advisor" },
];

export function TopNav({ onAskAdvisor }: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1320px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          ClearHearth
        </a>

        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="py-1 border-b-2 border-transparent hover:border-emerald-700 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onAskAdvisor}
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 min-h-[40px] text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Ask Advisor
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 text-sm font-medium text-slate-700 hover:text-emerald-800"
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onAskAdvisor();
            }}
            className="w-full mt-2 px-4 py-2.5 min-h-[44px] text-sm font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg transition-colors cursor-pointer"
          >
            Ask Advisor
          </button>
        </div>
      )}
    </header>
  );
}
