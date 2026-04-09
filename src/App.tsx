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
                <Route path="/clients" element={<Clients />} />
                <Route path="/quotes" element={<Quotes />} />
                <Route path="/sales" element={<ProtectedRoute allowedRoles={['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'FINANCEIRO', 'COMPRAS']}><Sales /></ProtectedRoute>} />
                <Route path="/funnel" element={<Funnel />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV', 'ENGENHEIRO']}><Suppliers /></ProtectedRoute>} />
                <Route path="/inventory" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV', 'COMPRAS', 'ENGENHEIRO']}><Inventory /></ProtectedRoute>} />
                <Route path="/financial" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV', 'FINANCEIRO']}><Financial /></ProtectedRoute>} />
                <Route path="/financial/receivables" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV', 'FINANCEIRO']}><FinancialReceivables /></ProtectedRoute>} />
                <Route path="/financial/payables" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV', 'FINANCEIRO']}><FinancialPayables /></ProtectedRoute>} />
                <Route path="/calculator" element={<SolarCalculator />} />
                <Route path="/settings" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV']}><Settings /></ProtectedRoute>} />
                <Route path="/employees" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV']}><Employees /></ProtectedRoute>} />
                <Route path="/my-profile" element={<MyProfile />} />
                <Route path="/agenda" element={<Agenda />} />
                <Route path="/my-area" element={<MyArea />} />
                <Route path="/service-orders" element={<ServiceOrders />} />
                <Route path="/drone" element={<DroneServices />} />
                <Route path="/dev" element={<ProtectedRoute allowedRoles={['DEV']}><DevSettings /></ProtectedRoute>} />
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
