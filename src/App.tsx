import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Home } from "./pages/Home";
import { DashboardFinance } from "./pages/DashboardFinance";
import { TransactionReport } from "./pages/TransactionReport";
import { MonthlyBudgeting } from "./pages/MonthlyBudgeting";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<DashboardFinance />} />
          <Route path="/transactions" element={<TransactionReport />} />
          <Route path="/budgeting" element={<MonthlyBudgeting />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
