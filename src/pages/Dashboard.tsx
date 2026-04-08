import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FolderKanban, FileText, Wrench, Loader2, ChevronRight, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { SmartAlerts } from '@/components/dashboard/SmartAlerts';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

interface DashboardSummary {
  projects: {
    total: number;
    inProgress: number;
    delayed: number;
  };
  quotes: {
    total: number;
    pending: number;
    approved: number;
  };
  serviceOrders: {
    total: number;
    pending: number;
    overdue: number;
  };
}

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const today = new Date().toISOString().split('T')[0];

  const [{ data: projects }, { data: quotes }, { data: serviceOrders }] = await Promise.all([
    supabase.from('projects').select('id, status, estimated_end_date'),
    supabase.from('quotes').select('id, status'),
    supabase.from('service_orders').select('id, status, deadline_date'),
  ]);

  const projectsInProgress = projects?.filter(p => p.status !== 'POS_VENDA') || [];
  const projectsDelayed = projectsInProgress.filter(p =>
    p.estimated_end_date && p.estimated_end_date < today
  );

  const pendingQuotes = quotes?.filter(q => q.status === 'SENT' || q.status === 'DRAFT') || [];
  const approvedQuotes = quotes?.filter(q => q.status === 'APPROVED') || [];

  const pendingOS = serviceOrders?.filter(os => os.status !== 'CONCLUIDO' && os.status !== 'CANCELADO') || [];
  const overdueOS = pendingOS.filter(os =>
    os.deadline_date && os.deadline_date < today
  );

  return {
    projects: {
      total: projects?.length || 0,
      inProgress: projectsInProgress.length,
      delayed: projectsDelayed.length,
    },
    quotes: {
      total: quotes?.length || 0,
      pending: pendingQuotes.length,
      approved: approvedQuotes.length,
    },
    serviceOrders: {
      total: serviceOrders?.length || 0,
      pending: pendingOS.length,
      overdue: overdueOS.length,
    },
  };
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: summary, isLoading: loading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    staleTime: 5 * 60 * 1000,
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
          Olá, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-2 font-medium opacity-70">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Projetos */}
        <Link to="/projects" className="group">
          <div className="glassmorphism-v2 rounded-3xl p-7 hover-lift relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl rounded-full -translate-y-8 translate-x-8" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="p-3.5 rounded-2xl bg-primary/20 border border-primary/20 shadow-inner">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-4">Projetos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 opacity-60" />
                  Em andamento
                </span>
                <span className="font-bold text-foreground text-base tracking-tight">{summary?.projects.inProgress || 0}</span>
              </div>
              {(summary?.projects.delayed || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-destructive flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Atrasados
                  </span>
                  <span className="font-bold text-destructive text-base tracking-tight">{summary?.projects.delayed}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-muted-foreground flex items-center gap-2 font-medium opacity-60">
                  <CheckCircle className="h-4 w-4" />
                  Total da base
                </span>
                <span className="font-semibold text-foreground/70">{summary?.projects.total || 0}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Orçamentos */}
        <Link to="/quotes" className="group">
          <div className="glassmorphism-v2 rounded-3xl p-7 hover-lift relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 blur-2xl rounded-full -translate-y-8 translate-x-8" />
            
            <div className="flex items-center justify-between mb-8">
              <div className="p-3.5 rounded-2xl bg-secondary/20 border border-secondary/20 shadow-inner">
                <FileText className="h-6 w-6 text-secondary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-secondary group-hover:text-secondary-foreground transition-all">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-4">Orçamentos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 opacity-60" />
                  Aguardando resposta
                </span>
                <span className="font-bold text-foreground text-base tracking-tight">{summary?.quotes.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-500 flex items-center gap-2 font-medium">
                  <CheckCircle className="h-4 w-4" />
                  Convertidos
                </span>
                <span className="font-bold text-emerald-500 text-base tracking-tight">{summary?.quotes.approved || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-muted-foreground flex items-center gap-2 font-medium opacity-60">
                  <FileText className="h-4 w-4" />
                  Volume total
                </span>
                <span className="font-semibold text-foreground/70">{summary?.quotes.total || 0}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Ordens de Serviço */}
        <Link to="/service-orders" className="group">
          <div className="glassmorphism-v2 rounded-3xl p-7 hover-lift relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full -translate-y-8 translate-x-8" />
            
            <div className="flex items-center justify-between mb-8">
              <div className={cn(
                "p-3.5 rounded-2xl border shadow-inner",
                (summary?.serviceOrders.overdue || 0) > 0 
                  ? "bg-destructive/20 border-destructive/20" 
                  : "bg-amber-500/20 border-amber-500/20"
              )}>
                <Wrench className={cn(
                  "h-6 w-6",
                  (summary?.serviceOrders.overdue || 0) > 0 ? "text-destructive" : "text-amber-500"
                )} />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-amber-950 transition-all">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-4">Ordens de Serviço</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 opacity-60" />
                  Operações ativas
                </span>
                <span className="font-bold text-foreground text-base tracking-tight">{summary?.serviceOrders.pending || 0}</span>
              </div>
              {(summary?.serviceOrders.overdue || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-destructive flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Crítico / Vencidas
                  </span>
                  <span className="font-bold text-destructive text-base tracking-tight">{summary?.serviceOrders.overdue}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-white/5">
                <span className="text-muted-foreground flex items-center gap-2 font-medium opacity-60">
                  <Wrench className="h-4 w-4" />
                  Módulo de serviço
                </span>
                <span className="font-semibold text-foreground/70">{summary?.serviceOrders.total || 0}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Alerts */}
      <SmartAlerts />
    </AppLayout>
  );
}
