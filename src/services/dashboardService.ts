import { supabase } from '@/integrations/supabase/client';

export interface DashboardSummary {
  projects: { total: number; inProgress: number; delayed: number; };
  quotes: { total: number; pending: number; approved: number; };
  serviceOrders: { total: number; pending: number; overdue: number; };
  droneServices: { total: number; pending: number; };
  financial: { receivablesPending: number; payablesPending: number; receivablesOverdue: number; payablesOverdue: number; };
}

export async function fetchDashboardSummary(role: string, userId: string): Promise<DashboardSummary> {
  const today = new Date().toISOString().split('T')[0];
  const isEngenharia = role === 'ENGENHEIRO' || role === 'TECNICO';
  const isDrone = role === 'CONSULTOR_TEC_DRONE' || role === 'PILOTO';

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
