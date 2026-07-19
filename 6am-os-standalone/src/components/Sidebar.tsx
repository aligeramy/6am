import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarDays, Music2, DollarSign, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/songs", label: "Songs", icon: Music2 },
  { to: "/budget", label: "Budget", icon: DollarSign },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? "bg-[#1c1c1c] text-[#f5f5f5]" : "text-[#a3a3a3] hover:bg-[#151515] hover:text-[#f5f5f5]"
              }`
            }
          >
            <Icon size={18} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#080808] px-4 py-3 lg:hidden">
        <div>
          <div className="text-sm font-semibold tracking-tight text-[#f5f5f5]">6am OS</div>
          <div className="text-[11px] text-[#a3a3a3]">Artist Command Center</div>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]">
          <Menu size={20} />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="w-72 border-r border-[#2a2a2a] bg-[#080808] p-4">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold tracking-tight text-[#f5f5f5]">6am OS</div>
                <div className="text-[11px] text-[#a3a3a3]">Artist Command Center</div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-[#a3a3a3] hover:bg-[#1c1c1c] hover:text-[#f5f5f5]">
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="flex-1 bg-black/60" onClick={() => setOpen(false)} />
        </div>
      )}

      <aside className="hidden w-64 shrink-0 border-r border-[#2a2a2a] bg-[#080808] p-4 lg:flex lg:flex-col">
        <div className="mb-8 px-2">
          <div className="text-base font-semibold tracking-tight text-[#f5f5f5]">6am OS</div>
          <div className="text-xs text-[#a3a3a3]">Artist Command Center</div>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
