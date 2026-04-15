import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FolderKanban, FileText, Wrench, Loader2, ChevronRight, AlertTriangle, 
  Clock, CheckCircle, PlusCircle, Users, BarChart3, TrendingUp, TrendingDown,
  DollarSign, Plane, Activity
} from 'lucide-react';
import { SmartAlerts } from '@/components/dashboard/SmartAlerts';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DashboardSummary {
  projects: { total: number; inProgress: number; delayed: number; };
  quotes: { total: number; pending: number; approved: number; };
  serviceOrders: { total: number; pending: number; overdue: number; };
  droneServices: { total: number; pending: number; };
  financial: { receivablesPending: number; payablesPending: number; receivablesOverdue: number; payablesOverdue: number; };
}

async function fetchDashboardSummary(role: string, userId: string): Promise<DashboardSummary> {
  const today = new Date().toISOString().split('T')[0];
  const isEngenharia = role === 'ENGENHEIRO' || role === 'TECNICO';
  const isDrone = role === 'CONSULTOR_TEC_DRONE' || role === 'PILOTO';
  const isPilot = role === 'PILOTO';

  // Performance tuning: only fetch what's needed for the role
  const queries = [];

  const isMasterOrDev = role === 'MASTER' || role === 'DEV';
  const isVendedor = role === 'VENDEDOR';
  const isFinanceiro = role === 'FINANCEIRO';

  // 0: Projects
  if (isMasterOrDev || isEngenharia) {
    let q = supabase.from('projects').select('id, status, estimated_end_date, assigned_to');
    if (role === 'TECNICO') q = q.eq('assigned_to', userId);
    queries.push(q);
  } else { queries.push(Promise.resolve({ data: [] })); }

  // 1: Quotes
  if (isMasterOrDev || isVendedor) {
    let q = supabase.from('quotes').select('id, status, created_by');
    if (isVendedor) q = q.eq('created_by', userId);
    queries.push(q);
  } else { queries.push(Promise.resolve({ data: [] })); }

  // 2: Service Orders (General)
  if (isMasterOrDev || isEngenharia) {
    let q = supabase.from('service_orders').select('id, status, deadline_date, assigned_to');
    if (role === 'TECNICO') q = q.eq('assigned_to', userId);
    queries.push(q);
  } else { queries.push(Promise.resolve({ data: [] })); }

  // 3: Drone Services
  if (isMasterOrDev || isDrone) {
    let q = supabase.from('drone_services').select('id, status, technician_id');
    // Apenas Pilotos são restringidos às suas próprias OS no dashboard
    if (role === 'PILOTO' && !isMasterOrDev) q = q.eq('technician_id', userId);
    queries.push(q);
  } else { queries.push(Promise.resolve({ data: [] })); }

  // 4: Financeiro
  if (isMasterOrDev || isFinanceiro) {
    queries.push(supabase.from('transactions').select('id, type, status, due_date'));
  } else { queries.push(Promise.resolve({ data: [] })); }

  const [resProj, resQuotes, resOs, resDrone, resFin] = await Promise.all(queries);

  // Parse Projects
  const projects = resProj.data || [];
  const projInProgress = projects.filter(p => p.status !== 'POS_VENDA');
  const projDelayed = projInProgress.filter(p => p.estimated_end_date && p.estimated_end_date < today);

  // Parse Quotes
  const quotes = resQuotes.data || [];
  const pendingQuotes = quotes.filter(q => q.status === 'SENT' || q.status === 'DRAFT');
  const approvedQuotes = quotes.filter(q => q.status === 'APPROVED');

  // Parse Financial
  const transactions = resFin.data || [];
  const receivables = transactions.filter(t => t.type === 'INCOME' && t.status === 'PENDING');
  const payables = transactions.filter(t => t.type === 'EXPENSE' && t.status === 'PENDING');
  const receivablesOverdue = receivables.filter(t => t.due_date && t.due_date < today);
  const payablesOverdue = payables.filter(t => t.due_date && t.due_date < today);

  // Parse OS
  const generalOS = resOs.data || [];
  const droneOS = resDrone.data || [];
  
  const pendingOS = generalOS.filter(os => {
    const s = os.status as string;
    return s !== 'CONCLUIDO' && s !== 'CANCELADO';
  });
  const overdueOS = generalOS.filter(os => os.deadline_date && os.deadline_date < today);

  const pendingDrone = droneOS.filter(os => os.status !== 'FINALIZADO');

  return {
    projects: { total: projects.length, inProgress: projInProgress.length, delayed: projDelayed.length },
    quotes: { total: quotes.length, pending: pendingQuotes.length, approved: approvedQuotes.length },
    serviceOrders: { total: generalOS.length, pending: pendingOS.length, overdue: overdueOS.length },
    droneServices: { total: droneOS.length, pending: pendingDrone.length },
    financial: { 
      receivablesPending: receivables.length, payablesPending: payables.length,
      receivablesOverdue: receivablesOverdue.length, payablesOverdue: payablesOverdue.length
    }
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: summary, isLoading: loading } = useQuery({
    queryKey: ['dashboard-summary', user?.id, user?.role],
    queryFn: () => fetchDashboardSummary(user?.role || '', user?.id || ''),
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id
  });

  console.log('[Dashboard] Status:', { 
    userId: user?.id, 
    role: user?.role, 
    isProfileLoaded, 
    isLoadingSummary: loading,
    hasData: !!summary 
  });

  const isMasterOrDev = user?.role === 'MASTER' || user?.role === 'DEV';
  const isFinanceiro = user?.role === 'FINANCEIRO';
  const isVendedor = user?.role === 'VENDEDOR';
  const isEngenharia = user?.role === 'ENGENHEIRO' || user?.role === 'TECNICO';
  const isDrone = user?.role === 'CONSULTOR_TEC_DRONE' || user?.role === 'PILOTO';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-impulse-gold" />
      </div>
    );
  }

  return (
    <>
      {/* Header & Quick Actions */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        
        {/* Quick Actions Baseado no Cargo */}
        <div className="flex flex-wrap gap-3">
          {(isMasterOrDev || isVendedor) && (
            <>
              <Button size="sm" onClick={() => navigate('/clients?new=true')}>
                <Users className="h-4 w-4 mr-2" /> Novo Cliente
              </Button>
              <Button size="sm" onClick={() => navigate('/quotes?new=true')}>
                <PlusCircle className="h-4 w-4 mr-2" /> Novo Orçamento
              </Button>
            </>
          )}

          {(isMasterOrDev || isFinanceiro) && !isVendedor && (
            <>
              <Button size="sm" onClick={() => navigate('/financial/receivables?new=true')}>
                <TrendingUp className="h-4 w-4 mr-2" /> Nova Receita
              </Button>
              <Button size="sm" onClick={() => navigate('/financial/payables?new=true')}>
                <TrendingDown className="h-4 w-4 mr-2" /> Nova Despesa
              </Button>
            </>
          )}

          {(isMasterOrDev || isEngenharia || isDrone) && !isVendedor && !isFinanceiro && (
            <>
              <Button size="sm" onClick={() => navigate(isDrone ? '/drone?new=true' : '/service-orders?new=true')}>
                <Wrench className="h-4 w-4 mr-2" /> Nova O.S.
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Role-Based Modular Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        {/* Module: Quotes (Vendas) */}
        {(isMasterOrDev || isVendedor) && (
          <Link to="/quotes" className="group">
            <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-impulse-gold/50 transition-all hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-impulse-gold/10">
                  <FileText className="h-5 w-5 text-impulse-gold" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-impulse-gold transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">{isVendedor ? 'Meus Orçamentos' : 'Orçamentos (Geral)'}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Pendentes
                  </span>
                  <span className="font-medium text-foreground">{summary?.quotes.pending || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-success flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" /> Aprovados
                  </span>
                  <span className="font-medium text-success">{summary?.quotes.approved || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5" /> Total Acumulado
                  </span>
                  <span className="font-medium text-foreground">{summary?.quotes.total || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Module: Financas */}
        {(isMasterOrDev || isFinanceiro) && (
          <Link to="/financial" className="group">
            <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-emerald-500/50 transition-all hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Financeiro (Títulos Abertos)</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-success flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5" /> A Receber
                  </span>
                  <span className="font-medium text-success">{summary?.financial.receivablesPending || 0} {(summary?.financial.receivablesOverdue || 0) > 0 && <span className="text-destructive text-xs ml-1">({summary?.financial.receivablesOverdue} atrasados)</span>}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-destructive flex items-center gap-2">
                    <TrendingDown className="h-3.5 w-3.5" /> A Pagar
                  </span>
                  <span className="font-medium text-destructive">{summary?.financial.payablesPending || 0} {(summary?.financial.payablesOverdue || 0) > 0 && <span className="text-destructive text-xs ml-1">({summary?.financial.payablesOverdue} atrasados)</span>}</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Module: Projetos (Engenharia) */}
        {(isMasterOrDev || isEngenharia) && (
          <Link to="/projects" className="group">
            <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-cyan-500/50 transition-all hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-cyan-500/10">
                  <FolderKanban className="h-5 w-5 text-cyan-500" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Projetos Executivos</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Em andamento
                  </span>
                  <span className="font-medium text-foreground">{summary?.projects.inProgress || 0}</span>
                </div>
                {(summary?.projects.delayed || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" /> Atrasados
                    </span>
                    <span className="font-medium text-destructive">{summary?.projects.delayed}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5" /> Total
                  </span>
                  <span className="font-medium text-foreground">{summary?.projects.total || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Module: Ordens de Servico Solar (Engenharia) */}
        {(isMasterOrDev || isEngenharia) && (
          <Link to="/service-orders" className="group">
            <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-primary/30 transition-all hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl", (summary?.serviceOrders.overdue || 0) > 0 ? "bg-destructive/10" : "bg-primary/10")}>
                  <Wrench className={cn("h-5 w-5", (summary?.serviceOrders.overdue || 0) > 0 ? "text-destructive" : "text-primary")} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                {user?.role === 'TECNICO' ? 'Minhas O.S. (Solar)' : 'Ordens de Serviço'}
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Pendentes
                  </span>
                  <span className="font-medium text-foreground">{summary?.serviceOrders.pending || 0}</span>
                </div>
                {(summary?.serviceOrders.overdue || 0) > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" /> Vencidas
                    </span>
                    <span className="font-medium text-destructive">{summary?.serviceOrders.overdue}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Module: Ordens de Servico Drone */}
        {(isMasterOrDev || isDrone) && (
          <Link to="/drone" className="group">
            <div className="bg-card rounded-xl border border-border p-5 hover:shadow-lg hover:border-impulse-gold/30 transition-all hover-lift">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-impulse-gold/10">
                  <Plane className="h-5 w-5 text-impulse-gold" />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-impulse-gold transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">
                OS de Drone
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Pendentes
                  </span>
                  <span className="font-medium text-foreground">{summary?.droneServices.pending || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5" /> Total
                  </span>
                  <span className="font-medium text-foreground">{summary?.droneServices.total || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        )}
        
      </div>

      {/* Smart Alerts Layer */}
      <SmartAlerts />
    </>
  );
}
