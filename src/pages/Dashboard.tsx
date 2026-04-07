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
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Main Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Projetos */}
        <Link to="/projects" className="group">
          <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <FolderKanban className="h-5 w-5 text-primary" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Projetos</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Em andamento
                </span>
                <span className="font-medium text-foreground">{summary?.projects.inProgress || 0}</span>
              </div>
              {(summary?.projects.delayed || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Atrasados
                  </span>
                  <span className="font-medium text-destructive">{summary?.projects.delayed}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Total
                </span>
                <span className="font-medium text-foreground">{summary?.projects.total || 0}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Orçamentos */}
        <Link to="/quotes" className="group">
          <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 rounded-xl bg-secondary/10">
                <FileText className="h-5 w-5 text-secondary" />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Orçamentos</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Pendentes
                </span>
                <span className="font-medium text-foreground">{summary?.quotes.pending || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-success flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Aprovados
                </span>
                <span className="font-medium text-success">{summary?.quotes.approved || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Total
                </span>
                <span className="font-medium text-foreground">{summary?.quotes.total || 0}</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Ordens de Serviço */}
        <Link to="/service-orders" className="group">
          <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={cn(
                "p-2.5 rounded-xl",
                (summary?.serviceOrders.overdue || 0) > 0 ? "bg-destructive/10" : "bg-warning/10"
              )}>
                <Wrench className={cn(
                  "h-5 w-5",
                  (summary?.serviceOrders.overdue || 0) > 0 ? "text-destructive" : "text-warning"
                )} />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Ordens de Serviço</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Pendentes
                </span>
                <span className="font-medium text-foreground">{summary?.serviceOrders.pending || 0}</span>
              </div>
              {(summary?.serviceOrders.overdue || 0) > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Vencidas
                  </span>
                  <span className="font-medium text-destructive">{summary?.serviceOrders.overdue}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5" />
                  Total
                </span>
                <span className="font-medium text-foreground">{summary?.serviceOrders.total || 0}</span>
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
