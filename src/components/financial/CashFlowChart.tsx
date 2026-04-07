import { useState, useEffect, useMemo, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashFlowData {
  month: string;
  receitas: number;
  despesas: number;
  saldo: number;
  acumulado: number;
}

export function CashFlowChart() {
  const [data, setData] = useState<CashFlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'3' | '6' | '12'>('6');

  const loadCashFlow = useCallback(async () => {
    try {
      const months = parseInt(period);
      const startDate = startOfMonth(new Date());
      const endDate = endOfMonth(addMonths(new Date(), months - 1));

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('type, status, amount, due_date')
        .gte('due_date', startDate.toISOString().split('T')[0])
        .lte('due_date', endDate.toISOString().split('T')[0]);

      if (error) throw error;

      // Generate months
      const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });
      
      let accumulated = 0;
      const cashFlowData: CashFlowData[] = monthsInterval.map((monthDate) => {
        const monthKey = format(monthDate, 'yyyy-MM');
        const monthLabel = format(monthDate, 'MMM/yy', { locale: ptBR });

        const monthTransactions = transactions?.filter((t) => {
          return t.due_date.startsWith(monthKey);
        }) || [];

        const receitas = monthTransactions
          .filter((t) => t.type === 'RECEITA')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const despesas = monthTransactions
          .filter((t) => t.type === 'DESPESA')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const saldo = receitas - despesas;
        accumulated += saldo;

        return {
          month: monthLabel,
          receitas,
          despesas,
          saldo,
          acumulado: accumulated,
        };
      });

      setData(cashFlowData);
    } catch (error) {
      console.error('Error loading cash flow:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadCashFlow();
  }, [loadCashFlow]);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, item) => ({
        receitas: acc.receitas + item.receitas,
        despesas: acc.despesas + item.despesas,
        saldo: acc.saldo + item.saldo,
      }),
      { receitas: 0, despesas: 0, saldo: 0 }
    );
  }, [data]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium text-foreground mb-2">{label}</p>
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-muted-foreground">{item.name}:</span>
            <span className="font-medium">
              {formatCurrency(item.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-impulse-gold/10">
            <Calendar className="h-5 w-5 text-impulse-gold" />
          </div>
          <div>
            <CardTitle className="text-lg">Fluxo de Caixa Projetado</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Previsão de entradas e saídas
            </p>
          </div>
        </div>
        <Select value={period} onValueChange={(v: '3' | '6' | '12') => setPeriod(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">Receitas Previstas</span>
            </div>
            <p className="text-lg font-bold text-success">{formatCurrency(totals.receitas)}</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Despesas Previstas</span>
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(totals.despesas)}</p>
          </div>
          <div className="p-3 rounded-lg bg-impulse-gold/10 border border-impulse-gold/20">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="h-4 w-4 text-impulse-gold" />
              <span className="text-xs text-muted-foreground">Saldo Projetado</span>
            </div>
            <p className={`text-lg font-bold ${totals.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(totals.saldo)}
            </p>
          </div>
        </div>

        {/* Chart */}
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--impulse-gold))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--impulse-gold))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  name="Receitas"
                  stroke="hsl(var(--success))"
                  fill="url(#colorReceitas)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas"
                  stroke="hsl(var(--destructive))"
                  fill="url(#colorDespesas)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="acumulado"
                  name="Saldo Acumulado"
                  stroke="hsl(var(--impulse-gold))"
                  fill="url(#colorAcumulado)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
