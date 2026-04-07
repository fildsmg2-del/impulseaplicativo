import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Quotes from "./pages/Quotes";
import Sales from "./pages/Sales";
import Projects from "./pages/Projects";
import Funnel from "./pages/Funnel";
import Suppliers from "./pages/Suppliers";
import Inventory from "./pages/Inventory";
import Financial from "./pages/Financial";
import SolarCalculator from "./pages/SolarCalculator";
import Settings from "./pages/Settings";
import Employees from "./pages/Employees";
import MyProfile from "./pages/MyProfile";
import Agenda from "./pages/Agenda";
import DevSettings from "./pages/DevSettings";

import MyArea from "./pages/MyArea";
import QuoteSignature from "./pages/QuoteSignature";
import ServiceOrders from "./pages/ServiceOrders";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            {/* Public route for client signature */}
            <Route path="/orcamento/:token" element={<QuoteSignature />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/quotes" element={<ProtectedRoute><Quotes /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute allowedRoles={['MASTER', 'ENGENHEIRO', 'VENDEDOR', 'FINANCEIRO', 'COMPRAS']}><Sales /></ProtectedRoute>} />
            <Route path="/funnel" element={<ProtectedRoute><Funnel /></ProtectedRoute>} />
            <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV']}><Suppliers /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV', 'COMPRAS']}><Inventory /></ProtectedRoute>} />
            <Route path="/financial" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV', 'FINANCEIRO']}><Financial /></ProtectedRoute>} />
            <Route path="/calculator" element={<ProtectedRoute><SolarCalculator /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV']}><Settings /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute allowedRoles={['MASTER', 'DEV']}><Employees /></ProtectedRoute>} />
            <Route path="/my-profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/my-area" element={<ProtectedRoute><MyArea /></ProtectedRoute>} />
            <Route path="/service-orders" element={<ProtectedRoute><ServiceOrders /></ProtectedRoute>} />
            <Route path="/dev" element={<ProtectedRoute allowedRoles={['DEV']}><DevSettings /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
