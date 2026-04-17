import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { Loader2 } from "lucide-react";

// Lazy load all pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CustomerRegister = lazy(() => import("./pages/CustomerRegister"));
const StaffCheckIn = lazy(() => import("./pages/StaffCheckIn"));
const FamilyCheckIn = lazy(() => import("./pages/FamilyCheckIn"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));
const AdvertisingDashboard = lazy(() => import("./pages/AdvertisingDashboard"));
const SettlementReport = lazy(() => import("./pages/SettlementReport"));
const SelfRegistration = lazy(() => import("./pages/SelfRegistration"));
const BackupManagement = lazy(() => import("./pages/BackupManagement"));
const ScheduleManagement = lazy(() => import("./pages/ScheduleManagement"));
const QRCodeManagement = lazy(() => import("./pages/QRCodeManagement"));
const AdvertisingExpenseForm = lazy(() => import("./pages/AdvertisingExpenseForm"));
const CustomerManagement = lazy(() => import("./pages/CustomerManagement"));
const AiregSync = lazy(() => import("./pages/AiregSync").then(m => ({ default: m.AiregSync })));
const SalesManagement = lazy(() => import("./pages/SalesManagement"));
const ReservationManagement = lazy(() => import("./pages/ReservationManagement"));
const ReservationForm = lazy(() => import("./pages/ReservationForm"));
const MonthlyStats = lazy(() => import("./pages/MonthlyStats"));
const ExpenseManagement = lazy(() => import("./pages/ExpenseManagement"));
const ExpenseBatchEdit = lazy(() => import("./pages/ExpenseBatchEdit"));
const MyPageLogin = lazy(() => import("./pages/MyPageLogin"));
const MyPage = lazy(() => import("./pages/MyPage"));
const CustomerHome = lazy(() => import("./pages/CustomerHome"));
const StaffScanner = lazy(() => import("./pages/StaffScanner"));
const NotionLink = lazy(() => import("./pages/NotionLink"));
const CronJobs = lazy(() => import("./pages/CronJobs"));
const MedicalRecordsList = lazy(() => import("./pages/MedicalRecordsList"));
const MedicalRecordForm = lazy(() => import("./pages/MedicalRecordForm"));
const MedicalRecordDetail = lazy(() => import("./pages/MedicalRecordDetail"));
const StaffTablet = lazy(() => import("./pages/StaffTablet"));
const StaffHome = lazy(() => import("./pages/StaffHome"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Questionnaire = lazy(() => import("./pages/Questionnaire"));
const QuestionnaireList = lazy(() => import("./pages/QuestionnaireList"));
const QuestionnaireDetail = lazy(() => import("./pages/QuestionnaireDetail"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
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
        <Route path="/expenses" component={ExpenseManagement} />
        <Route path="/expenses/batch-edit" component={ExpenseBatchEdit} />
        <Route path="/mypage-login" component={MyPageLogin} />
        <Route path="/mypage" component={MyPage} />
        <Route path="/customer" component={CustomerHome} />
        <Route path="/customer-home" component={CustomerHome} />
        <Route path="/staff/scanner" component={StaffScanner} />
        <Route path="/notion-link" component={NotionLink} />
        <Route path="/cron-jobs" component={CronJobs} />
        <Route path="/medical-records" component={MedicalRecordsList} />
        <Route path="/medical-records/new" component={MedicalRecordForm} />
        <Route path="/medical-records/edit" component={MedicalRecordForm} />
        <Route path="/medical-records/:id" component={MedicalRecordDetail} />
        <Route path="/staff/home" component={StaffHome} />
        <Route path="/staff/tablet" component={StaffTablet} />
        <Route path="/privacy" component={PrivacyPolicy} />
        <Route path="/questionnaire" component={Questionnaire} />
        <Route path="/questionnaire-list" component={QuestionnaireList} />
        <Route path="/questionnaire/detail/:id" component={QuestionnaireDetail} />
        <Route path="/404" component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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
