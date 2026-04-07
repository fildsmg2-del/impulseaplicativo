import { supabase } from "@/integrations/supabase/client";

export interface DashboardStats {
  totalSales: number;
  totalPowerKwp: number;
  activeProjects: number;
  pendingQuotes: number;
  estimatedGeneration: number;
  conversionRate: number;
  salesTrend: number;
  powerTrend: number;
}

export interface MonthlySalesData {
  month: string;
  sales: number;
  power: number;
}

export interface AlertData {
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // Get approved quotes for sales calculation
  const { data: approvedQuotes, error: quotesError } = await supabase
    .from('quotes')
    .select('total, recommended_power_kwp, estimated_generation_kwh')
    .eq('status', 'APPROVED');

  if (quotesError) {
    console.error('Error fetching approved quotes:', quotesError);
    throw quotesError;
  }

  // Get active projects count (not completed)
  const { count: activeProjectsCount, error: projectsError } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'POS_VENDA');

  if (projectsError) {
    console.error('Error fetching projects count:', projectsError);
    throw projectsError;
  }

  // Get pending quotes count
  const { count: pendingQuotesCount, error: pendingError } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .in('status', ['DRAFT', 'SENT']);

  if (pendingError) {
    console.error('Error fetching pending quotes:', pendingError);
    throw pendingError;
  }

  // Get total quotes count for conversion rate
  const { count: totalQuotesCount, error: totalQuotesError } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true });

  if (totalQuotesError) {
    console.error('Error fetching total quotes:', totalQuotesError);
    throw totalQuotesError;
  }

  // Calculate totals
  const totalSales = approvedQuotes?.reduce((sum, q) => sum + (q.total || 0), 0) || 0;
  const totalPowerKwp = approvedQuotes?.reduce((sum, q) => sum + (q.recommended_power_kwp || 0), 0) || 0;
  const estimatedGeneration = approvedQuotes?.reduce((sum, q) => sum + (q.estimated_generation_kwh || 0), 0) || 0;
  
  const approvedCount = approvedQuotes?.length || 0;
  const conversionRate = totalQuotesCount ? (approvedCount / totalQuotesCount) * 100 : 0;

  return {
    totalSales,
    totalPowerKwp,
    activeProjects: activeProjectsCount || 0,
    pendingQuotes: pendingQuotesCount || 0,
    estimatedGeneration: estimatedGeneration / 1000, // Convert to MWh
    conversionRate: Math.round(conversionRate),
    salesTrend: 12.5, // TODO: Calculate from historical data
    powerTrend: 8.3,
  };
}

export async function getMonthlySalesData(): Promise<MonthlySalesData[]> {
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('total, recommended_power_kwp, created_at')
    .eq('status', 'APPROVED')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching quotes for chart:', error);
    throw error;
  }

  // Group by month
  const monthlyData: { [key: string]: { sales: number; power: number } } = {};
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  // Initialize all months
  months.forEach(month => {
    monthlyData[month] = { sales: 0, power: 0 };
  });

  quotes?.forEach(quote => {
    const date = new Date(quote.created_at);
    const monthName = months[date.getMonth()];
    monthlyData[monthName].sales += quote.total || 0;
    monthlyData[monthName].power += quote.recommended_power_kwp || 0;
  });

  return months.map(month => ({
    month,
    sales: monthlyData[month].sales,
    power: monthlyData[month].power
  }));
}

export async function getAlerts(): Promise<AlertData[]> {
  const alerts: AlertData[] = [];

  // Check for delayed projects
  const { data: delayedProjects, error: delayedError } = await supabase
    .from('projects')
    .select('id, status, estimated_end_date, clients(name)')
    .neq('status', 'POS_VENDA')
    .lt('estimated_end_date', new Date().toISOString().split('T')[0]);

  if (!delayedError && delayedProjects?.length) {
    delayedProjects.forEach(project => {
      const clientName = (project.clients as any)?.name || 'Cliente';
      alerts.push({
        type: 'error',
        title: 'Projeto Atrasado',
        message: `${clientName} - ${project.status} pendente`
      });
    });
  }

  // Check for quotes expiring soon (older than 15 days in SENT status)
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  
  const { data: expiringQuotes, error: expiringError } = await supabase
    .from('quotes')
    .select('id')
    .eq('status', 'SENT')
    .lt('created_at', fifteenDaysAgo.toISOString());

  if (!expiringError && expiringQuotes?.length) {
    alerts.push({
      type: 'warning',
      title: 'Orçamentos Expirando',
      message: `${expiringQuotes.length} orçamento(s) vencem em breve`
    });
  }

  return alerts;
}

export interface RecentProject {
  id: string;
  clientName: string;
  power: number;
  status: string;
  progress: number;
}

export async function getRecentProjects(): Promise<RecentProject[]> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, status, power_kwp, checklist, clients(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching recent projects:', error);
    throw error;
  }

  return projects?.map(project => {
    const checklist = project.checklist as Record<string, any> || {};
    let totalItems = 0;
    let completedItems = 0;

    Object.values(checklist).forEach((stage: any) => {
      if (stage?.items && Array.isArray(stage.items)) {
        totalItems += stage.items.length;
        completedItems += stage.items.filter((item: any) => item.checked).length;
      }
    });

    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      id: project.id,
      clientName: (project.clients as any)?.name || 'Cliente',
      power: project.power_kwp || 0,
      status: project.status,
      progress
    };
  }) || [];
}
