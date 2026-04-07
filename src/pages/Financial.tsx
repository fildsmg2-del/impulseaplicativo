import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { transactionService, FinancialSummary } from '@/services/transactionService';
import { CashFlowChart } from '@/components/financial/CashFlowChart';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';

export default function Financial() {
  const navigate = useNavigate();
  
  // Realtime updates
  useRealtimeInvalidation('transactions', [['transactions-summary']]);

  const { data: summary, isLoading } = useQuery<FinancialSummary>({
    queryKey: ['transactions-summary'],
    queryFn: () => transactionService.getSummary(),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center h-[50vh]">
          <p className="text-muted-foreground animate-pulse">Carregando indicadores...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Financeiro</h1>
            <p className="text-muted-foreground">Visão geral de saúde financeira e fluxo de caixa</p>
          </div>
          <div className="flex gap-3">
            <Button 
                variant="outline" 
                onClick={() => navigate('/financial/receivables')}
                className="hover:border-success hover:text-success"
            >
                Contas a Receber
            </Button>
            <Button 
                variant="outline" 
                onClick={() => navigate('/financial/payables')}
                className="hover:border-destructive hover:text-destructive"
            >
                Contas a Pagar
            </Button>
          </div>
        </div>

        {/* Indicator Cards - Premium Style */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 shadow-sm">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <TrendingUp className="h-12 w-12 text-emerald-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
                Receitas Liquidadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-emerald-600">{formatCurrency(summary?.totalReceitas || 0)}</p>
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total recebido no período</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-rose-500/10 to-rose-500/5 shadow-sm">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <TrendingDown className="h-12 w-12 text-rose-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-rose-600 flex items-center gap-2">
                Despesas Liquidadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-rose-600">{formatCurrency(summary?.totalDespesas || 0)}</p>
                <ArrowDownRight className="h-4 w-4 text-rose-500" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total pago no período</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500/10 to-amber-500/5 shadow-sm">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <AlertCircle className="h-12 w-12 text-amber-500" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
                Aguardando (Bruto)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <span className="text-success text-sm font-medium">+{formatCurrency(summary?.receitasPendentes || 0)}</span>
                <span className="text-destructive text-sm font-medium">-{formatCurrency(summary?.despesasPendentes || 0)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Lançamentos em aberto</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-none bg-impulse-gold/10 shadow-sm border-impulse-gold/20 border">
            <div className="absolute top-0 right-0 p-3 opacity-10">
                <DollarSign className="h-12 w-12 text-impulse-gold" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-impulse-gold flex items-center gap-2">
                Saldo de Caixa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${(summary?.saldo || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(summary?.saldo || 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Disponibilidade imediata</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 shadow-sm border-none bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                   <BarChart3 className="h-5 w-5 text-impulse-gold" />
                   Fluxo de Caixa Mensal
                </CardTitle>
                <p className="text-sm text-muted-foreground">Comparativo de entradas e saídas</p>
              </div>
            </CardHeader>
            <CardContent className="h-[350px]">
              <CashFlowChart />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-none bg-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Resumo de Status</CardTitle>
              <p className="text-sm text-muted-foreground">Saúde dos compromissos</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Receitas Confirmadas</span>
                        <span className="font-medium text-emerald-600">85%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Despesas em Dia</span>
                        <span className="font-medium text-amber-600">92%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full w-[92%]" />
                    </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl border border-muted">
                    <p className="text-xs text-muted-foreground text-center italic">
                        "O seu saldo projetado para o próximo mês é positivo baseado nos orçamentos aprovados."
                    </p>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
