import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { DateHeader } from "./DateHeader";
import { ThemeToggle } from "./ThemeToggle";

const titles: Record<string, string> = {
  "/": "Home",
  "/finance": "Dashboard Finance",
  "/transactions": "Transaction Report",
  "/budgeting": "Budgeting & Realization",
  "/calculator": "Financial Calculator",
  "/protection": "Financial Protection",
  "/protection": "Proteksi Finansial",
  "/settings": "Settings",
  "/profile": "Profile",
  "/guidance": "Guidance",
};

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const title = location.pathname.startsWith("/calculator/") ? "Financial Calculator" : (titles[location.pathname] ?? "Wealthplanner");

  return (
    <div className="min-h-screen flex bg-cream">
      <DesktopSidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="hidden lg:flex items-center justify-end gap-3 mb-2">
            <ThemeToggle />
            <DateHeader />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
