import React, { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";
import { IS_NATIVE_APP } from "@/lib/platform";
import { createIDBPersister } from "@/lib/offline-persister";
import { syncService } from "@/services/syncService";
import { sqliteService } from "@/services/sqliteService";

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
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: IS_NATIVE_APP ? 30 * 60 * 1000 : 0, // 30 mins stable on Mobile
      gcTime: IS_NATIVE_APP ? 30 * 24 * 60 * 60 * 1000 : 0, // 30 days of persistence
      retry: IS_NATIVE_APP ? false : 1, // Don't retry on native when offline
      refetchOnWindowFocus: IS_NATIVE_APP ? false : true,
      // offlineFirst: try fetch, if it fails use cached data
      networkMode: IS_NATIVE_APP ? 'offlineFirst' : 'online',
    },
  },
});

const persister = IS_NATIVE_APP ? createIDBPersister() : undefined;

// ── Page loading fallback ───────────────────────────────────────
const PageLoader = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center h-screen bg-background space-y-4">
    <Loader2 className="h-10 w-10 animate-spin text-impulse-gold" />
    {message && <p className="text-muted-foreground animate-pulse font-medium">{message}</p>}
  </div>
);

const AppContent = () => {
  console.log('Push: AppContent mounting...');
  const [isDbReady, setIsDbReady] = React.useState(!IS_NATIVE_APP);
  const [syncStatus, setSyncStatus] = React.useState<string>("");

  React.useEffect(() => {
    const initApp = async () => {
      if (IS_NATIVE_APP) {
        try {
          setSyncStatus("Inicializando banco de dados nativo...");
          // Timeout de 3s para o banco
          const db = await Promise.race([
            sqliteService.init(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000))
          ]);
          console.log('[SQLite] Banco inicializado:', !!db);
        } catch (e) {
          console.warn("[SQLite] Falha ou timeout ao iniciar banco:", e);
        }
        setIsDbReady(true);
      }

      // Initialize offline sync listener
      syncService.initSyncListener();

      // Start background sync
      setSyncStatus("Sincronizando dados offline...");
      await syncService.prefetchCriticalData();
      setSyncStatus("");
    };

    initApp();
  }, []);

  if (!isDbReady) {
    return <PageLoader message={syncStatus} />;
  }

  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/orcamento/:token?" element={<QuoteSignature />} />

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
  );
};

import { QueryClientProvider } from "@tanstack/react-query";

// ... cleanup imports if needed or just use the logic
const App = () => {
  if (persister) {
    return (
      <PersistQueryClientProvider 
        client={queryClient}
        persistOptions={{ 
          persister,
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days - match gcTime
        }}
      >
        <AppContent />
      </PersistQueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
