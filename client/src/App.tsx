import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CustomerRegister from "./pages/CustomerRegister";
import StaffCheckIn from "./pages/StaffCheckIn";
import FamilyCheckIn from "./pages/FamilyCheckIn";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import Dashboard from "./pages/Dashboard";
import AdvertisingDashboard from "./pages/AdvertisingDashboard";
import SettlementReport from "./pages/SettlementReport";
import SelfRegistration from "./pages/SelfRegistration";
import BackupManagement from "./pages/BackupManagement";
import ScheduleManagement from "./pages/ScheduleManagement";
import QRCodeManagement from "./pages/QRCodeManagement";
import AdvertisingExpenseForm from "./pages/AdvertisingExpenseForm";
import CustomerManagement from "./pages/CustomerManagement";
import { AiregSync } from "./pages/AiregSync";
import SalesManagement from "./pages/SalesManagement";
import ReservationManagement from "./pages/ReservationManagement";
import ReservationForm from "./pages/ReservationForm";
import MonthlyStats from "./pages/MonthlyStats";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={CustomerRegister} />
      <Route path="/staff/checkin" component={StaffCheckIn} />
      <Route path="/staff/family-checkin" component={FamilyCheckIn} />
      <Route path="/analytics" component={AnalyticsDashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/advertising" component={AdvertisingDashboard} />
      <Route path="/settlement" component={SettlementReport} />
      <Route path="/register-qr" component={SelfRegistration} />
      <Route path="/backup" component={BackupManagement} />
      <Route path="/schedule" component={ScheduleManagement} />
      <Route path="/qrcode-management" component={QRCodeManagement} />
      <Route path="/advertising-expense" component={AdvertisingExpenseForm} />
      <Route path="/customers" component={CustomerManagement} />
      <Route path="/aireg-sync" component={AiregSync} />
      <Route path="/sales" component={SalesManagement} />
      <Route path="/reservations" component={ReservationManagement} />
      <Route path="/reservation" component={ReservationForm} />
      <Route path="/monthly-stats" component={MonthlyStats} />
      <Route path="/404" component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
