import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Home } from "./pages/Home";
import { DashboardFinance } from "./pages/DashboardFinance";
import { TransactionReport } from "./pages/TransactionReport";
import { MonthlyBudgeting } from "./pages/MonthlyBudgeting";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { Guidance } from "./pages/Guidance";
import { FinancialProtection } from "./pages/FinancialProtection";
import { FinancialCalculator, CalculatorDetail } from "./pages/FinancialCalculator";
import { saveFinancialPlan } from "./lib/financialPlans";

function CalculatorRoute() {
  const navigate = useNavigate();
  const { id } = useParams();

  const saveResult = (result: any) => {
    if (result?.plan) {
      saveFinancialPlan({
        calculatorId: result.id,
        type: result.plan.type,
        name: result.title,
        ...result.plan,
      });
    }
  };

  if (id) {
    return (
      <CalculatorDetail
        id={id}
        onBack={() => navigate("/calculator")}
        onSaveResult={saveResult}
        onNavigate={(action: any) => {
          if (action?.name === "protection") {
            navigate(`/protection?plan=${encodeURIComponent(action.calculatorId || id)}`);
          }
        }}
      />
    );
  }

  return <FinancialCalculator onOpen={(calculatorId) => navigate(`/calculator/${calculatorId}`)} />;
}

export default function App() {
  return (
    <BrowserRouter basename="/dashboard">
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/finance" element={<DashboardFinance />} />
          <Route path="/transactions" element={<TransactionReport />} />
          <Route path="/budgeting" element={<MonthlyBudgeting />} />
          <Route path="/calculator" element={<CalculatorRoute />} />
          <Route path="/calculator/:id" element={<CalculatorRoute />} />
          <Route path="/protection" element={<FinancialProtection />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/guidance" element={<Guidance />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
