import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Clock, DollarSign, Package, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'project' | 'payment' | 'stock' | 'quote';
  title: string;
  message: string;
  link?: string;
  count?: number;
}

async function fetchAlerts(): Promise<Alert[]> {
  const alertsList: Alert[] = [];
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

  const [
    { data: delayedProjects },
    { data: overdueTransactions },
    { data: upcomingPayments },
    { data: lowStockProducts },
    { data: expiringQuotes },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('id')
      .not('status', 'eq', 'POS_VENDA')
      .not('estimated_end_date', 'is', null)
      .lt('estimated_end_date', today),
    supabase
      .from('transactions')
      .select('id, amount')
      .eq('status', 'PENDENTE')
      .lt('due_date', today),
    supabase
      .from('transactions')
      .select('id, amount')
      .eq('status', 'PENDENTE')
      .gte('due_date', today)
      .lte('due_date', nextWeek.toISOString().split('T')[0]),
    supabase
      .from('products')
      .select('id, quantity, min_quantity')
      .eq('active', true),
    supabase
      .from('quotes')
      .select('id')
      .eq('status', 'SENT')
      .lt('created_at', fifteenDaysAgo.toISOString()),
  ]);

  if (delayedProjects && delayedProjects.length > 0) {
    alertsList.push({
      id: 'delayed-projects',
      type: 'error',
      category: 'project',
      title: 'Projetos Atrasados',
      message: `${delayedProjects.length} projeto(s) ultrapassaram a data prevista de conclusão`,
      link: '/projects',
      count: delayedProjects.length,
    });
  }

  if (overdueTransactions && overdueTransactions.length > 0) {
    const totalOverdue = overdueTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
    alertsList.push({
      id: 'overdue-payments',
      type: 'error',
      category: 'payment',
      title: 'Pagamentos Atrasados',
      message: `${overdueTransactions.length} transação(ões) vencida(s) totalizando R$ ${totalOverdue.toLocaleString('pt-BR')}`,
      link: '/financial',
      count: overdueTransactions.length,
    });
  }

  if (upcomingPayments && upcomingPayments.length > 0) {
    alertsList.push({
      id: 'upcoming-payments',
      type: 'warning',
      category: 'payment',
      title: 'Vencimentos Próximos',
      message: `${upcomingPayments.length} pagamento(s) vencem nos próximos 7 dias`,
      link: '/financial',
      count: upcomingPayments.length,
    });
  }

  const lowStock = lowStockProducts?.filter(p => p.quantity <= (p.min_quantity || 0)) || [];
  if (lowStock.length > 0) {
    alertsList.push({
      id: 'low-stock',
      type: 'warning',
      category: 'stock',
      title: 'Estoque Baixo',
      message: `${lowStock.length} produto(s) abaixo do estoque mínimo`,
      link: '/inventory',
      count: lowStock.length,
    });
  }

  if (expiringQuotes && expiringQuotes.length > 0) {
    alertsList.push({
      id: 'expiring-quotes',
      type: 'info',
      category: 'quote',
      title: 'Orçamentos Pendentes',
      message: `${expiringQuotes.length} orçamento(s) enviado(s) há mais de 15 dias sem resposta`,
      link: '/quotes',
      count: expiringQuotes.length,
    });
  }

  return alertsList;
}

const getAlertIcon = (category: Alert['category']) => {
  switch (category) {
    case 'project': return Clock;
    case 'payment': return DollarSign;
    case 'stock': return Package;
    case 'quote': return AlertCircle;
    default: return Bell;
  }
};

const getAlertStyles = (type: Alert['type']) => {
  switch (type) {
    case 'error':
      return { bg: 'bg-destructive/5 hover:bg-destructive/10', border: 'border-destructive/20', icon: 'text-destructive', dot: 'bg-destructive' };
    case 'warning':
      return { bg: 'bg-warning/5 hover:bg-warning/10', border: 'border-warning/20', icon: 'text-warning', dot: 'bg-warning' };
    default:
      return { bg: 'bg-impulse-gold/5 hover:bg-impulse-gold/10', border: 'border-impulse-gold/20', icon: 'text-impulse-gold', dot: 'bg-impulse-gold' };
  }
};

export function SmartAlerts() {
  const { data: alerts = [], isLoading: loading } = useQuery({
    queryKey: ['smart-alerts'],
    queryFn: fetchAlerts,
    staleTime: 5 * 60 * 1000,
  });

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in">
        <h3 className="text-lg font-semibold text-foreground mb-4">Alertas Inteligentes</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-impulse animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-destructive/10">
          <Bell className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Alertas Inteligentes</h3>
          <p className="text-xs text-muted-foreground">
            {alerts.length > 0 ? `${alerts.length} alerta(s) ativo(s)` : 'Nenhum alerta'}
          </p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Bell className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">Tudo em ordem!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const Icon = getAlertIcon(alert.category);
            const styles = getAlertStyles(alert.type);

            const content = (
              <div
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                  styles.bg,
                  styles.border
                )}
              >
                <div className={cn('mt-0.5', styles.icon)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    {alert.count && (
                      <span className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white',
                        styles.dot
                      )}>
                        {alert.count}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5" />
              </div>
            );

            return alert.link ? (
              <Link key={alert.id} to={alert.link}>
                {content}
              </Link>
            ) : (
              <div key={alert.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
