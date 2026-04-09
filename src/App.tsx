import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

// ── Lazy-loaded pages (code splitting) ──────────────────────────
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Clients = lazy(() => import("./pages/Clients"));
const Quotes = lazy(() => import("./pages/Quotes"));
const Sales = lazy(() => import("./pages/Sales"));
const Projects = lazy(() => import("./pages/Projects"));
const Funnel = lazy(() => import("./pages/Funnel"));
const Suppliers = lazy(() => import("./pages/Suppliers"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Financial = lazy(() => import("./pages/Financial"));
const FinancialReceivables = lazy(() => import("./pages/FinancialReceivables"));
const FinancialPayables = lazy(() => import("./pages/FinancialPayables"));
const SolarCalculator = lazy(() => import("./pages/SolarCalculator"));
const Settings = lazy(() => import("./pages/Settings"));
const Employees = lazy(() => import("./pages/Employees"));
const MyProfile = lazy(() => import("./pages/MyProfile"));
const Agenda = lazy(() => import("./pages/Agenda"));
const DevSettings = lazy(() => import("./pages/DevSettings"));
const MyArea = lazy(() => import("./pages/MyArea"));
const QuoteSignature = lazy(() => import("./pages/QuoteSignature"));
const ServiceOrders = lazy(() => import("./pages/ServiceOrders"));
const DroneServices = lazy(() => import("./pages/DroneServices"));
const NotFound = lazy(() => import("./pages/NotFound"));

// ── Offline Persistence Configuration ──────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min
      gcTime: 24 * 60 * 60 * 1000,    // 24 hours (keep data offline for a long time)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// ── Page loading fallback ───────────────────────────────────────
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <PersistQueryClientProvider 
    client={queryClient}
    persistOptions={{ persister }}
  >
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              {/* Public route for client signature */}
              <Route path="/orcamento/:token" element={<QuoteSignature />} />

              {/* Protected Routes with Persistent Layout */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clients" element={<ProtectedRoute requiredPermission="clients.view"><Clients /></ProtectedRoute>} />
                <Route path="/quotes" element={<ProtectedRoute requiredPermission="quotes.view"><Quotes /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute requiredPermission="sales.view"><Sales /></ProtectedRoute>} />
                <Route path="/funnel" element={<ProtectedRoute requiredPermission="funnel.view"><Funnel /></ProtectedRoute>} />
                <Route path="/projects" element={<ProtectedRoute requiredPermission="projects.view"><Projects /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute requiredPermission="suppliers.view"><Suppliers /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute requiredPermission="inventory.view"><Inventory /></ProtectedRoute>} />
                <Route path="/financial" element={<ProtectedRoute requiredPermission="financial.view"><Financial /></ProtectedRoute>} />
                <Route path="/financial/receivables" element={<ProtectedRoute requiredPermission="financial.view"><FinancialReceivables /></ProtectedRoute>} />
                <Route path="/financial/payables" element={<ProtectedRoute requiredPermission="financial.view"><FinancialPayables /></ProtectedRoute>} />
                <Route path="/calculator" element={<ProtectedRoute requiredPermission="calculator.view"><SolarCalculator /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requiredPermission="settings.view"><Settings /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute requiredPermission="employees.view"><Employees /></ProtectedRoute>} />
                <Route path="/my-profile" element={<MyProfile />} />
                <Route path="/agenda" element={<ProtectedRoute requiredPermission="agenda.view"><Agenda /></ProtectedRoute>} />
                <Route path="/my-area" element={<ProtectedRoute requiredPermission="my_area.view"><MyArea /></ProtectedRoute>} />
                <Route path="/service-orders" element={<ProtectedRoute requiredPermission="service_orders.view"><ServiceOrders /></ProtectedRoute>} />
                <Route path="/drone" element={<ProtectedRoute requiredPermission="drone.view"><DroneServices /></ProtectedRoute>} />
                <Route path="/dev" element={<ProtectedRoute requiredPermission="dev.view"><DevSettings /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </PersistQueryClientProvider>
);

export default App;
