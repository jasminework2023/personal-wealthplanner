import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DesktopSidebar, MobileSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

const titles: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard Finance",
  "/transactions": "Transaction Report",
  "/budgeting": "Monthly Budgeting",
  "/settings": "Settings",
  "/profile": "Profile",
};

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const title = titles[location.pathname] ?? "Wealthplanner";

  return (
    <div className="min-h-screen flex bg-cream">
      <DesktopSidebar />
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
